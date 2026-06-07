import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve paths relative to THIS file's location (stable regardless of cwd)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..'); // project root

const envPaths = [
  path.resolve(ROOT_DIR, '.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const p of envPaths) {
  dotenv.config({ path: p });
}

export const env = {
  DEMO_MODE: process.env.DEMO_MODE !== 'false',
  PORT: parseInt(process.env.PORT || '3001', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3001',
  JWT_SECRET: process.env.JWT_SECRET || 'preservelink-dev-secret-2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'preservelink-refresh-secret-2026',
  TRUE_ADMIN_EMAIL: process.env.TRUE_ADMIN_EMAIL || 'hanisahjohaari@gmail.com',
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '1RrsxZsKniTPksKbbXdzUEEbE96wVvdZyaxcXVhQD03E',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY || '',
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  GOOGLE_CLOUD_VISION_API_KEY: process.env.GOOGLE_CLOUD_VISION_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
};
