# Agent A → Agent B handoff

Backend SDK and REST scaffold are ready for frontend integration.

## Where to look
- OpenAPI spec: `openapi/openapi.yaml`
- Swagger docs: `http://localhost:4000/docs`
- Typed SDK package: `packages/client-sdk`
- SDK generated types: `packages/client-sdk/src/generated/schema.ts`

## Start backend
```bash
npm install
npm run prisma:push
npm run prisma:seed
npm run dev
```

## Available endpoints
### System
- `GET /api/v1/health`

### Homepage
- `GET /api/v1/homepage`

### Users
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/{userId}`

### Playlists
- `GET /api/v1/playlists`
- `POST /api/v1/playlists`
- `GET /api/v1/playlists/{playlistId}`

### Recordings
- `GET /api/v1/recordings`
- `POST /api/v1/recordings`
- `GET /api/v1/recordings/{recordingId}`

## SDK usage
```ts
import { createPlaylistedClient } from "@playlisted/client-sdk";

const client = createPlaylistedClient({
  baseUrl: "http://localhost:4000",
});

const homepage = await client.GET("/api/v1/homepage");
const playlists = await client.GET("/api/v1/playlists", {
  params: { query: { page: 1, pageSize: 10 } },
});
```

## Seeded demo content
Seed adds:
- editorial user
- featured artist
- podcaster
- listener
- album playlist
- podcast channel playlist
- 3 recordings
- homepage features

## Recommended frontend first integrations
1. Homepage sections from `GET /api/v1/homepage`
2. Playlist rails from `GET /api/v1/playlists`
3. Playlist detail page from `GET /api/v1/playlists/{playlistId}`
4. Member page from `GET /api/v1/users/{userId}`
5. Track lists from playlist detail or `GET /api/v1/recordings`

## Next backend work I can do
- auth/session contract
- search endpoint
- favorites/library endpoints
- upload flow + signed URL contract
- homepage personalization
