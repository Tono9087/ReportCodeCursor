# Project Report Generator

A client-side web app that turns a programming project (ZIP) and optional screenshots into a structured **PDF report** with syntax-highlighted source code.

## Features

- **Upload ZIP** – Extract and analyze a `.zip` of your project in the browser
- **Supported code** – `js`, `ts`, `jsx`, `tsx`, `py`, `html`, `css`, `json`, `md`
- **Ignored folders** – `node_modules`, `.git`, `build`, `dist`, `.next` are skipped
- **Document structure** – Overview, folder tree, source grouped by Components / Pages / Store / Utils / etc.
- **Screenshots** – Optional PNG, JPG, JPEG, WebP; added as a “Screenshots” section with captions
- **PDF export** – A4, page breaks, syntax highlighting (Prism.js)

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173), then:

1. **Upload ZIP** – Select a `.zip` of your project
2. **Upload Screenshots** (optional) – Add one or more images
3. **Preview** – Scroll the generated report below
4. **Export PDF** – Download the report as PDF

## Tech stack

- **React** + **Vite**
- **JSZip** – ZIP extraction in the browser
- **Prism.js** – Syntax highlighting
- **html2pdf.js** – PDF generation (A4, with page breaks)

All processing is done in the browser; nothing is sent to a server.
