import type { Request, Response } from "express";

import { getAuthContextFromRequest } from "./auth.js";

export async function requireAdmin(req: Request, res: Response) {
  const auth = await getAuthContextFromRequest(req);
  if (!auth) {
    res.status(401).json({ error: "unauthorized", message: "A valid bearer token is required." });
    return null;
  }
  if (auth.user.role !== "ADMIN" && auth.user.role !== "EDITOR") {
    res.status(403).json({ error: "forbidden", message: "Admin or editor role required." });
    return null;
  }
  return auth;
}
