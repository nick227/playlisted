import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import {
  extractOgImageUrl,
  extractThumbnailUrl,
  imagePathFromUrl,
  isJpegBuffer,
} from "../share/parseShareHtml.js";

const WEB_DIST = path.resolve(process.cwd(), "apps/web/dist");
const DEFAULT_OG_FILE = path.join(WEB_DIST, "og/playlisted-default.jpg");
const hasBuiltWeb = fs.existsSync(DEFAULT_OG_FILE);

const app = createApp();

describe.skipIf(!hasBuiltWeb)("share preview image (integration)", () => {
  it("injects og:image into homepage HTML and serves a JPEG at that URL", async () => {
    const htmlRes = await request(app)
      .get("/")
      .set("Accept", "text/html")
      .set("Host", "playlisted.test");

    expect(htmlRes.status).toBe(200);
    expect(htmlRes.headers["content-type"]).toMatch(/text\/html/);

    const imageUrl = extractOgImageUrl(htmlRes.text);
    expect(imageUrl).toBeTruthy();
    expect(imageUrl).toMatch(/^https?:\/\//);

    const thumbnailUrl = extractThumbnailUrl(htmlRes.text);
    if (htmlRes.text.includes('name="thumbnail"')) {
      expect(thumbnailUrl).toBe(imageUrl);
    }

    const imagePath = imagePathFromUrl(imageUrl!, "http://playlisted.test");
    const imageRes = await request(app).get(imagePath).set("Host", "playlisted.test");

    expect(imageRes.status).toBe(200);
    expect(imageRes.headers["content-type"]).toMatch(/image\/jpeg/);
    expect(imageRes.body.length).toBeGreaterThan(1_000);
    expect(isJpegBuffer(imageRes.body)).toBe(true);
  });

  it("serves default OG artwork directly from /og/playlisted-default.jpg", async () => {
    const res = await request(app).get("/og/playlisted-default.jpg");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/jpeg/);
    expect(isJpegBuffer(res.body)).toBe(true);
  });
});
