# Data spec (schemaVersion 1)
Root: {schemaVersion, app:"racket-tracker", rackets[], stringJobs[], overgripJobs[], entries[], settings:{lastBackupAt}, photos?{id:dataURL}}
racket{id,name,model,notes,photoId,createdAt,archivedAt}
stringJob{id,racketId,mains{model,tensionKg},crosses{model,tensionKg},knots(2|4),startDate,endDate|null,photoId,notes}
overgripJob{id,racketId,model,startDate,endDate|null,photoId,notes}
entry{id,racketId,date,hours|null,note|null,photoId,about(general|strings|overgrip|frame),stringJobId|null,overgripJobId|null,createdAt,updatedAt}
Totals are derived from entries only. Storage: IndexedDB 'rt' (kv/data, ph/photoId). To change the format: bump CUR, add MIG[old]=fn in index.html, bump cache name in sw.js. Full design: DESIGN document.

stringJob.name: optional text, unique (case-insensitive) across all string jobs; shown instead of the full setup when present. Added without a schema bump (additive).

entry.sessionId (optional, additive, no schema bump): entries sharing a sessionId are the per-racket parts of one logged session (same date and note; hours are each racket's share). Session = entry with hours!=null; note/event = entry with hours==null (no hours, about general|strings|overgrip|frame, optional photo). Legacy entries need no migration.
