# Coin Collection

A local-first web application for coin collectors to detect duplicate coin types using image-based fingerprinting.

## Project structure

- `src/app` — UI components and pages
- `src/vision` — image preprocessing and fingerprint generation logic
- `src/storage` — local persistence and collection management
- `src/models` — shared data models and types
- `tests` — unit tests and validation logic

## Development

```bash
npm install
npm run dev
```

The production build is configured for the GitHub Pages repository URL:
`https://tlsyip.github.io/Coin-Collection/`.

GitHub Pages deployment is handled by `.github/workflows/deploy.yml`. In the
repository settings, set Pages > Build and deployment > Source to GitHub Actions.