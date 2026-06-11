# PreserveLink

**Cold Chain Stability Tool for Malaysian Pharmacists**

A professional, mobile-responsive web application designed to prevent institutional budget loss at public hospitals by ensuring accurate, rapid data retrieval for temperature excursions.

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (LTS recommended)
- npm (comes with Node.js)

### Setup (One Command)

```bash
# 1. Install Node.js from https://nodejs.org/ (if not installed)

# 2. In the project folder, run:
npm install && npm run dev
```

That's it! The app will start:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

### Demo Login Credentials
- **Email:** hanisahjohaari@gmail.com
- **Password:** demo123
- **2FA Code (if prompted):** 000000

---

## Features

| Feature | Description |
|---------|-------------|
| OCR Verification | Automated APC certificate verification for pharmacist onboarding |
| Stability Search | Query temperature-sensitive medicine stability data |
| Contribution System | Submit new findings for admin review |
| User Dashboard | Track submissions, manage settings, notifications |
| Admin Panel | Review/approve submissions, manage users |
| CMS Editor | Visual page editor for True Admin (color scheme, layout, logo) |
| PDF Export | Download search results as PDF |
| 2FA Authentication | Email-based two-factor login |
| Hidden Analytics | Background usage and search tracking |

---

## Architecture

```
preservelink/
├── client/          # React + Vite + TypeScript + Tailwind
├── server/          # Express + TypeScript
├── shared/          # Shared TypeScript types
├── .env             # Environment config (auto-created from env.config.txt)
└── package.json     # Workspace root
```

## Environment Configuration

The app ships with `DEMO_MODE=true` — everything works without external APIs.

To switch to production, edit `.env`:
```env
DEMO_MODE=false
GOOGLE_SERVICE_ACCOUNT_EMAIL=preservelink-bot@gen-lang-client-0591489396.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7i/+WT8KFekXl\njAdWovEAdF/DKBk61ky+fUe10YJrcxM1dA+/ahFyUrqzGxPZXIWbSUw2qKpKGTfe\nb2Pvja1ivr+ToT6JyYv1a8xhR8daZvxldzy2O8fE1wu4xa6EJ27LvELQIiFE6/2Z\nQsXw4X8cDU/s+P3U0Y0BNGiRwwieTHoriNIkE1TrzPtVDIHT5P4XeAlo6ryoBs7u\nbhrJip4XgGcoaG0P0FBO9XC0VvlJeLWwSOlihZ9LH2xMBn3IkH4sgUYGztgCUes4\nbkJ0e9Zz+3GbZiAwUUmorfe7ikw0bnD+0fIXNIZ7EbibnBgT1k9KwctaHZlLtM8A\nP3L0yXa5AgMBAAECggEAAOgUYOjV38DiLjHVthRfo3EMkUl5YBSPBn4y9Co/uJl+\ngqatmKR7J7EbmYKfCfulooUm5Ejp2XsYTyp9F7hjecutKnoQGXN9v36pMaCv/OFs\nelM/2hZ9ThfR2josEGk44sJQP92PCTG2ANFG7+sadaYg/bwhN6UY1YRIIPPp2nWx\nzzyJgA2roPfmFnpq94irg9HxAek5rrQItMY4lLr7JgyfwbWokC7wx/GY0Mwq3DQ3\nTAETFP4YP+tCCiG9XmZJBnwiP/VWzR01T4Qq1kbGtveQRwMFvMBIXh1NujGkwUuE\ndBHHB6bsSp0XLdkI7oTu+ztmDMeucXbsBoJrXi1nQQKBgQDfvY60K+yJ9rX/VM6Q\n7fTJPtbckrsZdq1byfbBbBFQYpDN+mb5Fm8V4SMuytA02+2qHg3rnbe8E2lXM+G/\nzXuvW1OLYXYEOPLVYonIeU1+qenxceod1La5lyVIAPpN1Uf86hwRJnIQZyudGPQ/\nk0Vet6fL2xwcYUl6lHcHIKjv+QKBgQDWloGNYW/yedT6SDnPZqcRQ5qL8QkktxVw\nvQVJtrgQGR9MaOW5MdfHVZNrg4Rq5lw1UEWhBLy4v11+eOx6Qczp8IhIU3RuAOu4\n5AS3k7hEIYXFVBrvyUD4MdqztDO1jrWFwVtTG7HFv0c2qlC/tddplrvlSlwM+gRO\nC5iSrIvswQKBgAcqeA6XNY05pJyX58HGjUeAxrrrzChFn8nHzypkvq03avHd6jxi\nFo651jmib0ayIIuJSOLZ+09/w6jyVXGiMCrunt9g8Lmz5TsmW8la8Tt0T7TW9Cue\na3fIOn5y4ZFqmlKkYN+/vnl+BGyUpwX+PoOJGEu0KdNS3lqZtLI6vo5pAoGAc/qi\niKRaGgapCqDQxfzoXRdZxzr+Qx7E8srmucGM1/6MAQNM7fw3cKAa7mgFwLVCrvn0\nuCNUUNH1GS8IOMepleMP9W9NpUrQHHz447NuSzyHDXD4ohL3D236k1fY/s7j4yfv\nUQrN2WAZgD0rKYKBq6rxYOsAt27FttzjmJqzgcECgYEAvwzjPGkKPm66iqNHggVF\nx/hTEZgXgighU9qqRD1O5XeTbvEKa9+ILr1O38oP1469Nup05+VgAPZYt4us22lp\nFFBdHhnAv12ZG1bGlp+u5Y05ja2OiqP+yVcIdWPNlNhEe4k4sXsR++KMRWB9BRmg\nAPDqGZSxG2XwfYjBb1UOQ/M=\n-----END PRIVATE KEY-----\n'
GOOGLE_CLOUD_VISION_API_KEY=your-key
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Swapping Google Account
Change the service account credentials in `.env` to switch from `hanisahjohaari@gmail.com` to `hk.medicinesopt@moh.gov.my`.

---

## User Roles

| Role | Access |
|------|--------|
| User | Search, Contribute, Dashboard |
| Admin | + Review Inbox, Approve/Reject submissions |
| True Admin | + CMS Editor, Manage Users, Full control |

True Admin: `hanisahjohaari@gmail.com`

---

## Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS 3, Zustand, React Router 6
- **Backend:** Express 4, TypeScript, JWT, bcrypt, multer, nodemailer
- **Database:** Google Sheets API (production) / Local JSON (demo mode)
- **OCR:** Google Cloud Vision API (production) / Auto-verify (demo mode)

---

## Copyright

Copyright 2026 © Government of Malaysia, Ministry of Health, Pharmaceutical Services Programme.
Developed by: Hanisah (RPh. 025963)
