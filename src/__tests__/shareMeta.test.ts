import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    playlist: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    recording: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";
import { escapeHtml, injectShareMeta, safeJsonLd } from "../share/injectShareMeta.js";
import { resolveShareMeta, shareOriginsFromOrigin } from "../share/shareMeta.js";
import { pickShareImage, toAbsoluteUrl } from "../share/shareImages.js";

const ORIGIN = "https://playlisted.com";
const ORIGINS = shareOriginsFromOrigin(ORIGIN);
const app = createApp({ skipWeb: true });

const TEMPLATE = `<!doctype html>
<html>
  <head>
    <title>__META_TITLE__</title>
    <meta name="description" content="__META_DESCRIPTION__" />
    <link rel="canonical" href="__META_CANONICAL_URL__" />
    <meta property="og:title" content="__META_TITLE__" />
    <meta property="og:description" content="__META_DESCRIPTION__" />
    <meta property="og:type" content="__META_TYPE__" />
    <meta property="og:url" content="__META_URL__" />
    <meta property="og:image" content="__META_IMAGE__" />
    <meta property="og:image:alt" content="__META_IMAGE_ALT__" />
    <meta name="twitter:title" content="__META_TWITTER_TITLE__" />
    <meta name="twitter:description" content="__META_TWITTER_DESCRIPTION__" />
    <meta name="twitter:image" content="__META_TWITTER_IMAGE__" />
    <script type="application/ld+json" id="share-json-ld">__META_JSON_LD__</script>
  </head>
  <body></body>
</html>`;

describe("share image helpers", () => {
  it("converts relative upload URLs to absolute", () => {
    expect(toAbsoluteUrl("/uploads/images/cover.jpg", ORIGIN)).toBe(
      "https://playlisted.com/uploads/images/cover.jpg",
    );
  });

  it("keeps absolute URLs unchanged", () => {
    expect(toAbsoluteUrl("https://cdn.example.com/a.jpg", ORIGIN)).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });

  it("falls back to default OG image", () => {
    expect(pickShareImage(ORIGIN, null, undefined)).toBe(
      "https://playlisted.com/og/playlisted-default.jpg",
    );
  });
});

describe("injectShareMeta", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`Play "Rock" & <Roll>`)).toBe("Play &quot;Rock&quot; &amp; &lt;Roll&gt;");
  });

  it("injects metadata into placeholders", async () => {
    const meta = await resolveShareMeta("/", ORIGINS);
    const html = injectShareMeta(TEMPLATE, meta);

    expect(html).toContain("<title>Playlisted — Music charts and curated playlists for independent artists</title>");
    expect(html).toContain('content="https://playlisted.com/og/playlisted-default.jpg"');
    expect(html).not.toContain("__META_TITLE__");
  });

  it("emits valid JSON-LD", async () => {
    const meta = await resolveShareMeta("/privacy", ORIGINS);
    const html = injectShareMeta(TEMPLATE, meta);
    const match = html.match(/<script[^>]*id="share-json-ld"[^>]*>\s*([\s\S]*?)\s*<\/script>/);
    expect(match?.[1]).toBeTruthy();
    expect(() => JSON.parse(match![1]!)).not.toThrow();
    expect(safeJsonLd({ name: "<script>" })).not.toContain("<script>");
  });
});

describe("resolveShareMeta", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.playlist.findFirst).mockReset();
    vi.mocked(prisma.playlist.findUnique).mockReset();
    vi.mocked(prisma.recording.findUnique).mockReset();
  });

  it("returns homepage metadata", async () => {
    const meta = await resolveShareMeta("/", ORIGINS);
    expect(meta.title).toContain("Playlisted");
    expect(meta.image).toBe("https://playlisted.com/og/playlisted-default.jpg");
    expect(meta.type).toBe("website");
  });

  it("returns artist metadata with avatar", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      username: "artist",
      displayName: "Artist Name",
      bio: "Indie producer",
      avatarUrl: "/uploads/images/avatar.jpg",
      heroImageUrl: null,
      status: "ACTIVE",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);

    const meta = await resolveShareMeta("/@/artist", ORIGINS);
    expect(meta.title).toBe("Artist Name (@artist) — Playlisted");
    expect(meta.description).toBe("Indie producer");
    expect(meta.image).toBe("https://playlisted.com/uploads/images/avatar.jpg");
    expect(meta.type).toBe("profile");
  });

  it("uses artist fallback image when avatar is missing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      username: "artist",
      displayName: "Artist Name",
      bio: null,
      avatarUrl: null,
      heroImageUrl: null,
      status: "ACTIVE",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);

    const meta = await resolveShareMeta("/@/artist", ORIGINS);
    expect(meta.image).toBe("https://playlisted.com/og/playlisted-artist-default.jpg");
    expect(meta.description).toContain("Listen to Artist Name");
  });

  it("returns playlist metadata with cover art", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
      id: "p1",
      title: "Best Songs",
      description: "A great mix",
      coverArtUrl: "/uploads/images/cover.jpg",
      ownerId: "u1",
      visibility: "PUBLIC",
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      owner: {
        id: "u1",
        username: "artist",
        displayName: "Artist Name",
        avatarUrl: "/uploads/images/avatar.jpg",
      },
    } as never);

    const meta = await resolveShareMeta("/@/artist/best-songs", ORIGINS);
    expect(meta.title).toBe("Best Songs by Artist Name — Playlisted");
    expect(meta.description).toBe("A great mix");
    expect(meta.image).toBe("https://playlisted.com/uploads/images/cover.jpg");
    expect(meta.type).toBe("music.playlist");
  });

  it("returns song metadata with artwork", async () => {
    vi.mocked(prisma.recording.findUnique).mockResolvedValue({
      id: "r1",
      title: "Midnight Drive",
      artworkUrl: "/uploads/images/song.jpg",
      visibility: "PUBLIC",
      status: "PUBLISHED",
      uploaderId: "u1",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      uploader: {
        id: "u1",
        displayName: "Artist Name",
        username: "artist",
        avatarUrl: "/uploads/images/avatar.jpg",
      },
      publishedPlaylist: {
        coverArtUrl: null,
        ownerId: "u1",
        visibility: "PUBLIC",
        status: "PUBLISHED",
      },
    } as never);

    const meta = await resolveShareMeta("/songs/r1", ORIGINS);
    expect(meta.title).toBe("Midnight Drive by Artist Name — Playlisted");
    expect(meta.image).toBe("https://playlisted.com/uploads/images/song.jpg");
    expect(meta.type).toBe("music.song");
  });

  it("returns safe default for unknown routes", async () => {
    const meta = await resolveShareMeta("/unknown-page", ORIGINS);
    expect(meta.title).toBe("Playlisted");
    expect(meta.url).toBe("https://playlisted.com/unknown-page");
  });

  it("uses asset origin for images when canonical origin differs", async () => {
    const previous = process.env.PUBLIC_SITE_URL;
    process.env.PUBLIC_SITE_URL = "https://playlisted.com";

    try {
      const meta = await resolveShareMeta("/", {
        assetOrigin: "https://playlisted.up.railway.app",
        canonicalOrigin: "https://playlisted.com",
      });

      expect(meta.url).toBe("https://playlisted.com/");
      expect(meta.image).toBe("https://playlisted.up.railway.app/og/playlisted-default.jpg");
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_SITE_URL;
      else process.env.PUBLIC_SITE_URL = previous;
    }
  });
});

describe("share debug routes", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.playlist.findFirst).mockReset();
    vi.mocked(prisma.playlist.findUnique).mockReset();
    vi.mocked(prisma.recording.findUnique).mockReset();
  });

  it("returns resolved metadata from url query", async () => {
    const res = await request(app).get("/api/share/meta?url=https://playlisted.com/privacy");
    expect(res.status).toBe(200);
    expect(res.body.title).toContain("Privacy");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("returns debug metadata for artist path", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      username: "artist",
      displayName: "Artist Name",
      bio: null,
      avatarUrl: null,
      heroImageUrl: null,
      status: "ACTIVE",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);

    const res = await request(app).get("/api/share/debug/@/artist");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Artist Name (@artist) — Playlisted");
  });
});
