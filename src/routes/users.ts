import { UserRole, UserStatus } from "@prisma/client";
import { Router } from "express";

import { getAuthContextFromRequest } from "../lib/auth.js";
import { filterPlaylistItemsForViewer } from "../lib/publicRecordingFilter.js";
import { prisma } from "../lib/prisma.js";
import { assertProfileLinks, normalizeProfileLinks } from "../lib/profileLinks.js";
import { requireAdmin } from "../lib/requireAdmin.js";
import { requireAuth } from "../lib/requireAuth.js";
import { slugify } from "../utils/slug.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const usersRouter = Router();

function mapUserSummary(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    heroImageUrl: user.heroImageUrl,
    profileLinks: normalizeProfileLinks(user.profileLinks),
    role: user.role,
    status: user.status,
    isFeaturedArtist: user.isFeaturedArtist,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function mapUserDetail(user: any) {
  return {
    ...mapUserSummary(user),
    publicPlaylists: (user.ownedPlaylists ?? []).map((playlist: any) => ({
      id: playlist.id,
      href: `/@/${encodeURIComponent(user.username)}/${encodeURIComponent(playlist.slug)}`,
      ownerId: playlist.ownerId,
      title: playlist.title,
      slug: playlist.slug,
      description: playlist.description,
      coverArtUrl: playlist.coverArtUrl,
      type: playlist.type,
      visibility: playlist.visibility,
      status: playlist.status,
      featured: playlist.featured,
      isPinnedOnProfile: playlist.isPinnedOnProfile,
      itemCount: playlist.itemCount,
      totalDurationSeconds: playlist.totalDurationSeconds,
      publishedAt: playlist.publishedAt?.toISOString() ?? null,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
    })),
  };
}

usersRouter.get("/", async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const featuredOnly = req.query.featured === "true";

    const where = {
      ...(role ? { role: role as UserRole } : {}),
      ...(status ? { status: status as UserStatus } : {}),
      ...(featuredOnly ? { isFeaturedArtist: true } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ isFeaturedArtist: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: items.map(mapUserSummary),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/check-username", async (req, res, next) => {
  try {
    const username =
      typeof req.query.username === "string" ? slugify(req.query.username) : "";
    if (!username) {
      return res.status(400).json({
        error: "username_required",
        message: "Query parameter username is required.",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return res.json({ username, available: !existing });
  } catch (error) {
    return next(error);
  }
});

usersRouter.get("/by-username/:username/playlists/:slug", async (req, res, next) => {
  try {
    const username = slugify(req.params.username);
    const slug = slugify(req.params.slug);

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({
        error: "user_not_found",
        message: `User @${username} was not found.`,
      });
    }

    const playlist = await prisma.playlist.findFirst({
      where: { ownerId: user.id, slug },
      include: {
        owner: true,
        tags: { include: { tag: true } },
        items: {
          include: {
            recording: {
              include: {
                uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
              },
            },
          },
          orderBy: { position: "asc" as const },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist @${username}/${slug} was not found.`,
      });
    }

    const auth = await getAuthContextFromRequest(req);

    if (playlist.visibility === "PRIVATE" || playlist.status !== "PUBLISHED") {
      if (!auth) {
        return res.status(401).json({
          error: "unauthorized",
          message: "You must be logged in to view this playlist.",
        });
      }
      if (auth.user.id !== playlist.ownerId && auth.user.role !== "ADMIN" && auth.user.role !== "EDITOR") {
        return res.status(403).json({
          error: "forbidden",
          message: "You do not have access to this playlist.",
        });
      }
    }

    const visibleItems = filterPlaylistItemsForViewer(
      playlist.items,
      { userId: auth?.user.id, role: auth?.user.role },
      playlist.ownerId,
    );

    const { mapPlaylistDetail } = await import("../lib/playlistMaps.js");
    return res.json(mapPlaylistDetail({ ...playlist, items: visibleItems } as typeof playlist));
  } catch (error) {
    return next(error);
  }
});

usersRouter.get("/by-username/:username", async (req, res, next) => {
  try {
    const username = slugify(req.params.username);
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        ownedPlaylists: {
          where: { visibility: "PUBLIC", status: "PUBLISHED" },
          orderBy: [{ isPinnedOnProfile: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "user_not_found",
        message: `User @${username} was not found.`,
      });
    }

    res.json(mapUserDetail(user));

    // Fire-and-forget: log profile view without blocking response
    getAuthContextFromRequest(req).then((auth) => {
      const viewerId = auth?.user.id ?? null;
      if (viewerId === user.id) return; // don't count own visits
      const referrer = typeof req.headers.referer === "string" ? req.headers.referer.slice(0, 255) : null;
      prisma.profileViewEvent.create({
        data: { profileUserId: user.id, viewerId, referrer },
      }).catch(() => undefined);
    }).catch(() => undefined);

    return;
  } catch (error) {
    return next(error);
  }
});

usersRouter.patch("/me", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const body = req.body as {
      displayName?: string;
      username?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      heroImageUrl?: string | null;
      profileLinks?: unknown;
    };

    let username = auth.user.username;
    if (body.username) {
      username = slugify(body.username);
      if (!username) {
        return res.status(400).json({
          error: "invalid_username",
          message: "Username must contain letters or numbers.",
        });
      }

      const taken = await prisma.user.findFirst({
        where: { username, id: { not: auth.user.id } },
        select: { id: true },
      });

      if (taken) {
        return res.status(409).json({
          error: "username_taken",
          message: `Username @${username} is already taken.`,
        });
      }
    }

    let profileLinks;
    if (body.profileLinks !== undefined) {
      try {
        profileLinks = assertProfileLinks(body.profileLinks);
      } catch (error) {
        return res.status(400).json({
          error: "invalid_profile_links",
          message: error instanceof Error ? error.message : "Profile links are invalid.",
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        ...(body.displayName ? { displayName: body.displayName } : {}),
        ...(body.username ? { username } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        ...(body.heroImageUrl !== undefined ? { heroImageUrl: body.heroImageUrl } : {}),
        ...(body.profileLinks !== undefined ? { profileLinks } : {}),
      },
      include: {
        ownedPlaylists: {
          where: { visibility: "PUBLIC", status: "PUBLISHED" },
          orderBy: [{ isPinnedOnProfile: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    return res.json(mapUserDetail(updated));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return res.status(409).json({
        error: "user_conflict",
        message: "A user with that email or username already exists.",
      });
    }

    return next(error);
  }
});

usersRouter.get("/:userId", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        ownedPlaylists: {
          where: { visibility: "PUBLIC" },
          orderBy: [{ isPinnedOnProfile: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "user_not_found",
        message: `User ${req.params.userId} was not found.`,
      });
    }

    return res.json(mapUserDetail(user));
  } catch (error) {
    return next(error);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const body = req.body as {
      email: string;
      username?: string;
      displayName: string;
      passwordHash?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
      heroImageUrl?: string | null;
      role?: UserRole;
      status?: UserStatus;
      isFeaturedArtist?: boolean;
    };

    const username = (body.username && slugify(body.username)) || slugify(body.displayName) || "user";
    let candidate = username;
    let suffix = 1;

    while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
      suffix += 1;
      candidate = `${username}-${suffix}`;
    }

    if (auth.user.role !== "ADMIN" && (body.role !== undefined || body.status !== undefined)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Only admins may set user role or status.",
      });
    }

    const created = await prisma.user.create({
      data: {
        email: body.email,
        username: candidate,
        displayName: body.displayName,
        passwordHash: body.passwordHash ?? null,
        bio: body.bio ?? null,
        avatarUrl: body.avatarUrl ?? null,
        heroImageUrl: body.heroImageUrl ?? null,
        role: body.role ?? "LISTENER",
        status: body.status ?? "ACTIVE",
        isFeaturedArtist: body.isFeaturedArtist ?? false,
      },
      include: {
        ownedPlaylists: {
          where: { visibility: "PUBLIC" },
          orderBy: [{ isPinnedOnProfile: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    return res.status(201).json(mapUserDetail(created));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return res.status(409).json({
        error: "user_conflict",
        message: "A user with that email or username already exists.",
      });
    }

    return next(error);
  }
});
