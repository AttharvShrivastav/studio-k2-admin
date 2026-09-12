# Field-level Uploads

Studio K2 uses direct upload/replace controls on project fields. There is no media library, asset browser, media table, source-controlled upload folder, or automatic physical deletion.

## Storage

`UPLOAD_ROOT` configures the filesystem adapter. Local development defaults to `./var/uploads`, which is ignored by Git and lives outside `dist`. Production must point it at a persistent Hostinger path that survives application replacement. Returned URLs use `/api/uploads/<generated-key>` and never expose absolute server paths.

## Routes and validation

- `POST /api/admin/uploads/images` — authenticated JPEG, PNG, or WebP multi-upload; 10 MB per-file limit.
- `POST /api/admin/uploads/sequence` — authenticated numbered-frame upload.
- `GET /api/uploads/*` — controlled read access for generated image/sequence keys.

The server checks file signatures instead of trusting MIME, extension, names, or client paths. Stored filenames use UUIDs and fixed detected extensions. Paths are rooted and allowlisted to prevent traversal and executable uploads. Metadata includes URL, storage key, original filename, detected MIME, byte size, and straightforward dimensions.

Sequence files must share prefix, numeric padding, detected/declared extension, and contiguous numbering. The service sorts numerically and derives the frame list and count. It does not perform video conversion or expose playback choreography.

Replacing or removing a form reference intentionally leaves the old physical file in place. Orphan cleanup/reference counting is deferred to avoid deleting media referenced elsewhere.
