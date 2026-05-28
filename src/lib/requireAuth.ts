import type { Request, Response } from "express";

import { getAuthContextFromRequest } from "./auth.js";

export async function requireAuth(req: Request, res: Response) {
  const auth = await getAuthContextFromRequest(req);
  if (!auth) {
    res.status(401).json({
      error: "unauthorized",
      message: "A valid bearer token is required.",
    });
    return null;
  }
  return auth;
}
