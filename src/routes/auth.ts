import { UserStatus } from "@prisma/client";
import { Router } from "express";
import crypto from "node:crypto";

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

type GoogleOAuthState = {
  mode: "login" | "register";
  returnTo?: string;
  webOrigin?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

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

function getRequiredGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

function getOAuthStateSecret() {
  return process.env.GOOGLE_OAUTH_STATE_SECRET ?? process.env.SESSION_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signOAuthState(payload: string) {
  return crypto.createHmac("sha256", getOAuthStateSecret()).update(payload).digest("base64url");
}

function encodeOAuthState(state: GoogleOAuthState) {
  const payload = toBase64Url(JSON.stringify(state));
  return `${payload}.${signOAuthState(payload)}`;
}

function decodeOAuthState(value: string): GoogleOAuthState | null {
  try {
    const [payload, signature] = value.split(".");
    if (!payload || !signature) return null;

    const expected = signOAuthState(payload);
    const actual = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) {
      return null;
    }

    const parsed = JSON.parse(fromBase64Url(payload)) as GoogleOAuthState;
    if (parsed.mode !== "login" && parsed.mode !== "register") return null;
    return parsed;
  } catch {
    return null;
  }
}

function getApiOrigin(req: { protocol: string; get(name: string): string | undefined }) {
  return process.env.API_PUBLIC_URL ?? `${req.protocol}://${req.get("host")}`;
}

function getWebOrigin(req: { protocol: string; get(name: string): string | undefined }, state?: GoogleOAuthState | null) {
  return process.env.WEB_APP_URL ?? process.env.PUBLIC_WEB_URL ?? state?.webOrigin ?? `${req.protocol}://${req.get("host")}`;
}

function getGoogleRedirectUri(req: { protocol: string; get(name: string): string | undefined }) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${getApiOrigin(req)}/api/v1/auth/google/callback`;
}

function normalizeReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }
  return value.slice(0, 512);
}

function normalizeWebOrigin(value: unknown) {
  if (typeof value !== "string") return undefined;

  try {
    const origin = new URL(value).origin;
    const allowedOrigins = (process.env.OAUTH_ALLOWED_WEB_ORIGINS ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (allowedOrigins.includes(origin)) return origin;

    const { hostname, protocol } = new URL(origin);
    if ((hostname === "localhost" || hostname === "127.0.0.1") && protocol === "http:") {
      return origin;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function getOAuthRedirectPath(mode: GoogleOAuthState["mode"]) {
  return mode === "register" ? "/register" : "/login";
}

function redirectWithOAuthError(res: any, req: any, state: GoogleOAuthState | null, message: string) {
  const target = new URL(getOAuthRedirectPath(state?.mode ?? "login"), getWebOrigin(req, state));
  target.searchParams.set("oauthError", message);
  if (state?.returnTo) target.searchParams.set("from", state.returnTo);
  return res.redirect(target.toString());
}

async function createSessionForUser(userId: string) {
  const accessToken = generateSessionToken();
  const tokenHash = hashSessionToken(accessToken);
  const expiresAt = getSessionExpiryDate();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { accessToken, expiresAt };
}

async function createUniqueUsername(displayName: string, email: string) {
  const emailName = email.split("@")[0] ?? "user";
  const baseUsername = slugify(displayName) || slugify(emailName) || "user";
  let username = baseUsername;
  let suffix = 1;

  while (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    suffix += 1;
    username = `${baseUsername}-${suffix}`;
  }

  return username;
}

async function getGoogleUserInfo(code: string, req: any): Promise<GoogleUserInfo> {
  const google = getRequiredGoogleEnv();
  if (!google) {
    throw new Error("Google OAuth is not configured.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: getGoogleRedirectUri(req),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Google sign-in could not be completed.");
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("Google did not return an access token.");
  }

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });

  if (!userInfoResponse.ok) {
    throw new Error("Google profile could not be loaded.");
  }

  return (await userInfoResponse.json()) as GoogleUserInfo;
}

authRouter.get("/google", (req, res) => {
  const google = getRequiredGoogleEnv();
  if (!google) {
    return res.status(503).json({
      error: "oauth_unavailable",
      message: "Google sign-in is not configured.",
    });
  }

  const mode = req.query.mode === "register" ? "register" : "login";
  const state = encodeOAuthState({
    mode,
    returnTo: normalizeReturnTo(req.query.returnTo),
    webOrigin: normalizeWebOrigin(req.query.webOrigin),
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", google.clientId);
  url.searchParams.set("redirect_uri", getGoogleRedirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return res.redirect(url.toString());
});

authRouter.get("/google/callback", async (req, res, next) => {
  const state = typeof req.query.state === "string" ? decodeOAuthState(req.query.state) : null;

  try {
    if (!state) {
      return redirectWithOAuthError(res, req, null, "Google sign-in could not be verified.");
    }

    if (typeof req.query.error === "string") {
      return redirectWithOAuthError(res, req, state, "Google sign-in was cancelled.");
    }

    if (typeof req.query.code !== "string") {
      return redirectWithOAuthError(res, req, state, "Google did not return an authorization code.");
    }

    const googleUser = await getGoogleUserInfo(req.query.code, req);
    const email = googleUser.email?.trim().toLowerCase();
    if (!email || googleUser.email_verified !== true) {
      return redirectWithOAuthError(res, req, state, "Google did not return a verified email address.");
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (user && !isUserActive(user)) {
      return redirectWithOAuthError(res, req, state, accountInactiveMessage(user.status));
    }

    if (!user) {
      const displayName = googleUser.name?.trim() || email.split("@")[0] || "Playlisted User";
      user = await prisma.user.create({
        data: {
          email,
          username: await createUniqueUsername(displayName, email),
          displayName,
          avatarUrl: googleUser.picture ?? null,
          role: "CREATOR",
          status: UserStatus.ACTIVE,
        },
      });
    }

    const session = await createSessionForUser(user.id);
    const authResponse = mapAuthResponse(user, session.accessToken, session.expiresAt);
    const target = new URL(getOAuthRedirectPath(state.mode), getWebOrigin(req, state));
    target.searchParams.set("oauthSession", toBase64Url(JSON.stringify(authResponse)));
    if (state.returnTo) target.searchParams.set("from", state.returnTo);

    return res.redirect(target.toString());
  } catch (error) {
    if (state) {
      return redirectWithOAuthError(
        res,
        req,
        state,
        error instanceof Error ? error.message : "Google sign-in failed.",
      );
    }
    return next(error);
  }
});

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

    const username = body.username ? await createUniqueUsername(body.username, body.email) : await createUniqueUsername(body.displayName, body.email);

    const passwordHash = await hashPassword(body.password);

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

      const accessToken = generateSessionToken();
      const tokenHash = hashSessionToken(accessToken);
      const expiresAt = getSessionExpiryDate();

      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      return { user, accessToken, expiresAt };
    });

    return res.status(201).json(mapAuthResponse(created.user, created.accessToken, created.expiresAt));
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

    const session = await createSessionForUser(user.id);

    return res.json(mapAuthResponse(user, session.accessToken, session.expiresAt));
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
