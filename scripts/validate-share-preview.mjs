#!/usr/bin/env node

const baseUrl = (process.env.SHARE_BASE_URL ?? process.env.PERF_BASE_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const pagePath = process.env.SHARE_PATH ?? "/";

function decodeMetaContent(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractMetaTag(html, key, attr) {
  const escapedKey = key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\s+${attr}="${escapedKey}"\\s+content="([^"]*)"`, "i"),
    new RegExp(`<meta\\s+content="([^"]*)"\\s+${attr}="${escapedKey}"`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeMetaContent(match[1]);
  }

  return null;
}

function isJpeg(bytes) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Validate share preview image rendering.

Usage:
  npm run share:validate
  SHARE_BASE_URL=https://playlisted.up.railway.app npm run share:validate
  SHARE_BASE_URL=http://127.0.0.1:4000 SHARE_PATH=/@/artist npm run share:validate

Environment:
  SHARE_BASE_URL   App origin. Default: http://127.0.0.1:4000
  SHARE_PATH       Page path to validate. Default: /
`);
  process.exit(0);
}

async function main() {
  const pageUrl = `${baseUrl}${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`;
  console.log(`Share preview validation — ${pageUrl}`);

  let failures = 0;
  const markFail = (message) => {
    failures += 1;
    fail(message);
  };

  const htmlRes = await fetch(pageUrl, {
    headers: { Accept: "text/html" },
    redirect: "follow",
  });

  if (!htmlRes.ok) {
    markFail(`HTML request failed (${htmlRes.status})`);
    process.exit(1);
  }

  const html = await htmlRes.text();
  const title = extractMetaTag(html, "og:title", "property");
  const description = extractMetaTag(html, "og:description", "property");
  const imageUrl = extractMetaTag(html, "og:image", "property");
  const thumbnailUrl = extractMetaTag(html, "thumbnail", "name");

  if (!title) markFail("Missing og:title");
  else pass(`og:title present — ${title}`);

  if (!description) markFail("Missing og:description");
  else pass(`og:description present`);

  if (!imageUrl) {
    markFail("Missing og:image");
    process.exit(1);
  }

  if (!/^https?:\/\//.test(imageUrl)) {
    markFail(`og:image is not absolute — ${imageUrl}`);
  } else {
    pass(`og:image present — ${imageUrl}`);
  }

  if (html.includes('name="thumbnail"')) {
    if (thumbnailUrl !== imageUrl) {
      markFail(`thumbnail does not match og:image (${thumbnailUrl ?? "missing"})`);
    } else {
      pass("thumbnail matches og:image");
    }
  }

  const imageRes = await fetch(imageUrl, { redirect: "follow" });
  if (!imageRes.ok) {
    markFail(`Image request failed (${imageRes.status}) — ${imageUrl}`);
    process.exit(1);
  }

  const contentType = imageRes.headers.get("content-type") ?? "";
  if (!contentType.includes("image/jpeg") && !contentType.includes("image/jpg")) {
    markFail(`Image content-type is not JPEG (${contentType || "missing"})`);
  } else {
    pass(`Image reachable (${imageRes.status}, ${contentType})`);
  }

  const bytes = new Uint8Array(await imageRes.arrayBuffer());
  if (bytes.length < 1_000) {
    markFail(`Image is unexpectedly small (${bytes.length} bytes)`);
  } else {
    pass(`Image size OK (${bytes.length} bytes)`);
  }

  if (!isJpeg(bytes)) {
    markFail("Image bytes are not a JPEG");
  } else {
    pass("JPEG signature valid");
  }

  if (failures > 0) {
    console.error(`\nFAIL (${failures} issue${failures === 1 ? "" : "s"})`);
    process.exit(1);
  }

  console.log("\nPASS — share preview image should render in iMessage/RCS/social apps");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
