# NEXORA — Static Website

This repository contains the static site for **NEXORA** ([wearnexora.in](https://wearnexora.in)).

## Project Structure

```
├── index.html              # Main landing page
├── FAQ.html                # Frequently Asked Questions page
├── products.html           # Products page
├── Flipkart.html           # Flipkart integration page
├── styles.css              # Main stylesheet
├── mobile-optimizations.css# Mobile-specific styles
├── scripts.js              # Main JavaScript (quote system, carousels, chat)
├── scripts-clean.js        # Cleaned/minified scripts
├── rotation-test.js        # Image rotation testing script
├── Images/                 # Product images, logos, and assets
├── robots.txt              # Search engine crawl rules
├── sitemap.xml             # Sitemap for SEO
└── site.webmanifest        # PWA manifest
```

## How to Run Locally

This is a static HTML/CSS/JS site — no build step required. Choose one of the methods below.

---

### Option 1: Open Directly in Browser (Simplest)

#### Windows
```cmd
cd "C:\path\to\Nexora site"
start index.html
```
Or double-click `index.html` in File Explorer.

#### macOS
```bash
cd /path/to/Nexora\ site
open index.html
```
Or double-click `index.html` in Finder.

> ⚠️ Some features (e.g., fetch calls, service workers) may not work due to CORS restrictions when opening files directly. Use a local server (Option 2 or 3) for full functionality.

---

### Option 2: Use Python's Built-in HTTP Server

#### Windows (PowerShell)
```powershell
cd "C:\path\to\Nexora site"
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

#### macOS / Linux
```bash
cd /path/to/Nexora\ site
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

---

### Option 3: Use Node.js `serve` (Recommended for Development)

Requires [Node.js](https://nodejs.org/) installed.

#### Windows (PowerShell)
```powershell
cd "C:\path\to\Nexora site"
npx serve
```

#### macOS / Linux
```bash
cd /path/to/Nexora\ site
npx serve
```

The terminal will display a local URL (e.g., `http://localhost:3000`). Open it in your browser.

---

### Option 4: VS Code Live Server Extension

1. Install the **Live Server** extension in VS Code.
2. Open the project folder in VS Code.
3. Right-click `index.html` → **Open with Live Server**.
4. Your browser will open with hot-reload enabled.

---

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3 + Tailwind CSS** (CDN) — Styling
- **Vanilla JavaScript** — Interactivity (carousels, quote system, chat widget)
- **Netlify Forms + Formspree** — Form submission with fallback
- **Google Analytics 4** — Analytics tracking
- **OpenRouter API** — AI chat integration (DeepSeek model)

## Deployment

The site is deployed on [Netlify](https://www.netlify.com/). Push to `main` branch triggers automatic deployment.

## Notes

- Keep API keys and secrets out of version control.
- The chat widget uses an embedded API key for testing; move to a backend proxy for production.
- Images are stored in the `Images/` folder; optimize before committing large files.
