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

## v14 additions
**Body check-ins** are point-in-time records (`date`, optional `time`, optional pain 0–10 per joint, optional overhead `load`, `note`). They are no longer linked to a racket or session. Existing check-ins that were saved once per racket (shared `checkId`) are merged into one record; the old racket ids, session reference and timing are kept under `legacy` so a retrospective analysis stays possible. Racket-level pain comparison was removed.
**Fatigue** is a separate list `db.fatigue`: `{id,date,time?,level 1|2|3,note?,tipDate?,tipTime?}` (1 Fine, 2 Close to the limit, 3 Broke down; no entry = not recorded). `tipDate/tipTime` is the retroactive tipping point, editable any time from the fatigue log.
Derived series (never stored): known days use the day's highest level. A gap of up to 7 days between two known days is assumed `2` when both ends are 2+, otherwise assumed recovering (`1`); longer gaps and the days after the last entry are unknown. Strain = 0.7 × yesterday + (level 3: 3; level 2: 1 + 0.5 × (consecutive days at 2+ − 1)); gap days never add strain beyond the assumed-2 rule, and unknown days only decay. "Limited" = an active day while fatigue was 2+ (or the day after a 2+ with no 1 logged). Episodes start when level reaches 2+ and end at the first day at 1; load and active-day run are measured up to the tipping point when one is set. The red line needs 3 episodes. Time within a day is not used for fatigue ordering.
**Body tabs:** Pain · Workload (load, duration, mix, recent workouts) · Recovery (now, recovery strip, fatigue level, strain, episodes, log) · Analytics (rolling load with fatigue dots and red line, load by intensity vs fatigue, recovery time, pain alongside workload, brain fog).
**Forms:** values are sliders (with a "Not recorded" chip; untouched = null) or chips; times are optional.

## v15 additions
**Input rules:** named levels (intensity, brain fog, overhead load, fatigue, 1–5 ratings) are chips; tapping the selected chip clears it (stored as not recorded). Numeric ranges (pain 0–10, brain-fog onset) are sliders whose leftmost stop is "unset". Intensity defaults to Normal on a new session; an unset intensity counts as zero load.
**Brain-fog onset:** the UI offers 30–150 min in 5-min steps; storage is still any non-negative integer, and an existing value outside the range is preserved (the slider widens for that entry).
**Fatigue labels:** Ok (1) · Borderline (2) · Broke down (3); numbers are stored, not shown.
**Equipment change on the same day:** decided by the optional times on the session and on the change; if either is missing the session counts toward the new setup. Older `jobPin: "before"` values are still honoured, but there is no longer a form field for it.
**Navigation:** on the Body tab a horizontal swipe (or swiping the tab row) steps Pain → Workload → Recovery → Analytics; at the first tab a right swipe moves to the previous home tab. Touches that start on a chart still scroll the chart.

## v16 additions
**Load units:** hours x intensity factor (Low 0.5, Normal 1, High 1.5; unset = Normal), so 1 unit = one normal hour.
**Fatigue:** levels 1 Fresh, 2 Tired, 3 Exhausted, plus optional `stopped`. `db.fatV=2` marks the one-time migration (old 2 -> 3; old 3 -> 3 + stopped). Episodes start at Exhausted and end at the first Fresh/Tired day; Tired only shades charts. A session's "Body at start" chip writes a fatigue entry with `sessionId`; editing or deleting the session updates it.
**Feel items** (optional 1-5 chips in `fit`): amounts `spin, launch, plow, pop, pocket`; position `firm` (Boardy..Mushy); qualities `comfort, precision, connect, ease` (Problem..Standout; Fine = not its strength, not bad). Old keys `power, firmness, forgiveness` and `lk` likes stay readable in the log but are no longer editable.
**Tennis usage card:** range chips 7d/14d/4w/All; rackets follow card order.

## v17 additions
**Body tabs are now Pain · Load** (swipe order Pain, Load). Workload, Recovery and Analytics were merged; the activity-duration, activity-mix, intensity, strain, recovery-strip and pain-load charts were removed.
**Run load** (derived, never stored): activity load added up day by day since the last full rest day (a day with no logged activity); a rest day resets it to 0. Zones: amber/red at 3/4 until there are 3 fatigue episodes, then red = median run load before those episodes (at the tipping point when set) and amber = 75% of it. Chart overlays: fatigue shading (Tired amber, Exhausted red), peak-pain dots, dashed lines for `stopped` entries.
**Session sheet** now also records, in `sessionMetrics`: `pain` (peak 0-10 per joint, feeds the Pain charts), `overheads` (0-3) and `cmp` (per Feel item: the racket id that had more / was better, or `same`; multi-racket sessions only).

## v18 additions
**Fatigue load** (derived) replaces run load: balance_t = 0.75 x balance_(t-1) + load_t, load in normal hours. A rest day lowers the balance, it never resets it (6 days of 1.25 h: about 4.1, then 3.1 / 2.3 / 1.7 on the next rest days). Fallback zones: amber 2.0, red 2.7 (about four normal days in a row); after 3 episodes red = median balance before them, amber = 75% of it. The Now card shows a model estimate (Fresh/Tired/Exhausted) and asks you to log fatigue to correct it; logged entries always win in the shading and episodes.
**Feel scales (words, one line):** amounts Min-Max, Firmness Mushy-Steely (stored 1-5, flipped once from the old Boardy-Mushy order, `db.fitV=2`), qualities Problem/Weak/Fine/Good/Standout, verdict Hated/Disliked/Mixed/Liked/Loved. Free power moved to the racket (`racket.plow` 1-5, `racket.handle` note); old per-session `plow` stays readable.
**Forms:** overheads are recorded only in the session sheet (the check-in form no longer asks; stored `body.load` is preserved). Body tab sub-modes sit in the home row as `Tennis Padel Body · Pain Load`; the session Body section is grouped (Body at start, Brain fog with onset shown only when fog is Some/Significant, Peak pain, Overheads).
