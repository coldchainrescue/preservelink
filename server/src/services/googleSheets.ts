/**
 * Google Sheets integration for PreserveLink.
 *
 * READS: Pulls catalogue data from the user's master Google Sheet via the
 *   public CSV-export endpoint (`gviz/tq?tqx=out:csv&sheet=...`). This works
 *   WITHOUT any service account or API key — the only requirement is that
 *   the sheet must be shared as "Anyone with the link can view".
 *
 * WRITES: When an admin approves a contribution we append a row to a
 *   dedicated "Approved_Contributions" tab. This requires real Google
 *   credentials (a service account with edit access to the sheet). When
 *   credentials are not configured we fall back to a local JSON queue file
 *   so the data is never lost — the queue can be flushed to Sheets later.
 *
 * Column mapping for the "Catalogue" tab in the user's sheet:
 *   A reg_no
 *   B product            <- brand / product name (autocomplete)
 *   C status
 *   D description        <- prescription / non-prescription / biologics ...
 *                          (used as the Category dropdown)
 *   E holder
 *   F manufacturer
 *   G importer
 *   H active_ingredient  <- autocomplete
 *   I generic_name       <- autocomplete
 */

import fs from 'fs';
import { google } from 'googleapis';
import { env } from '../config/env.js';
import { dataPath } from '../paths.js';

// Local fallback file for approved contributions when no service account is
// configured. New rows are appended here so they can be synced to the sheet
// later (e.g. by an admin running a sync command, or once credentials are set).
const APPROVED_QUEUE_FILE = dataPath('approved-contributions-queue.json');
// Local cache of the catalogue (in case Google Sheets is briefly unreachable).
const CATALOGUE_CACHE_FILE = dataPath('catalogue-cache.json');

export interface CatalogueRow {
  regNo: string;        // Column A
  product: string;      // Column B (brand)
  status: string;       // Column C
  description: string;  // Column D (used as Category)
  holder: string;       // Column E
  manufacturer: string; // Column F
  importer: string;     // Column G
  activeIngredient: string; // Column H
  genericName: string;  // Column I
}

// In-memory cache so we don't hit Google on every request.
let cache: { rows: CatalogueRow[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

/** Minimal CSV parser that handles quoted fields with embedded commas / quotes. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Build the public CSV-export URL for a given tab name. */
function publicCsvUrl(sheetId: string, tabName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

/** Persist a backup of the latest fetched catalogue so we can serve from
 *  cache when the network is down. */
function saveCatalogueCache(rows: CatalogueRow[]) {
  try {
    fs.writeFileSync(CATALOGUE_CACHE_FILE, JSON.stringify(rows, null, 2));
  } catch (e) {
    console.warn('[Sheets] Could not save catalogue cache:', (e as Error).message);
  }
}

function loadCatalogueCache(): CatalogueRow[] | null {
  try {
    if (!fs.existsSync(CATALOGUE_CACHE_FILE)) return null;
    const raw = fs.readFileSync(CATALOGUE_CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Fetch and parse the Catalogue tab. Uses in-memory cache + on-disk backup. */
async function fetchCatalogueFromSheet(): Promise<CatalogueRow[]> {
  const sheetId = env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.warn('[Sheets] GOOGLE_SHEET_ID is not set; returning empty catalogue.');
    return [];
  }

  const url = publicCsvUrl(sheetId, 'Catalogue');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet (HTTP ${response.status}). Make sure the sheet is shared as "Anyone with the link can view".`);
  }
  const csvText = await response.text();
  const rows = parseCSV(csvText);

  // Skip the header row, drop fully-empty rows, and map by column index.
  const result: CatalogueRow[] = rows
    .slice(1)
    .filter((r) => r.some((cell) => cell && cell.trim() !== ''))
    .map((r) => ({
      regNo: (r[0] || '').trim(),
      product: (r[1] || '').trim(),
      status: (r[2] || '').trim(),
      description: (r[3] || '').trim(),
      holder: (r[4] || '').trim(),
      manufacturer: (r[5] || '').trim(),
      importer: (r[6] || '').trim(),
      activeIngredient: (r[7] || '').trim(),
      genericName: (r[8] || '').trim(),
    }));

  return result;
}

export const googleSheets = {
  /** Returns all catalogue rows, with caching. Falls back to disk cache, then
   *  empty array, on network failure. */
  async getCatalogue(forceRefresh = false): Promise<CatalogueRow[]> {
    const now = Date.now();
    if (!forceRefresh && cache && cache.expiresAt > now) {
      return cache.rows;
    }
    try {
      const rows = await fetchCatalogueFromSheet();
      cache = { rows, expiresAt: now + CACHE_TTL_MS };
      saveCatalogueCache(rows);
      return rows;
    } catch (err) {
      console.error('[Sheets] Live fetch failed:', (err as Error).message);
      // Fall back to whatever we last successfully cached on disk.
      const disk = loadCatalogueCache();
      if (disk) {
        console.warn('[Sheets] Serving from disk cache.');
        return disk;
      }
      return [];
    }
  },

  /** Force-refresh the catalogue cache. */
  async refreshCatalogue(): Promise<CatalogueRow[]> {
    return this.getCatalogue(true);
  },

  /** Append an approved contribution to the sheet (or local queue if no creds). */
  async appendApprovedContribution(row: {
    genericName: string;
    brandName: string;
    strength: string;
    manufacturer: string;
    category: string;
    mktAvailable: boolean;
    mktDetails?: string;
    stabilityStatement: string;
    contributorName: string;
    contributorEmail: string;
    approvedAt: string;
    approvedBy: string;
  }): Promise<{ written: 'sheet' | 'queue'; message: string }> {
    const sheetId = env.GOOGLE_SHEET_ID;
    const hasCredentials = Boolean(env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY);

    const rowValues = [
      row.genericName,
      row.brandName,
      row.strength,
      row.manufacturer,
      row.category,
      row.mktAvailable ? 'Yes' : 'No',
      row.mktDetails || '',
      row.stabilityStatement,
      row.contributorName,
      row.contributorEmail,
      row.approvedAt,
      row.approvedBy,
    ];

    if (!sheetId || !hasCredentials) {
      // Demo / no-credentials fallback: queue locally so nothing is lost.
      try {
        const queue = fs.existsSync(APPROVED_QUEUE_FILE)
          ? JSON.parse(fs.readFileSync(APPROVED_QUEUE_FILE, 'utf-8'))
          : [];
        queue.push({ ...row, queuedAt: new Date().toISOString() });
        fs.writeFileSync(APPROVED_QUEUE_FILE, JSON.stringify(queue, null, 2));
      } catch (e) {
        console.error('[Sheets] Failed to queue approved contribution:', e);
      }
      return {
        written: 'queue',
        message: 'No Google service-account credentials configured. Approved contribution saved to local queue (server/src/data/approved-contributions-queue.json) and will be synced to the sheet once credentials are configured.',
      };
    }

    // Real append via the Sheets API.
    try {
      const auth = new google.auth.JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Approved_Contributions!A:L',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [rowValues] },
      });
      return {
        written: 'sheet',
        message: 'Approved contribution appended to the Approved_Contributions tab.',
      };
    } catch (err) {
      console.error('[Sheets] Append failed:', err);
      // Don't throw — fall back to the queue so the data is preserved.
      try {
        const queue = fs.existsSync(APPROVED_QUEUE_FILE)
          ? JSON.parse(fs.readFileSync(APPROVED_QUEUE_FILE, 'utf-8'))
          : [];
        queue.push({ ...row, queuedAt: new Date().toISOString(), error: (err as Error).message });
        fs.writeFileSync(APPROVED_QUEUE_FILE, JSON.stringify(queue, null, 2));
      } catch {}
      return {
        written: 'queue',
        message: `Sheet append failed (${(err as Error).message}). Saved to local queue.`,
      };
    }
  },
};
