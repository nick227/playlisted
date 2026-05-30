# Railway Go-Live Checklist

Production URL:

```text
https://playlisted.up.railway.app
```

This project deploys as one Railway web service plus one Railway MySQL service. The web service runs the Express API, serves the built React app, serves `/uploads`, and has the persistent volume mounted at `/app/uploads`.

## Railway Services

| Service | Purpose | Notes |
| --- | --- | --- |
| Web service | Node/Express API, React app, uploaded media | Attach the volume here. Public domain points here. |
| MySQL service | Prisma database | `DATABASE_URL` in the web service should reference this service. |

## Web Service Settings

| Setting | Value |
| --- | --- |
| Public domain | `playlisted.up.railway.app` |
| Public port | `8080` |
| Volume mount path | `/app/uploads` |
| Build command | `npm run build:prod` |
| Start command | `npm run start:prod` |
| Pre-deploy command | `npx prisma migrate deploy` |
| Healthcheck path | `/api/v1/health` |

These commands are already defined in `railway.toml`.

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

# Persistent uploads volume.
UPLOADS_DIR=/app/uploads
MEDIA_BASE_URL=/uploads
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

## Do Not Set In Production

```env
SEED_DATA_PATH=prisma/seed-data.json
```

Do not run the seed script against production unless it is intentional. The seed media helper can remove and recreate the uploads directory, which would destroy real uploaded media on the mounted volume.

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
