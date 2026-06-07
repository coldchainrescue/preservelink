/**
 * Search service — pulls 100% of its data from the user's Google Sheet
 * (Catalogue tab) via the googleSheets service. NO external/AI/web data.
 *
 * Column mapping is defined in googleSheets.ts. Autocomplete suggestions
 * pull from columns B (product), H (active_ingredient), and I (generic_name)
 * as required.
 *
 * In addition to the master Catalogue, this service also reads the
 * locally-stored approved contributions queue (or, when configured, the
 * Approved_Contributions tab on the sheet) so contributions made in-app are
 * searchable immediately after admin approval.
 */

import Fuse from 'fuse.js';
import fs from 'fs';
import { dataPath } from '../paths.js';
import { googleSheets, CatalogueRow } from './googleSheets.js';

const APPROVED_QUEUE_FILE = dataPath('approved-contributions-queue.json');

interface ApprovedContribution {
  genericName: string;
  brandName: string;
  strength: string;
  manufacturer: string;
  category: string;
  mktAvailable: boolean;
  mktDetails?: string;
  stabilityStatement: string;
  stabilityStatements?: any[]; // structured per-statement data when available
  contributorName: string;
  contributorEmail?: string;
  approvedAt: string;
}

/** Read locally-queued approved contributions (these are also written to the
 *  sheet when credentials are configured, so this is a safety net for demo). */
function getApprovedContributions(): ApprovedContribution[] {
  try {
    if (!fs.existsSync(APPROVED_QUEUE_FILE)) return [];
    const data = fs.readFileSync(APPROVED_QUEUE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/** Build the unified search index combining catalogue rows + approved
 *  contributions. Catalogue rows have no stability data; contributions add it. */
async function buildSearchableMedicines() {
  const catalogue = await googleSheets.getCatalogue();
  const contributions = getApprovedContributions();

  const fromCatalogue = catalogue.map((row: CatalogueRow) => ({
    source: 'catalogue' as const,
    regNo: row.regNo,
    product: row.product,                 // Column B
    brandName: row.product,               // alias for UI
    activeIngredient: row.activeIngredient, // Column H
    genericName: row.genericName,         // Column I
    manufacturer: row.manufacturer,
    holder: row.holder,
    importer: row.importer,
    description: row.description,         // Column D (used as category)
    category: row.description,
    status: row.status,
    // Catalogue does not yet contain stability data.
    stabilityStatements: [] as any[],
    contributorName: '',
  }));

  const fromContributions = contributions.map((c) => ({
    source: 'contribution' as const,
    regNo: '',
    product: c.brandName,
    brandName: c.brandName,
    activeIngredient: c.genericName,
    genericName: c.genericName,
    manufacturer: c.manufacturer,
    holder: '',
    importer: '',
    description: c.category,
    category: c.category,
    status: 'APPROVED CONTRIBUTION',
    stabilityStatements: c.stabilityStatements || (c.stabilityStatement ? [{
      manufacturer: c.manufacturer,
      drugName: c.genericName,
      raw: c.stabilityStatement,
    }] : []),
    contributorName: c.contributorName,
  }));

  return [...fromCatalogue, ...fromContributions];
}

export const searchService = {
  /** Unique categories — pulled from Column D (description) of the Catalogue,
   *  combined with any new categories from approved contributions. */
  async getCategories(): Promise<string[]> {
    const medicines = await buildSearchableMedicines();
    const categories = new Set<string>();
    for (const m of medicines) {
      const v = (m.category || '').trim();
      if (v) categories.add(v);
    }
    return [...categories].sort();
  },

  /** Autocomplete suggestions — pulls from Columns B (product), H
   *  (active_ingredient), and I (generic_name). Returns deduplicated, ranked
   *  matches against the user's typed query. */
  async autocomplete(query: string, limit = 10): Promise<string[]> {
    const q = (query || '').trim();
    if (q.length < 1) return [];

    const medicines = await buildSearchableMedicines();
    // Build candidate list of unique strings from B, H, I.
    const candidates = new Set<string>();
    for (const m of medicines) {
      if (m.product) candidates.add(m.product);
      if (m.activeIngredient) candidates.add(m.activeIngredient);
      if (m.genericName) candidates.add(m.genericName);
    }
    const candidateArr = [...candidates].map((value) => ({ value }));
    const fuse = new Fuse(candidateArr, {
      keys: ['value'],
      threshold: 0.4,
      ignoreLocation: true,
    });
    const results = fuse.search(q, { limit });
    return results.map((r) => r.item.value);
  },

  /** Run a stability search for a specific medicine + temperature + duration.
   *  Looks up the medicine in the Catalogue + approved contributions; matches
   *  on Columns B / H / I (product, active_ingredient, generic_name). */
  async search(params: {
    medicineName: string;
    category?: string;
    temperature: number;
    duration: number;
    durationUnit: 'hours' | 'minutes';
  }) {
    let medicines = await buildSearchableMedicines();

    // Filter by category (description) if specified.
    if (params.category) {
      medicines = medicines.filter(
        (m) => (m.category || '').toLowerCase() === params.category!.toLowerCase()
      );
    }

    if (medicines.length === 0) return null;

    // Fuzzy search across product (B), active_ingredient (H), generic_name (I).
    const fuse = new Fuse(medicines, {
      keys: [
        { name: 'product', weight: 1.0 },
        { name: 'activeIngredient', weight: 0.9 },
        { name: 'genericName', weight: 0.9 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
    const matches = fuse.search(params.medicineName);
    if (matches.length === 0) return null;

    const medicine = matches[0].item as any;
    const durationHours =
      params.durationUnit === 'minutes' ? params.duration / 60 : params.duration;

    // The Catalogue itself does not yet contain stability data. We build the
    // verdict from any approved contributions associated with this medicine.
    const stabilityEntries: any[] = medicine.stabilityStatements || [];

    if (stabilityEntries.length === 0) {
      // No stability data has been contributed for this medicine yet.
      return {
        medicine,
        matchedStability: null,
        verdict: 'unknown' as const,
        verdictColor: 'yellow' as const,
        verdictMessage: `No stability data has been contributed yet for ${medicine.product || medicine.genericName}. The medicine record is in the catalogue but no temperature-excursion guidance is available. Please consult the manufacturer or use clinical judgement, and consider contributing data once you have it.`,
      };
    }

    // Pick the contributed statement whose temperature window matches.
    let bestMatch: any = null;
    for (const stmt of stabilityEntries) {
      const tempVal = parseFloat(stmt.temperature);
      const stmtDurationHours = stmt.durationUnit === 'minutes'
        ? parseFloat(stmt.duration) / 60
        : parseFloat(stmt.duration);
      // ±2 °C tolerance on the contributed temperature target.
      if (
        Math.abs(tempVal - params.temperature) <= 2 &&
        durationHours <= stmtDurationHours
      ) {
        bestMatch = stmt;
        break;
      }
    }

    let verdict: 'safe' | 'short_shelf_life' | 'discard' | 'unknown';
    let verdictColor: 'green' | 'yellow' | 'red';
    let verdictMessage: string;

    if (bestMatch) {
      verdict = 'safe';
      verdictColor = 'green';
      verdictMessage = `SAFE TO USE. Contributor data: according to ${bestMatch.manufacturer}, if ${bestMatch.drugName} is stored at ${bestMatch.temperature}°C for ${bestMatch.duration} ${bestMatch.durationUnit}, the stability is ${bestMatch.stabilityPeriod} ${bestMatch.stabilityUnit}. Your exposure (${params.temperature}°C for ${params.duration} ${params.durationUnit}) is within the contributed range.`;
    } else {
      verdict = 'discard';
      verdictColor = 'red';
      verdictMessage = `DISCARD / CONSULT MANUFACTURER. The contributed stability data for ${medicine.product || medicine.genericName} does not cover the exposure conditions you specified (${params.temperature}°C for ${params.duration} ${params.durationUnit}). Without data covering this excursion, do not use the product.`;
    }

    return {
      medicine,
      matchedStability: bestMatch,
      verdict,
      verdictColor,
      verdictMessage,
    };
  },

  /** Lookup by registration number / unique identifier. */
  async getMedicineByRegNo(regNo: string) {
    const medicines = await buildSearchableMedicines();
    return medicines.find((m) => m.regNo === regNo);
  },

  /** Approved contributions are recorded into the local queue AND (when
   *  credentials are configured) appended to the Google Sheet. */
  async addApprovedContribution(c: ApprovedContribution & { contributorEmail: string; approvedBy: string }) {
    return googleSheets.appendApprovedContribution({
      genericName: c.genericName,
      brandName: c.brandName,
      strength: c.strength,
      manufacturer: c.manufacturer,
      category: c.category,
      mktAvailable: c.mktAvailable,
      mktDetails: c.mktDetails,
      stabilityStatement: c.stabilityStatement,
      contributorName: c.contributorName,
      contributorEmail: c.contributorEmail,
      approvedAt: c.approvedAt,
      approvedBy: c.approvedBy,
    });
  },

  /** Legacy alias kept for backwards compatibility with existing admin route. */
  addToCatalogue(_medicine: any) {
    // No-op: in this architecture, approved contributions go to a separate
    // tab via addApprovedContribution() so they're cleanly separated from the
    // master catalogue data.
  },
};
