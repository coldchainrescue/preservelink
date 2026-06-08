import { env } from '../config/env.js';

export interface OcrResult {
  verified: boolean;
  keywordFound: boolean;
  nameMatch: boolean;
  rphMatch: boolean;
  message: string;
  extractedText?: string;
}

const APC_KEYWORDS = [
  'annual certificate',
  'annual certificate', // US spelling fallback
];

function containsApcKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return APC_KEYWORDS.some((kw) => lower.includes(kw));
}

function fuzzyNameMatch(text: string, name: string): boolean {
  const normalizedText = text.toLowerCase().replace(/[^a-z\s]/g, '');
  const normalizedName = name.toLowerCase().replace(/[^a-z\s]/g, '');
  const nameParts = normalizedName.split(/\s+/).filter((p) => p.length > 2);
  if (nameParts.length === 0) return false;
  const matchCount = nameParts.filter((part) => normalizedText.includes(part)).length;
  // Allow 70% match threshold for fuzzy matching (handles bin/binti variations)
  return matchCount / nameParts.length >= 0.7;
}

// Heuristic check on filename for demo mode: accept if filename hints at APC
function filenameLooksLikeApc(originalFilename?: string): boolean {
  if (!originalFilename) return false;
  const f = originalFilename.toLowerCase();
  return /apc|annual|practising|practicing|certificate|cert|pharmacist|rph/.test(f);
}

export const ocrService = {
  async verifyAPC(
    fileBuffer: Buffer,
    expectedName: string,
    expectedRPhNumber: string,
    originalFilename?: string,
  ): Promise<OcrResult> {
    // Demo mode: simulate OCR. We can't run real Cloud Vision without an API key,
    // so we use a filename heuristic and let the admin manually verify the actual
    // file from the admin panel. The admin panel always shows the original APC
    // upload regardless of the OCR result.
    if (env.DEMO_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const looksLikeApc = filenameLooksLikeApc(originalFilename);
      return {
        verified: looksLikeApc,
        keywordFound: looksLikeApc,
        nameMatch: true,
        rphMatch: true,
        message: looksLikeApc
          ? 'Demo OCR: file looks like an APC. Pending admin verification.'
          : 'Demo OCR: filename does not look like an APC. The admin will manually review the file.',
      };
    }

    // Production mode: Use Google Cloud Vision API
    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_CLOUD_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: fileBuffer.toString('base64') },
                features: [{ type: 'TEXT_DETECTION' }],
              },
            ],
          }),
        }
      );

      const data = await response.json() as any;
      const extractedText: string = data.responses?.[0]?.fullTextAnnotation?.text || '';

      const keywordFound = containsApcKeyword(extractedText);
      const rphMatch = extractedText
        .toLowerCase()
        .replace(/\s/g, '')
        .includes(expectedRPhNumber.toLowerCase().replace(/\s/g, ''));
      const nameMatch = fuzzyNameMatch(extractedText, expectedName);

      const verified = keywordFound && rphMatch && nameMatch;

      let message = '';
      if (!keywordFound) {
        message = 'The uploaded file does not appear to be a valid Annual Certificate. The phrase "Annual Certificate" was not found.';
      } else if (!nameMatch) {
        message = 'Verification failed: the name on the certificate does not match your registered name.';
      } else if (!rphMatch) {
        message = 'Verification failed: the RPh number on the certificate does not match your registered number.';
      } else {
        message = 'APC verification successful.';
      }

      return {
        verified,
        keywordFound,
        nameMatch,
        rphMatch,
        message,
        extractedText,
      };
    } catch (error) {
      console.error('[OCR Error]', error);
      return {
        verified: false,
        keywordFound: false,
        nameMatch: false,
        rphMatch: false,
        message: 'OCR service temporarily unavailable. The admin will manually review your APC.',
      };
    }
  },
};
