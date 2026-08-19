# Wedding Seating Planner

A standalone, static seating and meal planner for the reception. Built with Vite + React +
Tailwind, deployed to GitHub Pages. Every change you make — seating, table positions, course
defaults, sheet header — is written to the browser's `localStorage`, so reloading or closing the
tab picks up exactly where you left off.

**Live site:** https://dbandrews.github.io/wedding-seating-layout/

## Where things live

| Path | What it is |
| --- | --- |
| `src/SeatingPlanner.jsx` | The app. This is the file to edit. |
| `src/storage.js` | Loads, saves, and repairs the `localStorage` copy of the plan. |
| `wedding-seating-chart.jsx` | The original single-file component this was built from. Kept for reference only — it is **not** part of the build. |

## Saved data

- Stored under the key `wedding-seating:v1` in the browser that made the changes.
- It never leaves the device: another phone or laptop opens the original meal sheet.
- **Export → Saved on this device → Reset to the original meal sheet** wipes it and starts over.
- Export the CSVs before handing anything to the venue.

## Local development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # serve the built site
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes
`dist/` to GitHub Pages. The Vite `base` in `vite.config.js` must match the repository name.
