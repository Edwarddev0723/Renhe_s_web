# Renhe's Personal Website

Welcome to my personal portfolio and blog website, built with [Astro](https://astro.build).

🔗 **Live Site**: [https://edwarddev0723.github.io/Renhe_s_web/](https://edwarddev0723.github.io/Renhe_s_web/)

## 🚀 Features

- **Personal Portfolio**: Showcasing projects and experience.
- **Blog Integration**: Automatically fetches latest articles from Medium using a custom script.
- **Responsive Design**: Optimized for all devices.
- **Static Site Generation**: Fast and secure.

## 🎨 Design: 墨 × 朱 (Ink & Vermilion)

Ink-black or rice-paper backgrounds, one vermilion accent, and a small constellation mark (`Mark.astro`): the hero's research clusters in miniature.

- **Hero — "Fig. 1"**: research interests as clusters in a rotating 3D embedding (`LatentField.astro`). Drag to rotate, click a cluster to pin it.
- **Ticker**: awards and stats as a market tape. ▲ is red because in Taiwan's market red means up.
- **Run log**: research and work shown like an ML experiment tracker, with before → after metrics.
- **⌘K / Ctrl+K** command palette, **T** toggles dark/light, both themes follow the OS by default.
- Respects `prefers-reduced-motion` (no auto-rotation, scrambling or reveals).
- A resume button appears automatically once `public/resume.pdf` exists.

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build)
- **Deployment**: GitHub Pages

## 🧞 Getting Started

### Prerequisites

- Node.js installed on your machine.

### Installation

```bash
npm install
```

### Development

Start the local development server. This will also fetch the latest articles:

```bash
npm run dev
```

Visit `http://localhost:4321` to see the site.

### Build

Build the project for production (generated in `dist/`):

```bash
npm run build
```

## 📦 Deployment

This project is configured to deploy to **GitHub Pages** automatically via GitHub Actions.

- **Base Path**: `/Renhe_s_web`
- **Build Output**: `dist/`

## 📂 Project Structure

- `src/views/`: One component per page, rendered in both languages (`src/pages/*.astro` and `src/pages/en/*.astro` are thin wrappers).
- `src/components/`: Shared UI (hero, mark, ticker, run log, cards…).
- `src/data/`: Content — `profile.json`, `projects.json` (Decap CMS), `awards.json`, `focus.json` (hero clusters), plus generated `articles.json` / `models.json`.
- `src/i18n/`: UI strings and URL helpers (`localePath`, `pick`, `withBase`).
- `src/scripts/`: Client-side behaviour (theme, palette, canvas, text scramble).
- `public/`: Static assets.
- `scripts/`: Utility scripts (`update-articles.js`, `update-models.js`, `brand-assets.py`).
- `astro.config.mjs`: Astro configuration.

### Favicon & share image

`public/favicon.svg`, `public/images/apple-touch-icon.png` and `public/images/og-image.png` are generated. To regenerate after changing the mark or the share-card copy:

```bash
pip install pillow numpy
python3 scripts/brand-assets.py
```
