<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/51b4738a-e93f-4b77-92ac-b5cf2d68969f

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Cross-platform builds (DurgasOS)

- **PWA / web:** `npm run build` — `@ducanh2912/next-pwa` emits `public/sw.js`; install from the browser using the web app manifest.
- **Desktop (Electron):** `npm run dev:electron` (Next on `:3000` + Electron). Production: `npm run build` then `npm run make:win` / `make:mac` / `make:linux` — bundles `.next/standalone` under `dist-electron/` (requires `node` on `PATH` to run the embedded server, or set `ELECTRON_FALLBACK_URL` to a deployed site).
- **Mobile (Capacitor):** Set `CAPACITOR_SERVER_URL` (or `NEXT_PUBLIC_CAPACITOR_SERVER_URL`) to your deployed Next URL, then `npx cap sync`, `npm run cap:open:android` / `cap:open:ios`. Native Firebase / OAuth requires the [Capawesome Firebase setup](https://github.com/capawesome-team/capacitor-firebase) in Gradle and Xcode.
- **Icons:** `npm run icons:generate` regenerates `public/icons/icon-192.png` and `icon-512.png` from `public/favicon.svg`.
