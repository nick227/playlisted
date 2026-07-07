import type { ShareMeta } from "./types.js";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function safeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function replaceMetaToken(html: string, token: string, value: string): string {
  return html.replaceAll(`<!--${token}-->`, value).replaceAll(token, value);
}

function replaceTitle(html: string, value: string): string {
  return html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(value)}</title>`);
}

function replaceCanonical(html: string, href: string): string {
  return html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${escapeHtml(href)}" />`,
  );
}

function replaceMetaContent(
  html: string,
  attr: "name" | "property",
  key: string,
  value: string,
): string {
  const pattern = new RegExp(
    `<meta\\s+${attr}="${key}"\\s+content="[^"]*"(?:\\s+[^>]*)?\\s*/>`,
    "i",
  );
  return html.replace(
    pattern,
    `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`,
  );
}

function replaceJsonLd(html: string, jsonLd: Record<string, unknown>): string {
  const json = safeJsonLd(jsonLd);
  return html.replace(
    /<script\s+type="application\/ld\+json"\s+id="share-json-ld"[^>]*>[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="share-json-ld">\n      ${json}\n    </script>`,
  );
}

function replaceOgImageSecureTag(html: string, tag: string): string {
  let rendered = replaceMetaToken(html, "__META_OG_IMAGE_SECURE_TAG__", tag);
  if (tag) {
    if (!rendered.includes('property="og:image:secure_url"')) {
      rendered = rendered.replace(
        /(<meta\s+property="og:image"\s+content="[^"]*"\s*\/>)/,
        `$1\n    ${tag}`,
      );
    }
    return rendered;
  }

  return rendered.replace(/\s*<meta\s+property="og:image:secure_url"[^>]*\/>/g, "");
}

export function injectShareMeta(html: string, meta: ShareMeta): string {
  const jsonLd = meta.jsonLd ?? {};
  const imageAlt = meta.imageAlt ?? meta.title;
  const secureImageTag = meta.image.startsWith("https://")
    ? `<meta property="og:image:secure_url" content="${escapeHtml(meta.image)}" />`
    : "";
  const imageType = meta.image.includes(".png") ? "image/png" : "image/jpeg";

  let rendered = html;
  rendered = replaceTitle(rendered, meta.title);
  rendered = replaceCanonical(rendered, meta.canonicalUrl);
  rendered = replaceMetaContent(rendered, "name", "description", meta.description);
  rendered = replaceMetaContent(rendered, "property", "og:title", meta.title);
  rendered = replaceMetaContent(rendered, "property", "og:description", meta.description);
  rendered = replaceMetaContent(rendered, "property", "og:type", meta.type);
  rendered = replaceMetaContent(rendered, "property", "og:url", meta.url);
  rendered = replaceMetaContent(rendered, "property", "og:image", meta.image);
  rendered = replaceMetaContent(rendered, "property", "og:image:alt", imageAlt);
  rendered = replaceMetaContent(rendered, "property", "og:image:type", imageType);
  rendered = replaceMetaContent(rendered, "name", "thumbnail", meta.image);
  rendered = replaceMetaContent(rendered, "name", "twitter:title", meta.twitterTitle);
  rendered = replaceMetaContent(rendered, "name", "twitter:description", meta.twitterDescription);
  rendered = replaceMetaContent(rendered, "name", "twitter:image", meta.twitterImage);
  rendered = replaceMetaContent(rendered, "name", "twitter:image:alt", imageAlt);
  rendered = replaceOgImageSecureTag(rendered, secureImageTag);
  rendered = replaceJsonLd(rendered, jsonLd);

  // Backward compatibility for templates that still use __META_*__ tokens.
  rendered = replaceMetaToken(rendered, "__META_TITLE__", escapeHtml(meta.title));
  rendered = replaceMetaToken(rendered, "__META_DESCRIPTION__", escapeHtml(meta.description));
  rendered = replaceMetaToken(rendered, "__META_TYPE__", escapeHtml(meta.type));
  rendered = replaceMetaToken(rendered, "__META_URL__", escapeHtml(meta.url));
  rendered = replaceMetaToken(rendered, "__META_IMAGE__", escapeHtml(meta.image));
  rendered = replaceMetaToken(rendered, "__META_CANONICAL_URL__", escapeHtml(meta.canonicalUrl));
  rendered = replaceMetaToken(rendered, "__META_IMAGE_ALT__", escapeHtml(imageAlt));
  rendered = replaceMetaToken(rendered, "__META_TWITTER_TITLE__", escapeHtml(meta.twitterTitle));
  rendered = replaceMetaToken(
    rendered,
    "__META_TWITTER_DESCRIPTION__",
    escapeHtml(meta.twitterDescription),
  );
  rendered = replaceMetaToken(rendered, "__META_TWITTER_IMAGE__", escapeHtml(meta.twitterImage));
  rendered = replaceMetaToken(rendered, "__META_OG_IMAGE_TYPE_TAG__", `<meta property="og:image:type" content="${imageType}" />`);
  rendered = replaceMetaToken(rendered, "__META_JSON_LD__", safeJsonLd(jsonLd));

  return rendered;
}
