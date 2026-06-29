# Playlisted

**A music platform where playlists have opinions, artists have URLs, and the API contract is written down like an adult.**

Playlisted is a full-stack music discovery and creator app: editorial homepage rows, canonical playlist URLs (`/@username/slug`), a bottom player that actually stays at the bottom, creator **Studio** tools, charts, favorites, unified search, and an admin panel for the brave. One repo. One deploy. Zero mystery meat endpoints.

> *Folder on disk may say `musicpop`. The product says **Playlisted**. We contain multitudes.*

---

## What you get

| For listeners | For creators | For operators |
|---------------|--------------|---------------|
| Homepage discovery & charts | Upload audio & cover art | Admin dashboard |
| Search (songs, playlists, artists) | Collections & inbox playlists | Tags & homepage features |
| Favorites & library | Playback analytics | User / song / playlist moderation |
| Persistent bottom player + queue | Public profile & `/@user/slug` links | Role-based access (`ADMIN`, `EDITOR`, …) |

**Playlist types** include albums, mixes, podcast channels, and releases — because not everything is a 47-track “Chill Vibes” playlist (though we support that too).

---

## Architecture (the short tour)

```mermaid
flowchart LR
  subgraph client
    Web["apps/web\nReact + Vite"]
    SDK["packages/client-sdk\nOpenAPI-generated types"]
  end
  subgraph server
    API["src/\nExpress + OpenAPI validator"]
    DB[(MySQL\nPrisma)]
    FS["uploads/\naudio + images"]
  end
  Web --> SDK
  SDK --> API
  API --> DB
  API --> FS
```

**Contract-first:** `openapi/openapi.yaml` is the source of truth. Change the spec → regenerate the SDK → TypeScript yells if the UI lies. Beautiful.

**Production shape:** one Railway web service serves the API, static uploads, and built SPA; a separate Railway worker service drains queued subtitle jobs through Modal. Railway-ready via `railway.toml` for web and `railway.worker.toml` for the subtitle worker.

---

## Repo map

```
musicpop/                    # you are here
├── apps/web/                # React 19 SPA (Tailwind v4)
├── packages/client-sdk/     # Typed API client from OpenAPI
├── src/                     # Express API routes & libs
├── prisma/                  # Schema, migrations, seed data
├── openapi/openapi.yaml     # The sacred contract
├── railway.toml             # Web deploy config (build → migrate → start API)
└── railway.worker.toml      # Subtitle worker deploy config (build → start worker)
```

---

## Quick start (local)

**You need:** Node 22+, MySQL, and about five minutes.

```bash
# 1. Install
npm ci

# 2. Environment
cp .env.example .env
# Edit DATABASE_URL for your MySQL instance

# 3. Database
npm run prisma:migrate
npm run prisma:seed

# 4. Run API + web together
npm run dev:full
```

| URL | What |
|-----|------|
| http://localhost:5173 | Web app (Vite) |
| http://localhost:4000 | API |
| http://localhost:4000/docs | Swagger UI *(dev only)* |
| http://localhost:4000/api/v1/health | Health + DB probe |

**API-only:** `npm run dev`  
**Web-only:** `npm run web:dev` (proxies `/api` and `/uploads` to port 4000)

---

## Scripts worth knowing

| Command | Does |
|---------|------|
| `npm run dev:full` | API + web, ports cleared first (Windows-friendly) |
| `npm run ci` | What GitHub Actions runs — run before you PR |
| `npm run build:prod` | Prisma generate + API compile + web production build |
| `npm run openapi:types` | Regenerate SDK types from OpenAPI |
| `npm run prisma:seed` | Load demo artists, playlists, and drama |
| `npm run prisma:backfill-subtitles` | Dry-run manual subtitle queue backfill |
| `SUBTITLES_BACKFILL_CONFIRM=QUEUE_SUBTITLES npm run prisma:backfill-subtitles -- --apply` | Explicitly enqueue existing uploaded songs for subtitle work |

---

## Production (Railway)

We ship as two app services plus MySQL: web/API and subtitle worker.

1. Connect this repo to [Railway](https://railway.app).
2. Add the **MySQL** plugin and link `DATABASE_URL`.
3. Set variables:

   | Variable | Value |
   |----------|--------|
   | `NODE_ENV` | `production` |
   | `TRUST_PROXY` | `1` |
   | `VITE_API_BASE_URL` | *(leave empty for same-origin)* |

4. **Mount a volume** at `/app/uploads` on the web service if you care about audio surviving redeploys. (Ephemeral disk is a vibe until it isn’t.)
5. Add a second Railway service from the same repo for subtitles. Use `railway.worker.toml` or set its start command to `npm run subtitles:worker:prod`.

Web deploy pipeline: `build:prod` → `prisma migrate deploy` (release) → `node dist/server.js`. Health check: `/api/v1/health`.

Subtitle worker pipeline: `build:prod` → `node dist/workers/subtitleWorker.js`. It does not run migrations, does not backfill on startup, and does not expose an HTTP API. In production it requires `SUBTITLES_PROVIDER=modal` unless explicitly overridden.

For split Railway services, set `STORAGE_PROVIDER=r2` on the web/API service so new uploads are stored as public R2 URLs. The subtitle worker can then download those URLs from its own service container before posting audio to Modal.

Backfill is manual only. Startup may reset stale `PROCESSING` rows and process existing `QUEUED` rows; upload/create paths are responsible for creating new `QUEUED` subtitle rows.

`/docs` and `/openapi.yaml` are **off in production** unless you set `ENABLE_API_DOCS=1`. Security is also a feature.

---

## Roles & rules

- **LISTENER** — default on register. Listen, favorite, collect.
- **CREATOR** — studio uploads, collections, analytics.
- **EDITOR** / **ADMIN** — moderation and homepage surgery.

Registration always creates `LISTENER` users. No, you cannot `POST /register` with `"role": "ADMIN"`. We’ve been on the internet before.

---

## Tech stack

- **Frontend:** React 19, React Router 7, TanStack Query, Tailwind CSS v4, Vite 6
- **Backend:** Express 4, express-openapi-validator, Multer uploads
- **Data:** Prisma 6 + MySQL
- **Auth:** Bearer sessions (hashed tokens, 30-day TTL)
- **Tooling:** TypeScript, OpenAPI TypeScript, tsup (SDK), GitHub Actions CI

---

## Contributing

```bash
npm run ci
```

If it passes locally, you’re probably fine. If it fails, the OpenAPI spec and you have a disagreement — fix the spec first, then the code, then your pride.

1. Branch from `master`
2. Keep changes focused
3. Regenerate SDK types when you touch `openapi/openapi.yaml` (`npm run openapi:types`)
4. Open a PR

---

## License

Private project (`package.json` → `"private": true`). If you’re reading this on GitHub, you probably already know the deal.

---

<p align="center">
  <strong>Playlisted</strong><br />
  <em>Put a song on it. Put a slug on it. Ship it.</em>
</p>
