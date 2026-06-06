import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { publicApiTiming } from "../lib/publicApiTiming.js";

describe("publicApiTiming", () => {
  it("adds timing headers to configured public API routes", async () => {
    const app = express();
    app.use(publicApiTiming);
    app.get("/api/v1/homepage", (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get("/api/v1/homepage");

    expect(res.status).toBe(200);
    expect(res.headers["server-timing"]).toMatch(/^homepage;dur=\d+(\.\d+)?$/);
    expect(Number(res.headers["x-playlisted-route-time"])).toBeGreaterThanOrEqual(0);
  });

  it("leaves unrelated routes alone", async () => {
    const app = express();
    app.use(publicApiTiming);
    app.get("/api/v1/health", (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.headers["server-timing"]).toBeUndefined();
    expect(res.headers["x-playlisted-route-time"]).toBeUndefined();
  });
});
