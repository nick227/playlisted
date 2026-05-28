# @playlisted/client-sdk

Typed API client for the Playlisted backend.

## Build

From the repo root:

```bash
npm run sdk:build
```

## Low-level OpenAPI client

Use this if you want direct access to the generated typed `GET` / `POST` methods.

```ts
import { createPlaylistedClient } from "@playlisted/client-sdk";

const client = createPlaylistedClient({
  baseUrl: "http://localhost:4000",
});

const { data, error } = await client.GET("/api/v1/playlists", {
  params: {
    query: {
      page: 1,
      pageSize: 10,
    },
  },
});
```

## High-level API layer

Use this if you want resource-focused helpers with thrown errors and typed responses.

```ts
import { createPlaylistedApi, PlaylistedApiError } from "@playlisted/client-sdk";

const api = createPlaylistedApi({
  baseUrl: "http://localhost:4000",
});

try {
  const homepage = await api.homepage.get();
  const playlists = await api.playlists.list({ page: 1, pageSize: 10 });
  const playlist = await api.playlists.getById(playlists.data[0].id);

  console.log(homepage.sections.length, playlist.title);
} catch (error) {
  if (error instanceof PlaylistedApiError) {
    console.error(error.status, error.body);
  }
}
```

## Available high-level resources

- `api.health.get()`
- `api.homepage.get()`
- `api.users.list()`
- `api.users.getById(userId)`
- `api.users.create(body)`
- `api.playlists.list()`
- `api.playlists.getById(playlistId)`
- `api.playlists.create(body)`
- `api.recordings.list()`
- `api.recordings.getById(recordingId)`
- `api.recordings.create(body)`
- `api.withOptions({ headers, baseUrl })`

## Source of truth

Types are generated from:

- `openapi/openapi.yaml`
