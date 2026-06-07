import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server root: server/
export const SERVER_ROOT = path.resolve(__dirname, '..');

// Data directory: server/src/data/
export const DATA_DIR = path.resolve(__dirname, 'data');

// Uploads directory: server/uploads/
export const UPLOADS_DIR = path.resolve(SERVER_ROOT, 'uploads');

// Project root: preservelink/
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

export function dataPath(filename: string): string {
  return path.resolve(DATA_DIR, filename);
}
