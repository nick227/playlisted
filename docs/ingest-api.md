# Playlisted Ingest API

The Ingest API lets technical creators bulk-upload audio, images, playlists, and recordings into their Playlisted account. It is designed for scripts, automation pipelines, and the future desktop sync client.

**Base URL:** `https://your-playlisted-instance.com` (or `http://localhost:4000` for local dev)

---

## Authentication

All Ingest API requests require a **Bearer API key** in the `Authorization` header.

```
Authorization: Bearer plt_your_key_here
```

API keys are scoped to your account. Requests act on behalf of the key owner — you can only create, update, or read resources that belong to you.

**Session tokens (from the web app login) are explicitly rejected by ingest routes.** Use an API key.

### Creating an API key

1. Log in to Playlisted
2. Go to **Studio → API Keys**
3. Click **Create**, give the key a name (e.g. `desktop-sync`)
4. **Copy the key immediately** — it is shown only once

### Rate limits

| Endpoint group | Limit |
|---|---|
| Key management (`/developer/keys`) | 30 requests / 15 min |
| Ingest uploads | 200 requests / hour |
| Ingest metadata (playlists, recordings) | Standard |

Rate limit headers are included in every response (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).

---

## Key concepts

### externalSource and externalId

Every ingest endpoint accepts `externalSource` and `externalId`. These two fields together form the **upsert key** for your content.

| Field | Purpose | Example |
|---|---|---|
| `externalSource` | Identifies the system that owns the original record | `"desktop-sync"`, `"serato"`, `"ableton"` |
| `externalId` | Unique ID within that system | `"album-night-signals"`, `"track-01-neon-window"` |

**Upsert semantics:**
- First call with a given `externalSource + externalId` → **creates** the resource (HTTP 201, `"created": true`)
- Subsequent calls with the same pair → **updates** the resource (HTTP 200, `"created": false`)
- Different users can have the same `externalSource + externalId` — scoping is always by owner

This means your sync script can safely re-run without creating duplicates.

### uploadId

When you upload a file, you get back an `uploadId` (e.g. `upl_abc123`). Pass this `uploadId` when creating playlists or recordings to reference the asset. The server resolves the URL from the ID and verifies it belongs to you.

---

## Endpoints

### Upload a file

```
POST /api/v1/ingest/uploads?kind=audio|image
Content-Type: multipart/form-data
Authorization: Bearer plt_…

file=<binary>
```

**Query params:**

| Param | Required | Values |
|---|---|---|
| `kind` | Yes | `audio` or `image` |

**Allowed types:**

| kind | Extensions | MIME types |
|---|---|---|
| `audio` | `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.aac`, `.webm` | `audio/mpeg`, `audio/wav`, `audio/mp4`, `audio/flac`, `audio/ogg`, `audio/aac`, `audio/webm` |
| `image` | `.jpg`, `.jpeg`, `.png`, `.webp` | `image/jpeg`, `image/png`, `image/webp` |

**Size limits:** 100 MB audio, 15 MB image.

**Response 201:**
```json
{
  "uploadId": "upl_7f3a…",
  "url": "/uploads/audio/my-track-a1b2c3d4.mp3",
  "kind": "audio",
  "mimeType": "audio/mpeg",
  "bytes": 8421376,
  "originalName": "my-track.mp3"
}
```

Save `uploadId` — you will pass it to the playlist/recording upsert endpoints.

**Errors:**

| Status | `error` | Cause |
|---|---|---|
| `400` | `invalid_kind` | `kind` query param missing or not `audio`/`image` |
| `400` | `file_required` | No `file` field in multipart body |
| `413` | `file_too_large` | File exceeds 100 MB |
| `415` | `unsupported_media_type` | Extension or MIME type not in allowlist |

---

### Upsert a playlist

```
POST /api/v1/ingest/playlists
Content-Type: application/json
Authorization: Bearer plt_…
```

**Request body:**
```json
{
  "externalSource": "desktop-sync",
  "externalId":     "album-night-signals",
  "title":          "Night Signals",
  "description":    "Late-night electronic demos.",
  "visibility":     "PRIVATE",
  "type":           "PLAYLIST",
  "coverUploadId":  "upl_img…"
}
```

| Field | Required | Notes |
|---|---|---|
| `externalSource` | Yes | Stable source identifier |
| `externalId` | Yes | Unique within your source system |
| `title` | Yes | 1–191 characters |
| `description` | No | |
| `visibility` | No | `PUBLIC`, `UNLISTED`, or `PRIVATE`. **Defaults to `PRIVATE`** |
| `type` | No | `PLAYLIST`, `ALBUM`, `MIX`, etc. Defaults to `PLAYLIST` |
| `coverUploadId` | No | `uploadId` from a `kind=image` upload belonging to you |

**Response 201 (created) / 200 (updated):**
```json
{
  "created": true,
  "playlist": {
    "id":             "cl…",
    "title":          "Night Signals",
    "slug":           "night-signals",
    "visibility":     "PRIVATE",
    "status":         "DRAFT",
    "externalSource": "desktop-sync",
    "externalId":     "album-night-signals",
    "createdAt":      "2026-05-29T00:00:00.000Z",
    "updatedAt":      "2026-05-29T00:00:00.000Z"
  }
}
```

Playlists are created with `status: "DRAFT"`. Publish them from the Studio UI when ready.

---

### Upsert a recording

```
POST /api/v1/ingest/recordings
Content-Type: application/json
Authorization: Bearer plt_…
```

**Request body:**
```json
{
  "externalSource":    "desktop-sync",
  "externalId":        "track-01-neon-window",
  "playlistExternalId":"album-night-signals",
  "title":             "Neon Window",
  "audioUploadId":     "upl_audio…",
  "coverUploadId":     "upl_img…",
  "trackNumber":       1,
  "durationSeconds":   214.5
}
```

| Field | Required | Notes |
|---|---|---|
| `externalSource` | Yes | Must match the playlist's `externalSource` |
| `externalId` | Yes | Unique within your source system |
| `playlistExternalId` | Yes | `externalId` of the target playlist (must already exist under this `externalSource` for your account) |
| `title` | Yes | |
| `audioUploadId` | Yes | `uploadId` from a `kind=audio` upload belonging to you |
| `coverUploadId` | No | `uploadId` from a `kind=image` upload belonging to you |
| `trackNumber` | No | Integer ≥ 1 |
| `durationSeconds` | No | Decimal seconds |
| `description` | No | |

**Validation rules:**
- `audioUploadId` must have `kind=audio` — passing an image upload ID returns `400 upload_kind_mismatch`
- `coverUploadId` must have `kind=image` — passing an audio upload ID returns `400 upload_kind_mismatch`
- Both upload assets must belong to your account — foreign assets return `403 upload_forbidden`
- The playlist identified by `playlistExternalId` must belong to your account — returns `404 playlist_not_found` otherwise

On **update**, the recording's existing playlist association is preserved — no duplicate `PlaylistItem` is created.

**Response 201 / 200:**
```json
{
  "created": true,
  "recording": {
    "id":             "cl…",
    "uploaderId":     "cl…",
    "playlistId":     "cl…",
    "title":          "Neon Window",
    "audioUrl":       "/uploads/audio/neon-window-a1b2c3d4.mp3",
    "externalSource": "desktop-sync",
    "externalId":     "track-01-neon-window",
    "createdAt":      "2026-05-29T00:00:00.000Z",
    "updatedAt":      "2026-05-29T00:00:00.000Z"
  }
}
```

---

### List uploads

```
GET /api/v1/ingest/uploads?kind=audio&page=1&pageSize=50
Authorization: Bearer plt_…
```

**Query params:** `kind` (`audio`|`image`), `page`, `pageSize` (max 100).

**Response 200:**
```json
{
  "data": [
    {
      "uploadId":    "upl_…",
      "kind":        "audio",
      "url":         "/uploads/audio/track.mp3",
      "mimeType":    "audio/mpeg",
      "bytes":       8421376,
      "originalName":"track.mp3",
      "status":      "READY",
      "createdAt":   "2026-05-29T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 50, "total": 12 }
}
```

---

### List playlists

```
GET /api/v1/ingest/playlists?externalSource=desktop-sync&externalId=album-night-signals
Authorization: Bearer plt_…
```

**Query params:** `externalSource`, `externalId`, `page`, `pageSize` (max 100).

Use `externalSource` to fetch your full remote inventory for a given sync source. Use `externalId` for single-item reconciliation — checking whether a specific local record already exists remotely.

**Response 200:** `{ data: IngestPlaylistData[], meta: { page, pageSize, total } }`

---

### List recordings

```
GET /api/v1/ingest/recordings?externalSource=desktop-sync&externalId=track-01
Authorization: Bearer plt_…
```

**Query params:** `externalSource`, `externalId`, `playlistId`, `page`, `pageSize` (max 100).

**Response 200:** `{ data: IngestRecordingData[], meta: { page, pageSize, total } }`

---

## Common error shape

All error responses use this shape:

```json
{
  "error": "error_code",
  "message": "Human-readable description."
}
```

| `error` | Status | Meaning |
|---|---|---|
| `unauthorized` | 401 | Missing or invalid API key |
| `upload_not_found` | 404 | `uploadId` does not exist |
| `upload_forbidden` | 403 | `uploadId` belongs to a different account |
| `upload_kind_mismatch` | 400 | Used an audio upload as a cover, or vice versa |
| `playlist_not_found` | 404 | `playlistExternalId` not found for your account under this `externalSource` |
| `invalid_kind` | 400 | `kind` query param missing or invalid |
| `file_required` | 400 | No `file` field in multipart body |
| `file_too_large` | 413 | File exceeds 100 MB |
| `unsupported_media_type` | 415 | File extension or MIME type not in allowlist |
| `rate_limited` | 429 | Too many requests — back off and retry |

---

## Upload flow note

The current upload endpoint (`POST /api/v1/ingest/uploads`) routes files **through the app server**. This is intentional for v1 — it keeps the implementation simple and works well for scripts and moderate-volume syncing.

A future milestone will replace this with a **presigned-URL intent flow**: your client requests an upload token, uploads directly to object storage, then registers the asset. If you are building a desktop sync client, design around `uploadId` references (not URLs) so the storage backend can be swapped without breaking your client.
