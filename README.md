# Coin Collection

A local-first web application for coin collectors to detect duplicate coin types using image-based fingerprinting.

## Project structure

- `src/app` — UI components and pages
- `src/vision` — image preprocessing and fingerprint generation logic
- `src/storage` — local persistence and collection management
- `src/models` — shared data models and types
- `tests` — unit tests and validation logic

## Getting started

1. Open the `Coin Collection` folder in VS Code.
2. Run `npm install`.
3. Run `npm run dev` to start the local development server.
4. Open `http://localhost:5173` in the browser.

## Next steps

1. Implement the app shell and collection UI in `src/app/App.tsx`.
2. Define the `Coin` model and fingerprint types in `src/models/coin.ts`.
3. Add local persistence using IndexedDB or localStorage in `src/storage/localStore.ts`.
4. Create coin image preprocessing utilities in `src/vision/imageProcessor.ts`.
5. Add fingerprint generation and comparison helpers in `src/vision/fingerprint.ts`.
6. Build the duplicate detection flow using the scoring rules from the requirements.

## Notes

- Keep the app fully offline by avoiding remote backend services.
- Prefer modular, testable code so future features like coin identification and cloud sync can be added later.
