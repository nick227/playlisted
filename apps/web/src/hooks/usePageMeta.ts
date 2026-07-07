import { useEffect } from "react";

import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SHARE_DESCRIPTION,
  resolveClientOgImage,
  SITE_NAME,
} from "@/lib/shareMetaDefaults";

interface PageMetaOptions {
  title: string;
  description?: string;
  image?: string | null;
}

function upsertMeta(key: string, value: string, isProp: boolean) {
  const attr = isProp ? "property" : "name";
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function usePageMeta({ title, description, image }: PageMetaOptions) {
  useEffect(() => {
    const full = `${title} — ${SITE_NAME}`;
    const resolvedDescription = description ?? DEFAULT_SHARE_DESCRIPTION;
    const resolvedImage = resolveClientOgImage(image || DEFAULT_OG_IMAGE);
    const pageUrl = window.location.href;

    document.title = full;
    upsertMeta("og:title", full, true);
    upsertMeta("og:site_name", SITE_NAME, true);
    upsertMeta("og:description", resolvedDescription, true);
    upsertMeta("og:url", pageUrl, true);
    upsertMeta("og:image", resolvedImage, true);
    upsertMeta("description", resolvedDescription, false);
    upsertMeta("twitter:title", full, false);
    upsertMeta("twitter:description", resolvedDescription, false);
    upsertMeta("twitter:image", resolvedImage, false);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", pageUrl);
  }, [title, description, image]);
}
