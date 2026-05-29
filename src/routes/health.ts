import { Router } from "express";

import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.error("Health check database probe failed");
    }
  }

  const body = {
    ok: dbOk,
    service: "playlisted-api",
    version: "0.1.0",
    db: dbOk,
  };

  if (!dbOk) {
    return res.status(503).json(body);
  }

  res.json(body);
});
