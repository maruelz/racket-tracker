# Racket Tracker data notes (v13)

IndexedDB schema is unchanged (`rt` v1, stores `kv` and `ph`); all additions are optional fields, so existing data and backups load as-is.

## Event clock
Sessions, Other workouts, arm check-ins and string/overgrip changes may carry an optional local `time` (HH:MM, entered by the user; never guessed). Order is date, then time, then `createdAt` only as a last tie-break.
Equipment attribution (`stringJobId` / `overgripJobId` on sessions and check-ins) is **derived** from date + time by `pick()` and re-derived on every save, so adding, editing or deleting a job corrects earlier entries. Rules on a change date: both times known → compare; otherwise the entry counts toward the **new** setup. A session can be pinned `jobPin: "before"` ("I played before the change") to stay on the previous setup. Entries with neither `sessionId` nor `body` (legacy / "past hours" records) are never re-derived.
Job end dates are derived from the next job's start. `fixedEnd` keeps a user-entered end date from "Add past strings/overgrip"; `auto` marks derived end dates so deleting the newest job makes the previous one current again.

## Session metrics
`brainFog`: `null` not recorded, `0` None, `1` Some, `2` Significant. `onsetMinutes`: optional non-negative integer. Legacy value `3` is converted to `2` **on backup import only**. Workload shows the median onset with n.

## Charts
One engine draws every chart with real column geometry: 7d/14d/4w show exactly 7/14/28 columns, the y-axis is a fixed column, dates are labelled at an adaptive stride. Range is stored in localStorage `rt_chart_prefs` (`days` only) per range group (e.g. `tennis` controls both the activity and cumulative charts). Scroll position is held in memory (distance from the newest edge), not saved. Daily bars stack that day's sessions in time order; the scale is sport-wide (busiest day, rounded up to 0.5 h, minimum 2 h). Tennis/Pádel totals count a session once even when split across rackets. Tap a day to read its values.
Racket Overview overlays string setups as coloured lines (hours played shown) with dashed change markers, aligned to the same date columns.

## Safety
Import keeps the previous data under `kv` key `prev`. Storage write failures now alert instead of hanging. Racket removal requires typing HIDE or DELETE.
