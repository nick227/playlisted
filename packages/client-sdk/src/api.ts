import type { components, operations } from "./generated/schema";
import { createPlaylistedClient, type PlaylistedClientOptions, type RawPlaylistedClient } from "./core.js";

export type HealthResponse = components["schemas"]["HealthResponse"];
export type HomepageResponse = components["schemas"]["HomepageResponse"];
export type UserListResponse = components["schemas"]["UserListResponse"];
export type UserDetail = components["schemas"]["UserDetail"];
export type PlaylistListResponse = components["schemas"]["PlaylistListResponse"];
export type PlaylistDetail = components["schemas"]["PlaylistDetail"];
export type RecordingListResponse = components["schemas"]["RecordingListResponse"];
export type RecordingDetail = components["schemas"]["RecordingDetail"];
export type ErrorResponse = components["schemas"]["ErrorResponse"];

export type CreateUserRequest = components["schemas"]["CreateUserRequest"];
export type CreatePlaylistRequest = components["schemas"]["CreatePlaylistRequest"];
export type CreateRecordingRequest = components["schemas"]["CreateRecordingRequest"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type AuthResponse = components["schemas"]["AuthResponse"];
export type AuthUser = components["schemas"]["AuthUser"];
export type MeResponse = components["schemas"]["MeResponse"];

export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"];
export type UpdatePlaylistRequest = components["schemas"]["UpdatePlaylistRequest"];
export type CreatePlaybackEventRequest = components["schemas"]["CreatePlaybackEventRequest"];
export type PlaybackHistoryResponse = components["schemas"]["PlaybackHistoryResponse"];
export type PlaybackEventCreated = components["schemas"]["PlaybackEventCreated"];
export type UsernameAvailabilityResponse = components["schemas"]["UsernameAvailabilityResponse"];

export type ChartRange = components["schemas"]["ChartRange"];
export type TopSongsResponse = components["schemas"]["TopSongsResponse"];
export type TopPlaylistsResponse = components["schemas"]["TopPlaylistsResponse"];
export type TopArtistsResponse = components["schemas"]["TopArtistsResponse"];
export type TopSongItem = components["schemas"]["TopSongItem"];
export type TopPlaylistItem = components["schemas"]["TopPlaylistItem"];
export type TopArtistItem = components["schemas"]["TopArtistItem"];
export type AnalyticsSummaryResponse = components["schemas"]["AnalyticsSummaryResponse"];
export type AnalyticsRecordingsResponse = components["schemas"]["AnalyticsRecordingsResponse"];
export type FavoriteRecordingItem = components["schemas"]["FavoriteRecordingItem"];
export type FavoriteRecordingsResponse = components["schemas"]["FavoriteRecordingsResponse"];
export type MostPlayedItem = components["schemas"]["MostPlayedItem"];
export type MostPlayedResponse = components["schemas"]["MostPlayedResponse"];
export type RecentlyPlayedItem = components["schemas"]["RecentlyPlayedItem"];
export type RecentlyPlayedResponse = components["schemas"]["RecentlyPlayedResponse"];
export type LibraryGenre = components["schemas"]["LibraryGenre"];
export type LibrarySong = components["schemas"]["LibrarySong"];
export type LibraryGenresResponse = components["schemas"]["LibraryGenresResponse"];
export type LibrarySongsResponse = components["schemas"]["LibrarySongsResponse"];

export type ListUsersQuery = NonNullable<operations["listUsers"]["parameters"]["query"]>;
export type ListPlaylistsQuery = NonNullable<operations["listPlaylists"]["parameters"]["query"]>;
export type ListRecordingsQuery = NonNullable<operations["listRecordings"]["parameters"]["query"]>;

export type ChartsQuery = { range?: ChartRange; limit?: number };
export type AnalyticsQuery = { range?: ChartRange };
export type AnalyticsRecordingsQuery = { range?: ChartRange; sortBy?: "plays" | "duration" | "completion"; order?: "asc" | "desc"; page?: number; pageSize?: number };

export interface PlaylistedApi {
  readonly raw: RawPlaylistedClient;
  withOptions(options: Partial<PlaylistedClientOptions>): PlaylistedApi;
  auth: {
    register(body: RegisterRequest): Promise<AuthResponse>;
    login(body: LoginRequest): Promise<AuthResponse>;
    me(): Promise<MeResponse>;
    logout(): Promise<void>;
  };
  health: {
    get(): Promise<HealthResponse>;
  };
  homepage: {
    get(): Promise<HomepageResponse>;
  };
  users: {
    list(query?: ListUsersQuery): Promise<UserListResponse>;
    getById(userId: string): Promise<UserDetail>;
    getByUsername(username: string): Promise<UserDetail>;
    getPlaylistByUsernameAndSlug(username: string, slug: string): Promise<PlaylistDetail>;
    checkUsername(username: string): Promise<UsernameAvailabilityResponse>;
    updateMe(body: UpdateProfileRequest): Promise<UserDetail>;
    create(body: CreateUserRequest): Promise<UserDetail>;
  };
  me: {
    playlists(): Promise<PlaylistListResponse>;
    recordings(): Promise<RecordingListResponse>;
    playbackHistory(): Promise<PlaybackHistoryResponse>;
    recordPlayback(body: CreatePlaybackEventRequest): Promise<PlaybackEventCreated>;
    favoriteRecordings(query?: { page?: number; pageSize?: number }): Promise<FavoriteRecordingsResponse>;
    addFavorite(recordingId: string): Promise<{ id: string; recordingId: string; savedAt: string }>;
    removeFavorite(recordingId: string): Promise<void>;
    mostPlayed(query?: { limit?: number }): Promise<MostPlayedResponse>;
    recentlyPlayed(query?: { limit?: number }): Promise<RecentlyPlayedResponse>;
  };
  playlists: {
    list(query?: ListPlaylistsQuery): Promise<PlaylistListResponse>;
    getById(playlistId: string): Promise<PlaylistDetail>;
    create(body: CreatePlaylistRequest): Promise<PlaylistDetail>;
    update(playlistId: string, body: UpdatePlaylistRequest): Promise<PlaylistDetail>;
    delete(playlistId: string): Promise<void>;
    addItem(playlistId: string, recordingId: string): Promise<PlaylistDetail>;
    removeItem(playlistId: string, recordingId: string): Promise<PlaylistDetail>;
    reorderItems(playlistId: string, recordingIds: string[]): Promise<PlaylistDetail>;
  };
  recordings: {
    list(query?: ListRecordingsQuery): Promise<RecordingListResponse>;
    getById(recordingId: string): Promise<RecordingDetail>;
    create(body: CreateRecordingRequest): Promise<RecordingDetail>;
  };
  charts: {
    topSongs(query?: ChartsQuery): Promise<TopSongsResponse>;
    topPlaylists(query?: ChartsQuery): Promise<TopPlaylistsResponse>;
    topArtists(query?: ChartsQuery): Promise<TopArtistsResponse>;
  };
  analytics: {
    summary(query?: AnalyticsQuery): Promise<AnalyticsSummaryResponse>;
    recordings(query?: AnalyticsRecordingsQuery): Promise<AnalyticsRecordingsResponse>;
  };
  library: {
    genres(): Promise<LibraryGenresResponse>;
    songs(query?: { genre?: string; page?: number; pageSize?: number }): Promise<LibrarySongsResponse>;
  };
}

export class PlaylistedApiError<TError = ErrorResponse> extends Error {
  readonly name = "PlaylistedApiError";

  constructor(
    message: string,
    readonly status: number,
    readonly response: Response,
    readonly body?: TError,
  ) {
    super(message);
  }
}

type RequestResult<TData, TError = ErrorResponse> = Promise<{
  data?: TData;
  error?: TError;
  response: Response;
}>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorField<T>(value: T, key: string): unknown {
  if (!isObject(value) || !(key in value)) {
    return undefined;
  }

  return value[key];
}

function appendHeaders(target: Headers, headers?: PlaylistedClientOptions["headers"]): void {
  if (!headers) {
    return;
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      target.set(key, value);
    });

    return;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      target.set(key, value);
    }

    return;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (value == null) {
      continue;
    }

    target.set(key, Array.isArray(value) ? value.map(String).join(", ") : String(value));
  }
}

function mergeOptions(
  base: PlaylistedClientOptions,
  overrides: Partial<PlaylistedClientOptions>,
): PlaylistedClientOptions {
  const mergedHeaders = new Headers();

  appendHeaders(mergedHeaders, base.headers);
  appendHeaders(mergedHeaders, overrides.headers);

  const hasHeaders = Array.from(mergedHeaders.keys()).length > 0;

  return {
    ...base,
    ...overrides,
    headers: hasHeaders ? mergedHeaders : undefined,
  };
}

async function unwrap<TData, TError = ErrorResponse>(
  request: RequestResult<TData, TError>,
  fallbackMessage: string,
): Promise<TData> {
  const { data, error, response } = await request;

  if (response.ok) {
    return data as TData;
  }

  const errorMessage = getErrorField(error, "message");
  const errorCode = getErrorField(error, "error");
  const message =
    typeof errorMessage === "string"
      ? errorMessage
      : typeof errorCode === "string"
        ? errorCode
        : fallbackMessage;

  throw new PlaylistedApiError(message, response.status, response, error);
}

export function createPlaylistedApi(options: PlaylistedClientOptions = {}): PlaylistedApi {
  const raw = createPlaylistedClient(options);

  return {
    raw,
    withOptions(nextOptions) {
      return createPlaylistedApi(mergeOptions(options, nextOptions));
    },
    auth: {
      register(body) {
        return unwrap(raw.POST("/api/v1/auth/register", { body }), "Registration failed.");
      },
      login(body) {
        return unwrap(raw.POST("/api/v1/auth/login", { body }), "Login failed.");
      },
      me() {
        return unwrap(raw.GET("/api/v1/auth/me"), "Failed to load current user.");
      },
      logout() {
        return unwrap(raw.POST("/api/v1/auth/logout", {}), "Logout failed.").then(() => undefined);
      },
    },
    health: {
      get() {
        return unwrap(raw.GET("/api/v1/health"), "Failed to load API health.");
      },
    },
    homepage: {
      get() {
        return unwrap(raw.GET("/api/v1/homepage"), "Failed to load homepage.");
      },
    },
    users: {
      list(query = {}) {
        return unwrap(
          raw.GET("/api/v1/users", {
            params: { query },
          }),
          "Failed to list users.",
        );
      },
      getById(userId) {
        return unwrap(
          raw.GET("/api/v1/users/{userId}", {
            params: { path: { userId } },
          }),
          `Failed to load user ${userId}.`,
        );
      },
      create(body) {
        return unwrap(
          raw.POST("/api/v1/users", { body }),
          "Failed to create user.",
        );
      },
      getByUsername(username) {
        return unwrap(
          raw.GET("/api/v1/users/by-username/{username}", {
            params: { path: { username } },
          }),
          `Failed to load user @${username}.`,
        );
      },
      getPlaylistByUsernameAndSlug(username, slug) {
        return unwrap(
          raw.GET("/api/v1/users/by-username/{username}/playlists/{slug}", {
            params: { path: { username, slug } },
          }),
          `Failed to load playlist @${username}/${slug}.`,
        );
      },
      checkUsername(username) {
        return unwrap(
          raw.GET("/api/v1/users/check-username", {
            params: { query: { username } },
          }),
          "Failed to check username.",
        );
      },
      updateMe(body) {
        return unwrap(
          raw.PATCH("/api/v1/users/me", { body }),
          "Failed to update profile.",
        );
      },
    },
    me: {
      playlists() {
        return unwrap(raw.GET("/api/v1/me/playlists"), "Failed to load your playlists.");
      },
      recordings() {
        return unwrap(raw.GET("/api/v1/me/recordings"), "Failed to load your uploads.");
      },
      playbackHistory() {
        return unwrap(raw.GET("/api/v1/me/playback-history"), "Failed to load play history.");
      },
      recordPlayback(body) {
        return unwrap(
          raw.POST("/api/v1/me/playback-events", { body }),
          "Failed to record playback.",
        );
      },
      favoriteRecordings(query = {}) {
        return unwrap(
          raw.GET("/api/v1/me/favorites/recordings", { params: { query } }),
          "Failed to load favorites.",
        );
      },
      addFavorite(recordingId) {
        return unwrap(
          raw.POST("/api/v1/me/favorites/recordings/{recordingId}", {
            params: { path: { recordingId } },
          }),
          "Failed to add favorite.",
        );
      },
      removeFavorite(recordingId) {
        return unwrap(
          raw.DELETE("/api/v1/me/favorites/recordings/{recordingId}", {
            params: { path: { recordingId } },
          }),
          "Failed to remove favorite.",
        ).then(() => undefined);
      },
      mostPlayed(query = {}) {
        return unwrap(
          raw.GET("/api/v1/me/most-played", { params: { query } }),
          "Failed to load most played.",
        );
      },
      recentlyPlayed(query = {}) {
        return unwrap(
          raw.GET("/api/v1/me/recently-played", { params: { query } }),
          "Failed to load recently played.",
        );
      },
    },
    playlists: {
      list(query = {}) {
        return unwrap(
          raw.GET("/api/v1/playlists", {
            params: { query },
          }),
          "Failed to list playlists.",
        );
      },
      getById(playlistId) {
        return unwrap(
          raw.GET("/api/v1/playlists/{playlistId}", {
            params: { path: { playlistId } },
          }),
          `Failed to load playlist ${playlistId}.`,
        );
      },
      create(body) {
        return unwrap(
          raw.POST("/api/v1/playlists", { body }),
          "Failed to create playlist.",
        );
      },
      update(playlistId, body) {
        return unwrap(
          raw.PATCH("/api/v1/playlists/{playlistId}", {
            params: { path: { playlistId } },
            body,
          }),
          `Failed to update playlist ${playlistId}.`,
        );
      },
      delete(playlistId) {
        return unwrap(
          raw.DELETE("/api/v1/playlists/{playlistId}", {
            params: { path: { playlistId } },
          }),
          `Failed to delete playlist ${playlistId}.`,
        ).then(() => undefined);
      },
      addItem(playlistId, recordingId) {
        return unwrap(
          raw.POST("/api/v1/playlists/{playlistId}/items", {
            params: { path: { playlistId } },
            body: { recordingId },
          }),
          "Failed to add track.",
        );
      },
      removeItem(playlistId, recordingId) {
        return unwrap(
          raw.DELETE("/api/v1/playlists/{playlistId}/items/{recordingId}", {
            params: { path: { playlistId, recordingId } },
          }),
          "Failed to remove track.",
        );
      },
      reorderItems(playlistId, recordingIds) {
        return unwrap(
          raw.PUT("/api/v1/playlists/{playlistId}/items/reorder", {
            params: { path: { playlistId } },
            body: { recordingIds },
          }),
          "Failed to reorder tracks.",
        );
      },
    },
    recordings: {
      list(query = {}) {
        return unwrap(
          raw.GET("/api/v1/recordings", {
            params: { query },
          }),
          "Failed to list recordings.",
        );
      },
      getById(recordingId) {
        return unwrap(
          raw.GET("/api/v1/recordings/{recordingId}", {
            params: { path: { recordingId } },
          }),
          `Failed to load recording ${recordingId}.`,
        );
      },
      create(body) {
        return unwrap(
          raw.POST("/api/v1/recordings", { body }),
          "Failed to create recording.",
        );
      },
    },
    charts: {
      topSongs(query = {}) {
        return unwrap(
          raw.GET("/api/v1/charts/top-songs", { params: { query } }),
          "Failed to load top songs.",
        );
      },
      topPlaylists(query = {}) {
        return unwrap(
          raw.GET("/api/v1/charts/top-playlists", { params: { query } }),
          "Failed to load top playlists.",
        );
      },
      topArtists(query = {}) {
        return unwrap(
          raw.GET("/api/v1/charts/top-artists", { params: { query } }),
          "Failed to load top artists.",
        );
      },
    },
    analytics: {
      summary(query = {}) {
        return unwrap(
          raw.GET("/api/v1/me/analytics/summary", { params: { query } }),
          "Failed to load analytics summary.",
        );
      },
      recordings(query = {}) {
        return unwrap(
          raw.GET("/api/v1/me/analytics/recordings", { params: { query } }),
          "Failed to load recording analytics.",
        );
      },
    },
    library: {
      genres() {
        return unwrap(raw.GET("/api/v1/library/genres"), "Failed to load genres.");
      },
      songs(query = {}) {
        return unwrap(
          raw.GET("/api/v1/library/songs", { params: { query } }),
          "Failed to load library songs.",
        );
      },
    },
  };
}
