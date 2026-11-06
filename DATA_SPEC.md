# Racket Tracker data specification

**Current schema version: 1**. The changes below are additive and retain the existing IndexedDB layout; no schema-version bump is required.

## Root and storage

Root backup object: `{ schemaVersion, app: "racket-tracker", rackets[], stringJobs[], overgripJobs[], entries[], settings: { lastBackupAt }, photos? }`.

- IndexedDB database: `rt`
- Object stores: `kv` (the `data` record) and `ph` (photo data keyed by photo ID)
- Backup export with photos includes `photos: { [photoId]: dataURL }`.
- Totals are derived from entries; do not store aggregate totals.

## Records

- `racket`: `{ id, name, model, notes?, photoId?, createdAt, archivedAt?, sport?, acquired? }`
  - `sport`: `tennis` (default when absent) or `padel`.
  - `acquired`: optional date used for racket age; otherwise the app uses the earliest entry date, then `createdAt`.
- `stringJob`: `{ id, racketId, mains: { model, tensionKg }, crosses: { model, tensionKg }, knots: 2|4, startDate, endDate|null, photoId?, notes?, name? }`
  - `name` is optional and unique case-insensitively across string jobs. When present it is shown instead of the full string setup.
- `overgripJob`: `{ id, racketId, model, startDate, endDate|null, photoId?, notes? }`.
- `entry`: `{ id, racketId|null, date, hours|null, note|null, photoId|null, photoIds?, about?, stringJobId|null, overgripJobId|null, createdAt, updatedAt, sessionId?, sessionRef?, checkId?, shared?, body?, intensity?, feel?, lookNote? }`.
  - `racketId` is normally a racket ID. It may be `null` for a body check-in intentionally saved without racket attribution.
  - `photoIds` is an optional array of photo IDs. `photoId` remains the first photo ID for compatibility with older data.

## Sessions and notes

`entry.sessionId` is optional. Entries sharing a `sessionId` are the per-racket parts of one logged session (same date and note; `hours` is each racket's share). A session has `hours != null`; a note/event has `hours == null`. Existing entries without `sessionId` remain valid.

- `intensity`: session intensity `0` not set, `1` low, `2` normal, `3` high. The value is repeated on each racket part of a multi-racket session.
- `feel`: optional per-racket ratings `{ power, spin, control, slice }`, each 1–5. Missing keys mean not rated. The retired `feel` dimension from older data is ignored by the current UI.
- `lookNote`: optional string-bed / wear note associated with that racket at that time.
- Session `photoIds` are string-bed photos. A session entry with photos is still a session.
- `entry.reps` from older data is retained if present but is no longer written or displayed.

## Body / arm check-ins

A body check-in uses `about: "body"`, `hours: null`, and `body: { elbow?, shoulderL?, shoulderR?, load?, when }`.

- Joint values are 0–10 (0 = none, 10 = worst); a missing key means not recorded, not zero.
- `load`: overhead load, `0` none, `1` some, `2` lots, `3` heavy.
- `when`: `unlinked`, `during`, `after`, or `next`.
  - `unlinked` means the check-in is not attributed to a racket / play session. It is stored with `racketId: null`.
  - `during` and `after` describe the relation to play.
  - `next` is retained for legacy “next day / later” entries and remains editable.
  - Older `when: "none"` (and the short-lived `not_tied` alias) is normalized to `unlinked` on app startup. New writes use `unlinked`, never `none`.
- A multi-racket check-in has one entry per credited racket, sharing `checkId`; `shared` is true when more than one racket is credited.
- `sessionRef` is optional and points to a related session's `sessionId`. It is a reference only: editing or deleting a check-in never changes its parent session. Deleting a session preserves linked check-ins and clears their `sessionRef` rather than deleting them.
- Check-ins are displayed in the Body view, not in a racket's session log. Per-setup averages use check-ins only; no check-in is not counted as zero. Flare threshold is 4 or higher on any joint.

## Compatibility and deployment

All fields above are additive to schema version 1. If a future change alters the stored shape incompatibly, increment `CUR`, add a migration function in `MIG` in `index.html`, and increment the shell cache name in `sw.js`.
