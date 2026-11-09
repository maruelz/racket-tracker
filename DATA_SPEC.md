# Racket Tracker data specification

**Current schema version: 1.** The current update remains compatible with the existing IndexedDB layout and backup format; no schema-version bump is required.

## Root and storage

Root backup object: `{ schemaVersion, app: "racket-tracker", rackets[], stringJobs[], overgripJobs[], entries[], workouts[], sessionMetrics[], settings: { lastBackupAt }, photos? }`.

- IndexedDB database: `rt`; object stores `kv` (the `data` record) and `ph` (photo data keyed by photo ID).
- Backup export with photos includes `photos: { [photoId]: dataURL }`.
- Totals are derived from entries; do not store aggregate totals.
- UI preferences are kept locally, not in backups: `rt_tab` remembers the home tab; `rt_chart_prefs` stores each chart's independent 7 / 14 / 28-day viewport and horizontal scroll position.

## Records

- `racket`: `{ id, name, model, notes?, photoId?, createdAt, archivedAt?, sport?, acquired? }`.
  - `sport`: `tennis` (default when absent) or `padel`.
  - `acquired`: optional date used for racket age; otherwise the app uses the earliest entry date, then `createdAt`.
- `stringJob`: `{ id, racketId, mains: { model, tensionKg }, crosses: { model, tensionKg }, knots: 2|4, startDate, endDate|null, photoId?, notes?, name?, targetHours? }`.
  - `targetHours` is the player-set expected lifetime target for that individual restring. Older jobs without it use a 10-hour UI default.
- `overgripJob`: `{ id, racketId, model, startDate, endDate|null, photoId?, notes?, targetHours? }`.
  - `targetHours` is the expected lifetime target stored per overgrip job. New jobs suggest the median of completed prior overgrip lifetimes for that racket, or 10 hours before history exists.
- `entry`: `{ id, racketId|null, date, hours|null, note|null, photoId|null, photoIds?, about?, stringJobId|null, overgripJobId|null, createdAt, updatedAt, sessionId?, sessionRef?, checkId?, shared?, body?, intensity?, feel?, fit?, lk?, verdict?, feelNote?, lookNote? }`.
  - `racketId` may be `null` for a body check-in without racket attribution.
  - Entries sharing a `sessionId` are per-racket parts of one session; their `hours` are each racket's allocated share. Overall activity totals group by `sessionId` so the session is counted once.
  - A body check-in uses `about: "body"`, `hours: null`, and `body: { elbow?, shoulderL?, shoulderR?, load?, when }`.

## Sessions and observations

- Session `intensity`: `0` not set, `1` low, `2` normal, `3` high. For a multi-racket session it is repeated on each racket part; overall load uses the session once.
- `fit`, `lk`, `verdict`, `feelNote`, and `lookNote` retain their existing meanings and remain optional.
- `sessionMetrics[]` stores optional session-level brain fog once per session: `{ sessionId, date, brainFog: 1|2|3|null }`, where 1 = low, 2 = medium, 3 = high. Missing/null means not recorded. Legacy 0 (None) becomes unset; legacy 4 (Severe) is folded into High. Legacy onset/fuel fields are retained in old backups but are no longer collected or analyzed in the current form.

## Other workouts and workload

- `workouts[]`: `{ id, date, type: "Other workout", durationMinutes, intensity, pain?, note?, createdAt, updatedAt }`.
- The UI offers only `Other workout` as a non-racket activity type. Existing workout records are retained, with their former type labels normalized to `Other workout`; date, duration, intensity, pain and notes are preserved.
- Other workout notes are optional. Brain fog is only collected for Tennis / Pádel sessions.
- `intensity` reuses the existing 0–3 scale: 0 not set, 1 low, 2 normal, 3 high. Relative training load is `durationMinutes × intensity`; it is a personal comparison score, not a physiological measurement.
- `pain` is optional and may contain `elbow`, `shoulderL`, and/or `shoulderR` ratings from 0–10. Missing keys mean not recorded.
- Any logged session or Other workout is an activity day. A day with no logged session/workout is treated as an implicit recovery day; unlogged activity cannot be detected.

## Body ratings

- Joint values are 0–10 (0 = none, 10 = worst); a missing key means not recorded, not zero.
- `load`: overhead load, `0` none, `1` some, `2` lots, `3` heavy.
- `when`: `unlinked`, `during`, `after`, or `next`. `next` remains supported for older check-ins edited in the dedicated record editor.
- A multi-racket check-in has one entry per credited racket, sharing `checkId`; `shared` is true when more than one racket is credited.
- `sessionRef` is optional and references a related session's `sessionId`; it does not couple edits/deletes to the parent session.

## Compatibility and deployment

Older backups without `workouts`, `sessionMetrics`, or per-job `targetHours` are normalized on load/import. The update keeps schema version 1 and preserves the existing IndexedDB stores and photos. If a future change alters the stored shape incompatibly, increment `CUR`, add a migration in `MIG`, and increment the service-worker shell cache name.
