# Renhe's Personal Website

Welcome to my personal portfolio and blog website, built with [Astro](https://astro.build).

🔗 **Live Site**: [https://edwarddev0723.github.io/Renhe_s_web/](https://edwarddev0723.github.io/Renhe_s_web/)

## 🚀 Features

- **Personal Portfolio**: Showcasing projects and experience.
- **Blog Integration**: Automatically fetches latest articles from Medium using a custom script.
- **Responsive Design**: Optimized for all devices.
- **Static Site Generation**: Fast and secure.

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

- `src/`: Source code (pages, components, styles).
- `public/`: Static assets.
- `scripts/`: Utility scripts (e.g., `update-articles.js`).
- `astro.config.mjs`: Astro configuration.
