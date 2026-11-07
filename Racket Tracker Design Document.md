# Racket Tracker: Design Document

*As-built project description · Updated 2026-11-07*

This document describes the app in the repository. `index.html` is the implementation; `DATA_SPEC.md` is the reference for stored records and backup compatibility.

## 1. Purpose and scope

Racket Tracker is a personal, single-user web app for tracking tennis and padel racket usage, equipment setups, impressions, and arm/body check-ins.

It is a static Progressive Web App (PWA). There is no account, server-side application, or synchronization service. Live data stays in browser storage for the app's origin.

## 2. Platform and delivery

- The app is implemented in plain HTML, CSS, and JavaScript in `index.html`; there is no build step or runtime package dependency.
- `manifest.webmanifest` provides install metadata and icons. `sw.js` caches the app shell and icons for offline use.
- Serve the repository root over HTTPS in production. `localhost` is suitable for local development. Do not open the app as a `file://` URL.
- Browser data is scoped to the site origin and browser profile. A new hostname or deployment URL does not inherit the old origin's data.
- Offline use depends on the shell being loaded and cached at least once. The service worker caches app files, not user records; records remain in IndexedDB.

### Main files

- `index.html` — app UI, styles, data access, and interactions
- `manifest.webmanifest` — app name, display settings, theme, and PNG icon declarations
- `sw.js` — install, activation, cache cleanup, and fetch behavior for the app shell
- `icon-1024.jpg` — modern source image for the generated icon PNGs
- `icon-192.png`, `icon-512.png`, `icon-1024.png` — standard PNG icon sizes
- `icon-maskable-512.png` — padded maskable PNG icon
- `DATA_SPEC.md` — current IndexedDB and backup data contract

## 3. Data and storage

The app uses IndexedDB database `rt`, with the `kv` store for the main data object and `ph` for photo data. The current schema version is 1. Totals and other summaries are derived from entries rather than stored separately.

Rackets can be tennis or padel. Tennis rackets may have string and overgrip jobs, which have dates, setup details, and optional photos. Entries record play sessions, notes, or body check-ins. One multi-racket session is represented by multiple entries sharing a `sessionId`; each entry carries the share of hours attributed to its racket.

The storage rules that matter to the UI are:

- Tennis Feel data is additive: `fit` holds optional 1–5 descriptive ratings, `lk` holds optional like/dislike choices, `verdict` is 1–5, and `feelNote` is a free-text note per racket.
- The Feel characteristics are free power, free spin, launch, firmness, forgiveness, and precision. No combined score is calculated.
- `feel` is a legacy field. The current rubric does not read or write it, and editing a record preserves any legacy value still on that record.
- `about` remains for body check-ins and historical compatibility. New notes do not ask for a category; historical note categories remain in stored data and backups.
- `note` is shared session text. `feelNote` and `lookNote` are per-racket text. Tennis Look photos are stored by photo ID.
- Photos are kept in IndexedDB and can be included in or omitted from a JSON backup.

See `DATA_SPEC.md` for the complete record shapes, fields, and compatibility requirements.

## 4. Screens and interactions

### Home

The home screen shows racket cards with total hours and, for tennis rackets, current string and overgrip summaries. It also shows body/arm status and provides global actions to log a session or create a body check-in. Padel cards omit tennis setup details.

Tapping a racket opens its detail view. The detail view has a Log tab and, for tennis, a Setups tab. The Log view shows the racket's entries and related setup events. Setups shows string and overgrip history, hours per setup, and tennis Feel summaries where data exists.

### Logging a session

A session can include one or more rackets and has a date, optional play time, shared session note, and tennis intensity. Its sections are:

- **Play:** hours, the shared session note, and tennis intensity
- **Feel (tennis only):** optional 1–5 chips for each characteristic, optional like/dislike per characteristic, an optional overall verdict, and a per-racket Feel note
- **Look (tennis only):** a per-racket string-bed/wear note and photos

Feel scores use 1–5, with the characteristic anchors available in the form. Tapping a selected score or like/dislike again clears that value. Feel summaries show descriptive medians, sample counts, likes/dislikes, and verdict counts; they do not rank rackets or combine characteristics into a grade.

The Setups view can show a descriptive trend of free power and firmness against hours on the current string job, after enough entries have been rated. It is not a composite performance score.

Sections can be turned off without deleting their saved data. Clear the fields or selections explicitly when the intention is to remove values.

Padel sessions are Play-only: they record play time without tennis-specific intensity, Feel, Look, notes, or photos.

### Body / arm check-ins

Body check-ins are separate from sessions. They record elbow and shoulder ratings, optional overhead load, a date, and an optional note. The Body view offers check-in history and a weekly view.

The app suggests a relationship when a nearby session exists: After for a same-day session or Next day for a previous-day session. During, After, Next day, and Not tied to play are available. Not tied to play clears both session and racket attribution; linked check-ins can be credited to one or more rackets. Deleting a session preserves its linked check-ins.

### Settings and backups

Settings provides racket setup, schema and last-backup information, JSON export with or without photos, and import. Import replaces the current data. The player should export a backup before importing another file.

## 5. Notes, jobs, and history

String and overgrip jobs retain their own setup information and dates. Entries store the job IDs to which play time is credited, so later setup changes do not rewrite old attribution. Racket totals and setup totals are calculated from entry hours.

New entries no longer collect note categories such as General or Strings. Existing category values are retained for compatibility but are not part of the current note UI.

Deleting a session does not delete associated body check-ins. Their session reference is cleared so a check-in remains usable even when the session is gone.

## 6. Backup, privacy, and data safety

- IndexedDB is the live store; the app does not upload data to a service.
- Browser site-data deletion can remove the app's records and photos. Export backups regularly, especially before changing the app origin or importing data.
- Export with photos includes photo data in the JSON backup; export without photos omits it.
- Import replaces existing app data.
- A backup may contain personal notes and photos; keep it private and do not commit it to the repository.

## 7. Updating the app

Publish the repository root to the same static HTTPS origin. Increment `CACHE_NAME` in `sw.js` when changing the app shell or its assets; the service worker removes older caches during activation.

The manifest uses PNG icons derived from the modern `icon-1024.jpg` source. Standard PNG variants have transparent rounded corners; the maskable icon has a safe inset and app-colored background. If a platform continues showing a previous icon after an update, reinstall the PWA to refresh launcher metadata.

The stored schema is currently version 1. Additive fields can be introduced without changing the IndexedDB layout when they remain backward-compatible. For an incompatible data-shape change, update `DATA_SPEC.md`, add and test a migration in `index.html`, increment the schema version, and bump the service-worker cache.

## 8. Change and verification checklist

For changes to the app:

1. Keep session, Feel, Look, Padel, and body-check-in behavior consistent with this document and `DATA_SPEC.md`.
2. Preserve legacy fields unless a deliberate data migration is planned.
3. Check export and import behavior when changing stored data.
4. Verify the app through a local HTTP server; test service-worker and install behavior on the intended browser/device before release.
5. Bump the service-worker cache when the shell or its assets change.
