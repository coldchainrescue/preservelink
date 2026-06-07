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
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@...
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
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
