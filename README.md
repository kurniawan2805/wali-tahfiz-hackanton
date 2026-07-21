# Wali Tahfiz

Wali Tahfiz is a gentle Qur’an memorisation companion for families. It helps a parent or guardian guide a child through small, calm sessions—starting with Al-Fatihah and Juz 30.

The app is not here to rush a child or replace the person beside them. It gives the family a simple plan, helpful audio, and a kind way to keep track of progress.

**Track: 🌚 Education** — an AI learning companion that helps guardians make Qur’an memorisation calm, personal, and consistent for children.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white) ![PWA](https://img.shields.io/badge/PWA-ready-47775C)

## What it can do

- Set up one family account with a parent or guardian greeting.
- Add, edit, switch between, and remove child profiles. Each child keeps their own targets, memorised ranges, practice settings, and review history.
- Mark surahs a child already knows during setup or later in Settings.
- Create a new memorisation target for one verse or a verse range in Al-Fatihah or Juz 30.
- Guide new memorisation in three simple steps: **Listen (talaqqi)**, **Repeat (tikrar)**, and **Connect (rabt)**.
- Save an unfinished practice session so it can be continued later.
- Split long connection practice into smaller blocks, so a long surah does not become one overwhelming screen.
- Save completed targets as memorised ranges and suggest reviews at a spaced rhythm: **1, 3, 7, 14, and 30 days**.
- Add a suggested review to today’s plan, practise with a random “what comes next?” prompt, then choose **Smoothly done** or **Try again**.
- Listen to Al-Fatihah and every surah in Juz 30, with Arabic text and an Indonesian or English translation.
- Search the listening catalogue by surah name, number, or Arabic name.
- Choose a reciter, repeat each verse, set a verse range, repeat that range, and move through the audio with play, pause, previous, next, and replay controls.
- Use the Memorisation Companion for a small, caring suggestion based on the child’s mood, today’s plan, and reviews that are ready. It can suggest a pause, listening, review, or one small new target.
- Get useful local companion advice even when the optional AI service is not configured or cannot be reached.
- Use the app in Bahasa Indonesia or English, and choose light or dark mode.
- Export family data as a JSON backup, import it on another device, or reset local data when needed.
- Install the app from the browser. Its basic app shell can open offline.

## Privacy and data

Family profiles, targets, memorisation records, preferences, and daily companion check-ins are stored in the browser on the device with IndexedDB. They are not sent to a server by default.

Qur’an text, translations, and audio are loaded from public Qur’an services. The optional AI companion sends only the small amount of session context it needs to the server endpoint; it never asks the family to put an API key into the app.

Use **Settings → Data backup** to keep a copy of your data before changing or resetting devices.

## Run it locally

You need Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local address shown by Vite in your browser.

To check the production build:

```bash
npm run build
```

To run the test suite:

```bash
npm test
```

## Sample data

No database or hosted account is required. On first launch, use the setup screen to add a guardian and a child. You can mark a few known surahs, create a small target such as Al-Fatihah verses 1–2, and try the Listen, Repeat, Connect, and Review flows.

For repeatable device-to-device testing, use **Settings → Data backup → Export backup**, then import that JSON file during setup on another browser or device. The app keeps this data in that browser’s IndexedDB.

## Optional AI companion

The AI version of the Memorisation Companion is optional. Without it, the app still gives local gentle suggestions.

To enable AI advice locally, copy the example environment file and add an OpenAI API key. Keep this key on the server only.

```bash
cp .env.example .env.local
```

```env
OPENAI_API_KEY=your_openai_api_key_here

# Optional: model used by Teman Hafalan (defaults to GPT-5.6)
OPENAI_MODEL=gpt-5.2
```

`npm run dev` serves `/api/daily-coach` and `/api/log-progress` through Vite. In production, Vercel automatically deploys both handlers from `api/daily-coach.js` and `api/log-progress.js`; the existing rewrite keeps `/api/*` requests routed to those serverless functions. Do not put the key in frontend code or commit `.env` files.

## Language and appearance

The app starts in Bahasa Indonesia unless you choose another language in Settings. To make English the default for new visitors, add this to `.env.local` or your deployment environment:

```env
VITE_APP_LOCALE=en
```

Supported values are `id` and `en`. Families can always change the language and choose light or dark mode from Settings; their choices stay on the device.

## Built with

- React and Vite
- Tailwind CSS
- Dexie and IndexedDB for local data
- Lucide React icons
- Web App Manifest and service worker for installation and offline support

For the full product and interface guidance, see [design.md](design.md).

## How Codex and GPT-5.6 were used

Codex accelerated the workflow from product idea to a working, testable PWA. It helped inspect the existing React code, map the real feature set, refine the interface language, improve the Qur’an listening experience, update the product and design documentation, run the test/build checks, and prepare the repository for review.

Key implementation decisions were made with a human-in-the-loop:

- Keep family and child data local in IndexedDB, with explicit JSON backup and restore.
- Use small Listen → Repeat → Connect sessions and spaced reviews instead of competitive streaks.
- Provide a useful local companion fallback so the core experience does not depend on an AI service.
- Keep the OpenAI key server-side behind `/api/daily-coach` and `/api/log-progress`; never expose it in browser code.
- Use a configurable model through `OPENAI_MODEL`, defaulting to `gpt-5.2` for the AI companion.

`gpt-5.2` is used by the optional Memorisation Companion to turn the app’s local recommendation and child-session context into one short, gentle suggestion. The model is constrained to the locally selected action, uses structured JSON output, and is not used to store family conversations or make medical claims. Codex was used as the engineering partner around that model: inspecting the codebase, implementing and reviewing changes, writing tests, and verifying the production build.

## License

This project is released under the [MIT License](LICENSE).
