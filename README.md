# Racket Tracker

A personal, installable web app for tracking tennis and padel racket use, setups, feel, and arm/body check-ins. The app is a static PWA: it has no build step, backend, account, or synchronization service.

## Features

- Track rackets, string jobs, overgrip jobs, play time, and photos.
- Log a session across one or more rackets, with optional shared session notes and intensity.
- For tennis, record six descriptive Feel ratings, like/dislike per characteristic, an overall verdict, and a per-racket Feel note. Look notes and photos are per racket.
- Padel sessions record play time only; tennis-only Feel and Look fields are not shown.
- Keep arm/body check-ins separate from sessions, with optional play-session and racket attribution.
- Review racket and setup history, Feel summaries, and free-power/firmness trends.
- Use the app offline after the static shell has been loaded; session data stays in browser storage.

## Run locally

From the repository root, start any static HTTP server. For example, with Python:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/> in a browser. Do not open `index.html` as a `file://` URL: browser storage and service workers require an HTTP origin. No packages or build tools are needed to run the app.

## Deploy

Publish the repository root to a static web host over HTTPS. Netlify Drop is one option; there is no server-side runtime to configure. Keep the files together and preserve their relative paths.

When changing the app shell or its assets, increment `CACHE_NAME` in `sw.js` so installed copies replace their cached shell. Deploy updates to the same origin to keep access to that origin's saved data.

## Data and backups

- Live data is stored in IndexedDB in the browser, under the app's origin. It is not uploaded or synchronized.
- Different browsers or site origins have separate data. Moving the app to a different URL does not move existing data.
- In **Settings**, export a JSON backup with or without photos. Import replaces the current data, so export a backup before importing.
- Do not commit exported backups or personal photos to the repository.

## Project files

- `index.html` — app UI and logic
- `manifest.webmanifest` — install metadata and app icons
- `sw.js` — offline shell cache
- `icon-1024.jpg` — modern source image; PNG app-icon sizes and a maskable variant are generated from it
- `DATA_SPEC.md` — current IndexedDB and backup data contract
- `Racket Tracker Design Document.md` — as-built behavior and design notes

The database schema is currently version 1. See `DATA_SPEC.md` before changing stored records or backup behavior. There is no automated test suite or build pipeline configured.
