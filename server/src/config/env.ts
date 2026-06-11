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
  JWT_SECRET: process.env.JWT_SECRET || 'abc123xyz890',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'qwerty987uiop',
  TRUE_ADMIN_EMAIL: process.env.TRUE_ADMIN_EMAIL || 'hanisahjohaari@gmail.com',
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '1RrsxZsKniTPksKbbXdzUEEbE96wVvdZyaxcXVhQD03E',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'preservelink-bot@gen-lang-client-0591489396.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7i/+WT8KFekXl\njAdWovEAdF/DKBk61ky+fUe10YJrcxM1dA+/ahFyUrqzGxPZXIWbSUw2qKpKGTfe\nb2Pvja1ivr+ToT6JyYv1a8xhR8daZvxldzy2O8fE1wu4xa6EJ27LvELQIiFE6/2Z\nQsXw4X8cDU/s+P3U0Y0BNGiRwwieTHoriNIkE1TrzPtVDIHT5P4XeAlo6ryoBs7u\nbhrJip4XgGcoaG0P0FBO9XC0VvlJeLWwSOlihZ9LH2xMBn3IkH4sgUYGztgCUes4\nbkJ0e9Zz+3GbZiAwUUmorfe7ikw0bnD+0fIXNIZ7EbibnBgT1k9KwctaHZlLtM8A\nP3L0yXa5AgMBAAECggEAAOgUYOjV38DiLjHVthRfo3EMkUl5YBSPBn4y9Co/uJl+\ngqatmKR7J7EbmYKfCfulooUm5Ejp2XsYTyp9F7hjecutKnoQGXN9v36pMaCv/OFs\nelM/2hZ9ThfR2josEGk44sJQP92PCTG2ANFG7+sadaYg/bwhN6UY1YRIIPPp2nWx\nzzyJgA2roPfmFnpq94irg9HxAek5rrQItMY4lLr7JgyfwbWokC7wx/GY0Mwq3DQ3\nTAETFP4YP+tCCiG9XmZJBnwiP/VWzR01T4Qq1kbGtveQRwMFvMBIXh1NujGkwUuE\ndBHHB6bsSp0XLdkI7oTu+ztmDMeucXbsBoJrXi1nQQKBgQDfvY60K+yJ9rX/VM6Q\n7fTJPtbckrsZdq1byfbBbBFQYpDN+mb5Fm8V4SMuytA02+2qHg3rnbe8E2lXM+G/\nzXuvW1OLYXYEOPLVYonIeU1+qenxceod1La5lyVIAPpN1Uf86hwRJnIQZyudGPQ/\nk0Vet6fL2xwcYUl6lHcHIKjv+QKBgQDWloGNYW/yedT6SDnPZqcRQ5qL8QkktxVw\nvQVJtrgQGR9MaOW5MdfHVZNrg4Rq5lw1UEWhBLy4v11+eOx6Qczp8IhIU3RuAOu4\n5AS3k7hEIYXFVBrvyUD4MdqztDO1jrWFwVtTG7HFv0c2qlC/tddplrvlSlwM+gRO\nC5iSrIvswQKBgAcqeA6XNY05pJyX58HGjUeAxrrrzChFn8nHzypkvq03avHd6jxi\nFo651jmib0ayIIuJSOLZ+09/w6jyVXGiMCrunt9g8Lmz5TsmW8la8Tt0T7TW9Cue\na3fIOn5y4ZFqmlKkYN+/vnl+BGyUpwX+PoOJGEu0KdNS3lqZtLI6vo5pAoGAc/qi\niKRaGgapCqDQxfzoXRdZxzr+Qx7E8srmucGM1/6MAQNM7fw3cKAa7mgFwLVCrvn0\nuCNUUNH1GS8IOMepleMP9W9NpUrQHHz447NuSzyHDXD4ohL3D236k1fY/s7j4yfv\nUQrN2WAZgD0rKYKBq6rxYOsAt27FttzjmJqzgcECgYEAvwzjPGkKPm66iqNHggVF\nx/hTEZgXgighU9qqRD1O5XeTbvEKa9+ILr1O38oP1469Nup05+VgAPZYt4us22lp\nFFBdHhnAv12ZG1bGlp+u5Y05ja2OiqP+yVcIdWPNlNhEe4k4sXsR++KMRWB9BRmg\nAPDqGZSxG2XwfYjBb1UOQ/M=\n-----END PRIVATE KEY-----\n',
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '16CPYg2pDlW1eREVHXWBceX7_e1HVWiBH',
  GOOGLE_CLOUD_VISION_API_KEY: process.env.GOOGLE_CLOUD_VISION_API_KEY || 'AIzaSyDth68QS01wZG3P5kD-_nUQJcuc6FMkRdA',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || 'hanisahjohaari@gmail.com',
  SMTP_PASS: process.env.SMTP_PASS || 'hxxz nify bdcj tbtd',
};
