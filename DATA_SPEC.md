# Data spec (schemaVersion 1)
Root: {schemaVersion, app:"racket-tracker", rackets[], stringJobs[], overgripJobs[], entries[], settings:{lastBackupAt}, photos?{id:dataURL}}
racket{id,name,model,notes,photoId,createdAt,archivedAt}
stringJob{id,racketId,mains{model,tensionKg},crosses{model,tensionKg},knots(2|4),startDate,endDate|null,photoId,notes}
overgripJob{id,racketId,model,startDate,endDate|null,photoId,notes}
entry{id,racketId,date,hours|null,note|null,photoId,about(general|strings|overgrip|frame),stringJobId|null,overgripJobId|null,createdAt,updatedAt}
Totals are derived from entries only. Storage: IndexedDB 'rt' (kv/data, ph/photoId). To change the format: bump CUR, add MIG[old]=fn in index.html, bump cache name in sw.js. Full design: DESIGN document.

stringJob.name: optional text, unique (case-insensitive) across all string jobs; shown instead of the full setup when present. Added without a schema bump (additive).

entry.sessionId (optional, additive, no schema bump): entries sharing a sessionId are the per-racket parts of one logged session (same date and note; hours are each racket's share). Session = entry with hours!=null; note/event = entry with hours==null (no hours, about general|strings|overgrip|frame, optional photo). Legacy entries need no migration.

entry.body (optional, additive, no schema bump): body check-in, used with about='body': {elbow, shoulderL, shoulderR}, each 0 none | 1 mild | 2 moderate | 3 severe (a missing key = not recorded). Note text/photo optional for body entries; stringJobId/overgripJobId are linked by date as for other notes. Body entries have hours==null. Per-setup averages are computed from check-ins only (no check-in is never counted as 0); coverage is shown as check-ins / sessions.

Updates (additive, no schema bump): racket.sport = 'tennis' (default if missing) | 'padel' (no strings/overgrip jobs). Session entries may carry reps (approx serves for tennis, smashes/overheads for padel; same value on every racket part of a session, count once per sessionId). Body check-ins supersede the earlier 0-3 form: one entry per credited racket, sharing checkId, shared=true if >1 racket, about='body', body={elbow,shoulderL,shoulderR (0-10), when: during|after|next}, hours=null. Flare = any joint >= 4 (FLARE constant).

Updates (additive): racket.acquired (optional date; card age uses acquired, else earliest entry date, else createdAt). entry.photoIds (array of photo ids, notes can have several); entry.photoId stays = first one for compatibility.

Updates (additive): entry.intensity on session entries (0 not set | 1 low | 2 normal | 3 high; same value on all racket parts of a session). entry.body.load (0 none | 1 some | 2 lots | 3 heavy) = overhead load (serves/smashes) of the play being rated. entry.reps is no longer written or shown (old values are kept).

Updates (additive): entry.feel = {power,spin,control,slice,feel} each 1-5 (missing = not rated), on session entries or notes (belongs to the racket at that time). entry.photoIds on sessions = string-bed photos; a session entry (sessionId set) with photos is still a session. entry.sessionRef on body entries = sessionId of the session form that created them (body entries are shown only in the Body view, never in a racket's Log).

Updates (additive): feel now has 4 dimensions {power,spin,control,slice} (old 'feel' key ignored). One entry form: an entry with hours is a session, without hours a note/event; about is no longer set by the form (old values still display). Body-only logs create only body entries (about='body', sessionRef optional).
