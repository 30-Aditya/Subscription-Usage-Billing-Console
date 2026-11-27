# Subscription Usage & Billing Command Console

A frontend-only academic prototype for managing fictional subscription customers, plan assignments, usage, demo invoices, and notifications.

## Project

- **University:** GLA University
- **Course:** B.Tech CSE (AI & DS), Semester 5, Batch 2, Section AE
- **Faculty mentor:** Satyam Kumar Jha
- **Stack:** React, JavaScript, Vite, HTML, and CSS

## Run locally

```bash
npm install
npm run dev
```

Run the production build and lint checks with:

```bash
npm run build
npm run lint
```

## Deploy to GitHub Pages

The GitHub Actions workflow builds and deploys the app when changes are pushed
to `main`. In the repository settings, set **Pages → Build and deployment →
Source** to **GitHub Actions**.

## Demo features

- Dashboard figures are calculated from the saved demo customers, plans, usage, and invoices.
- Add, edit, search, and delete fictional customer records.
- Assign Basic, Pro, or Enterprise plans and simulate usage increases.
- Generate demo invoices, filter by status, and mark them paid or failed for demonstration.
- Review and mark usage or payment notifications as read.
- Demo data persists in this browser's `localStorage`. Use **Settings → Restore sample data** to reset it.

## Prototype limitations

This project has no backend, database, external API, or payment gateway. Invoice actions do not move money. Invoice amounts use the assigned plan price only; taxes, proration, and payment processing are not implemented.
