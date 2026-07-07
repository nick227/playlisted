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

export function injectShareMeta(html: string, meta: ShareMeta): string {
  const jsonLd = meta.jsonLd ?? {};
  const imageAlt = meta.imageAlt ?? meta.title;

  return html
    .replaceAll("__META_TITLE__", escapeHtml(meta.title))
    .replaceAll("__META_DESCRIPTION__", escapeHtml(meta.description))
    .replaceAll("__META_TYPE__", escapeHtml(meta.type))
    .replaceAll("__META_URL__", escapeHtml(meta.url))
    .replaceAll("__META_IMAGE__", escapeHtml(meta.image))
    .replaceAll("__META_CANONICAL_URL__", escapeHtml(meta.canonicalUrl))
    .replaceAll("__META_IMAGE_ALT__", escapeHtml(imageAlt))
    .replaceAll("__META_TWITTER_TITLE__", escapeHtml(meta.twitterTitle))
    .replaceAll("__META_TWITTER_DESCRIPTION__", escapeHtml(meta.twitterDescription))
    .replaceAll("__META_TWITTER_IMAGE__", escapeHtml(meta.twitterImage))
    .replaceAll("__META_JSON_LD__", safeJsonLd(jsonLd));
}
