# Subtitles Pipeline

**Status:** Current  
**Scope:** Server-side subtitle generation, storage, API, and client consumption.  
**Client display:** see [`playback-focus.md`](./playback-focus.md).

---

## Overview

Subtitles are generated asynchronously after audio upload. The web API queues jobs; a separate worker service transcribes audio and stores timed segments. The React client fetches segments and renders them in the playback focus lane.

```mermaid
flowchart LR
  Upload[Upload / create recording] --> Queue[RecordingSubtitle QUEUED]
  Queue --> Worker[Subtitle worker]
  Worker --> Modal[Modal Whisper / local provider]
  Modal --> Ready[status READY + segments]
  Ready --> API[GET /recordings/:id/subtitles]
  API --> Client[PlaybackFocusLane]
```

---

## Data model

`RecordingSubtitle` (Prisma) — one or more rows per recording:

| Field | Notes |
|-------|-------|
| `status` | `QUEUED` → `PROCESSING` → `READY` \| `FAILED` |
| `segments` | JSON array of `{ start, end, text }` (seconds) |
| `vttText` | WebVTT fallback; segments derived if JSON empty |
| `isActive` | Preferred row when multiple exist |
| `source` | e.g. `WHISPER` for manual/provider attribution |

`Recording.subtitlesDisabled` — when true, API returns `{ status: 'DISABLED' }` and no generation is attempted.

---

## When jobs are queued

`isSubtitleGenerationEnabled()` returns true when `SUBTITLES_ENABLED !== 'false'` and `SUBTITLES_PROVIDER !== 'disabled'`.

QUEUED rows are created on:

- Recording create (`src/routes/recordings.ts`)
- Upload flows (`src/routes/uploads.ts`)
- Ingest updates when audio changes (`src/routes/ingest/recordings.ts`)

**Web/API must not run transcription in production.** Railway web keeps `SUBTITLES_PROVIDER=disabled`; it only queues rows.

---

## Worker service

**Entry:** `npm run subtitles:worker:prod`  
**Source:** `src/workers/subtitleWorker.ts`  
**Deploy:** separate Railway service via `railway.worker.toml`

### Loop

1. `failStaleProcessingRows()` — rows stuck in `PROCESSING` past staleness window → `FAILED`
2. Claim oldest `QUEUED` row (`QUEUED` → `PROCESSING`, atomic `updateMany`)
3. Prepare audio file from recording URL
4. `runSubtitleProvider()` — Modal, local-python, or whisper
5. Write `segments`, `vttText`, `status: READY` or `FAILED`

**One-shot semantics:** a row never returns to `QUEUED`. Outcomes are only `READY` or `FAILED`.

### Key environment variables

| Variable | Purpose |
|----------|---------|
| `SUBTITLES_PROVIDER` | `modal` (prod), `local-python`, `whisper`, or `disabled` |
| `SUBTITLES_ENABLED` | Master enable for queueing + worker |
| `SUBTITLES_WORKER_REQUIRE_MODAL` | Enforce Modal in production |
| `SUBTITLES_WORKER_SLEEP_MS` | Poll interval between jobs (default 10000) |
| `SUBTITLES_MAX_AUDIO_SECONDS` | Skip/over-limit guard (default 900) |
| `SUBTITLES_WHISPER_MODEL` | Model name passed to provider |
| `MODAL_SUBTITLES_URL` | Modal endpoint |
| `MODAL_SUBTITLES_TOKEN` | Shared bearer secret |
| `SUBTITLES_MODAL_DAILY_MAX_JOBS` | Rate cap |
| `SUBTITLES_MODAL_MONTHLY_BUDGET_CENTS` | Budget cap |

See [`railway-go-live.md`](./railway-go-live.md) for full Railway setup and [`modal/README.md`](../modal/README.md) for Modal deploy.

---

## API

### `GET /api/v1/recordings/:recordingId/subtitles`

Returns subtitle status and payload for the active row.

| Status | Response |
|--------|----------|
| `MISSING` | No subtitle row exists |
| `DISABLED` | `recording.subtitlesDisabled` |
| `QUEUED` / `PROCESSING` | Job in flight (client polls) |
| `READY` | `segments`, `vttText`, style fields |
| `FAILED` | Generic error for viewers; raw error for uploader/admin |

Stale `QUEUED`/`PROCESSING` rows are failed at read time via `failSubtitleIfStale()` (same staleness window as worker).

Access is gated by recording and playlist visibility (`canViewerAccessRecording`, `canViewerAccessPlaylist`).

### Transcript editing

`src/routes/transcripts.ts` — CRUD for manual transcript upload/edit. Validates timed cue format. Respects `subtitlesDisabled`.

### Recording patch

`PATCH /recordings/:id` accepts `subtitlesDisabled` to toggle per-recording subtitle display.

---

## Client consumption

**Fetch:** `apps/web/src/lib/subtitles.ts` → `fetchRecordingSubtitles(recordingId, accessToken)`

**Display:** `PlaybackFocusLane` polls while `QUEUED`/`PROCESSING`, then passes `segments` to `resolvePlaybackFocusFixture()`.

**User toggle:** `subtitleDisplay.ts` — `playlisted:subtitles-enabled` in localStorage.

**Events:**

| Event | Purpose |
|-------|---------|
| `playlisted:recording-subtitles-disabled-changed` | Invalidate cache when uploader toggles subtitles |
| `playlisted:recording-subtitle-style-changed` | Position/style update |

**Style:** per-recording `subtitlePosition` and `subtitleStyleId`; custom styles via `useRecordingSubtitleStyle`.

---

## Backfill (manual only)

Never runs on deploy. For existing recordings missing subtitle rows:

```bash
# Dry run
npm run prisma:backfill-subtitles

# Queue eligible rows
SUBTITLES_BACKFILL_CONFIRM=QUEUE_SUBTITLES npm run prisma:backfill-subtitles -- --apply

# Re-queue failed
SUBTITLES_BACKFILL_CONFIRM=QUEUE_SUBTITLES npm run prisma:backfill-subtitles -- --failed --apply
```

Only queues local `/uploads/...` URLs and URLs under configured public base URLs.

---

## Segment format

```ts
type SubtitleSegment = {
  start: number;  // seconds
  end: number;    // seconds
  text: string;
};
```

VTT is stored for download/export (`downloadRecordingTranscript`). API prefers JSON `segments`; falls back to parsing `vttText` if segments array is empty.

---

## Related docs

- [`playback-focus.md`](./playback-focus.md) — focus lane, synthetic cues, timing
- [`railway-go-live.md`](./railway-go-live.md) — deploy env vars
- [`modal/README.md`](../modal/README.md) — Modal POC deploy
