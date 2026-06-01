import { UserStatus } from "@prisma/client";
import { Router } from "express";

import {
  generateSessionToken,
  getAuthContextFromRequest,
  getSessionExpiryDate,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "../lib/auth.js";
import { accountInactiveMessage, isUserActive } from "../lib/publicUserFilter.js";
import { prisma } from "../lib/prisma.js";
import { normalizeProfileLinks } from "../lib/profileLinks.js";
import { slugify } from "../utils/slug.js";

export const authRouter = Router();

function mapAuthUser(user: any) {
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

function mapAuthResponse(user: any, accessToken: string, expiresAt: Date) {
  return {
    accessToken,
    tokenType: "Bearer",
    expiresAt: expiresAt.toISOString(),
    user: mapAuthUser(user),
  };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = req.body as {
      email: string;
      username?: string;
      displayName: string;
      password: string;
      bio?: string | null;
      avatarUrl?: string | null;
      heroImageUrl?: string | null;
    };

    const baseUsername = (body.username && slugify(body.username)) || slugify(body.displayName) || "user";
    let username = baseUsername;
    let suffix = 1;

    while (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
      suffix += 1;
      username = `${baseUsername}-${suffix}`;
    }

    const passwordHash = await hashPassword(body.password);
    const accessToken = generateSessionToken();
    const tokenHash = hashSessionToken(accessToken);
    const expiresAt = getSessionExpiryDate();

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email,
          username,
          displayName: body.displayName,
          passwordHash,
          bio: body.bio ?? null,
          avatarUrl: body.avatarUrl ?? null,
          heroImageUrl: body.heroImageUrl ?? null,
          role: "CREATOR",
          status: UserStatus.ACTIVE,
        },
      });

      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      return user;
    });

    return res.status(201).json(mapAuthResponse(created, accessToken, expiresAt));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return res.status(409).json({
        error: "auth_conflict",
        message: "A user with that email or username already exists.",
      });
    }

    return next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = req.body as {
      email: string;
      password: string;
    };

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user?.passwordHash) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "Email or password is incorrect.",
      });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "Email or password is incorrect.",
      });
    }

    if (!isUserActive(user)) {
      return res.status(403).json({
        error: "account_inactive",
        message: accountInactiveMessage(user.status),
      });
    }

    const accessToken = generateSessionToken();
    const tokenHash = hashSessionToken(accessToken);
    const expiresAt = getSessionExpiryDate();

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return res.json(mapAuthResponse(user, accessToken, expiresAt));
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", async (req, res, next) => {
  try {
    const auth = await getAuthContextFromRequest(req);
    if (!auth) {
      return res.status(401).json({
        error: "unauthorized",
        message: "A valid bearer token is required.",
      });
    }

    return res.json({ user: mapAuthUser(auth.user) });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const auth = await getAuthContextFromRequest(req);
    if (!auth) {
      return res.status(401).json({
        error: "unauthorized",
        message: "A valid bearer token is required.",
      });
    }

    await prisma.session.update({
      where: { id: auth.session.id },
      data: { revokedAt: new Date() },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
