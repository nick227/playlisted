# Railway Go-Live Checklist

Production URL:

```text
https://playlisted.up.railway.app
```

This project deploys as one Railway web service, one Railway subtitle worker service, and one Railway MySQL service. The web service runs the Express API, serves the built React app, serves `/uploads`, and has the persistent volume mounted at `/app/uploads`. The subtitle worker is a separate service from the same repo and drains existing `RecordingSubtitle` rows through Modal.

## Railway Services

| Service | Purpose | Notes |
| --- | --- | --- |
| Web service | Node/Express API, React app, uploaded media | Attach the uploads volume here. Public domain points here. Does not run transcription. |
| Subtitle worker service | Processes queued subtitle rows with Modal | Separate Railway service from the same repo. Use `railway.worker.toml` or override the start command to `npm run subtitles:worker:prod`. |
| MySQL service | Prisma database | `DATABASE_URL` in the web service should reference this service. |

## Web Service Settings

| Setting | Value |
| --- | --- |
| Public domain | `playlisted.up.railway.app` |
| Public port | `8080` |
| Volume mount path | `/app/uploads` |
| Build command | `npm run build:prod` |
| Start command | `npm run start:prod` |
| Pre-deploy command | `npm run prisma:migrate:deploy` |
| Healthcheck path | `/api/v1/health` |

These commands are already defined in `railway.toml`.

## Subtitle Worker Service Settings

| Setting | Value |
| --- | --- |
| Public domain | none |
| Build command | `npm run build:prod` |
| Start command | `npm run subtitles:worker:prod` |
| Pre-deploy command | none |
| Healthcheck path | none |

The worker config is defined in `railway.worker.toml`. The web service owns Prisma migrations; the worker must not run migration or backfill commands during deploy.

## Required Environment Variables

Set these on the Railway web service.

```env
NODE_ENV=production
HOST=0.0.0.0
TRUST_PROXY=1

# If your Railway MySQL service is named "MySQL", this is the likely reference.
# If the service has a different name, use that service name instead.
DATABASE_URL=${{MySQL.MYSQL_URL}}

# Same-origin monolith deploy: React app and API are served by this web service.
# Leave blank/unset unless the frontend is split into a separate service.
VITE_API_BASE_URL=

# Persistent uploads volume for local fallback/static legacy uploads.
UPLOADS_DIR=/app/uploads
MEDIA_BASE_URL=/uploads

# Shared object storage for uploads used by the separate subtitle worker.
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=cloudflarestorage
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://<public-bucket-host>
UPLOADS_PUBLIC_BASE_URL=https://<public-bucket-host>

# Web/API must not run transcription.
SUBTITLES_PROVIDER=disabled
```

Do not set `PORT` manually on Railway unless you have a specific reason. Railway injects the runtime `PORT`; the current deploy log shows the app listening on `8080`.

## Optional Environment Variables

```env
# Leave unset for same-origin production.
# Set only if a separate frontend domain needs to call the API.
# CORS_ORIGIN=https://playlisted.up.railway.app

# Leave unset in production unless you intentionally want public API docs.
# ENABLE_API_DOCS=1

# Default is 10000 ms.
# SHUTDOWN_TIMEOUT_MS=10000
```

## Subtitle Worker Environment Variables

Set these on the Railway subtitle worker service.

```env
NODE_ENV=production
DATABASE_URL=${{MySQL.MYSQL_URL}}

# The worker should fail closed unless Modal is explicitly configured.
SUBTITLES_ENABLED=true
SUBTITLES_PROVIDER=modal
SUBTITLES_WORKER_REQUIRE_MODAL=true
SUBTITLES_MAX_AUDIO_SECONDS=900
SUBTITLES_WORKER_SLEEP_MS=5000
SUBTITLES_WHISPER_MODEL=small

# Cost containment (MVP, Modal free tier). These are an internal backstop —
# Modal's own workspace/environment spend budget is the real hard-dollar
# limit. Set these deliberately well below whatever Modal's actual
# free-credit allowance is; don't design right up against the provider limit.
SUBTITLES_MAX_AUDIO_SECONDS_PER_DAY=3600
SUBTITLES_MAX_AUDIO_SECONDS_PER_MONTH=18000
SUBTITLES_PROVIDER_FAILURE_COOLDOWN_MS=21600000

MODAL_SUBTITLES_URL=https://your-modal-endpoint.example
MODAL_SUBTITLES_TOKEN=replace-with-shared-secret

# Lets manual backfill include existing R2-backed audio URLs.
UPLOADS_PUBLIC_BASE_URL=https://<public-bucket-host>
```

Set these on the Railway **web** service too (admission control on `/api/v1/ingest/recordings`, checked before a subtitle row is ever queued):

```env
SUBTITLES_MAX_QUEUED_PER_ACCOUNT=10
SUBTITLES_MAX_QUEUED_SYSTEM=50
```

The worker only processes rows that already exist with `status=QUEUED`. On boot it may reset stale `PROCESSING` rows back to `QUEUED`, then drain the queue. It never creates backfill rows during startup.

The worker resolves local `/uploads/...` paths for dev and downloads HTTPS audio URLs, including R2 public URLs, to a temp file before sending work to Modal. If local audio is missing, remote download fails, or the downloaded file is empty, the job fails closed and records a failed attempt (this is a per-file content problem — it does not pause the provider).

If Modal itself fails — auth, billing, rate-limit, 5xx, network/timeout — the job is left `QUEUED` (not failed) and the worker pauses further Modal calls for `SUBTITLES_PROVIDER_FAILURE_COOLDOWN_MS`. If the daily or monthly audio-duration ceiling is hit, the current job is also left `QUEUED` and the worker stops claiming further work until the next day/month. Neither case burns the backlog — subtitles just stop until the pause/cap clears. This is not a retry subsystem: nothing tracks attempts or schedules a retry, a row just sits in its ordinary `QUEUED` state and may get claimed again on a later poll like any other `QUEUED` row. A 400/413/422 response (bad request/content) is the one provider-facing failure that does mark the job `FAILED` — that's specific to the file, not the provider.

### First-time production cutover (MVP policy: no backlog recovery)

Existing `QUEUED` rows from before this pipeline exists are never drained — see [`subtitles-pipeline.md`](./subtitles-pipeline.md#backlog-policy-no-recovery-cost-safe-pipeline-starts-from-a-cutover). Sequence, in order:

1. Make sure the worker service is not running (or `SUBTITLES_ENABLED=false`).
2. Deploy the migration (adds `SubtitleProviderPause`) and the new code.
3. Run the one-time exclusion: `SUBTITLE_MAINTENANCE_CONFIRM=SUBTITLE_MAINTENANCE npm run subtitles:maintenance -- exclude-backlog --apply` (dry-run first without `--apply`).
4. Set `SUBTITLES_PROCESS_AFTER` on the worker to the cutover timestamp, so a stray re-queue of an old row can never be claimed either.
5. Configure Modal's own workspace/environment spend budget — that's the real hard-dollar backstop; the app-level duration ceilings above are an earlier, more conservative throttle, not a substitute for it.
6. Set `SUBTITLES_ENABLED=true` and deploy/restart the worker.

From that point on, subtitle spend only belongs to recordings created after the cutover.

## Do Not Set In Production

```env
SEED_DATA_PATH=prisma/seed-data.json
```

Do not run the seed script against production unless it is intentional. The seed media helper can remove and recreate the uploads directory, which would destroy real uploaded media on the mounted volume.

Do not set `SUBTITLES_BACKFILL_CONFIRM` globally on any Railway service. It exists only for a one-off manual command.

## Manual Subtitle Backfill

Backfill is never part of startup or deploy. Upload/create paths create new `QUEUED` subtitle rows automatically; this command is only for already-existing uploaded songs missing subtitle rows. It only queues local `/uploads/...` URLs and URLs under `UPLOADS_PUBLIC_BASE_URL`/`R2_PUBLIC_BASE_URL`.

Dry run:

```bash
npm run prisma:backfill-subtitles
```

Apply:

```bash
SUBTITLES_BACKFILL_CONFIRM=QUEUE_SUBTITLES npm run prisma:backfill-subtitles -- --apply
```

Retry failed rows only when intentional:

```bash
SUBTITLES_BACKFILL_CONFIRM=QUEUE_SUBTITLES npm run prisma:backfill-subtitles -- --failed --apply
```

## Database Notes

Prisma reads `DATABASE_URL` directly from the environment. Railway's MySQL template exposes `MYSQL_URL`, so the web service should map:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

If the MySQL service is named something else in Railway, replace `MySQL` with the exact service name. For example:

```env
DATABASE_URL=${{mysql.MYSQL_URL}}
```

Use the internal Railway database URL/reference for the app service, not a public TCP proxy URL, unless you specifically need external database access.

## Upload Persistence Notes

The backend writes files to:

```text
${UPLOADS_DIR}/audio
${UPLOADS_DIR}/images
```

With `UPLOADS_DIR=/app/uploads` and the Railway volume mounted at `/app/uploads`, uploads should survive redeploys and rebuilds.

Returned media URLs should look like:

```text
/uploads/audio/example.mp3
/uploads/images/example.jpg
```

## Go-Live Smoke Test

1. Deploy the web service.
2. Confirm the healthcheck returns `ok: true`:

```text
https://playlisted.up.railway.app/api/v1/health
```

3. Create or log in as a user.
4. Upload an image or audio file.
5. Open the returned `/uploads/...` URL in the browser.
6. Redeploy the web service.
7. Open the same `/uploads/...` URL again and confirm it still loads.

## Troubleshooting

If healthcheck fails, check `DATABASE_URL` first. The health route runs `SELECT 1`, so a database connection problem returns `503`.

If uploads disappear after redeploy, confirm all three things are true:

```env
UPLOADS_DIR=/app/uploads
MEDIA_BASE_URL=/uploads
```

and the Railway volume is attached to the web service at:

```text
/app/uploads
```

If the app is unreachable through the Railway domain, confirm the domain port is `8080` and the web service has:

```env
HOST=0.0.0.0
```
