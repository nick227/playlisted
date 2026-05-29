import { useEffect } from "react";

const SITE = "Playlisted";

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
    const full = `${title} — ${SITE}`;
    document.title = full;
    upsertMeta("og:title", full, true);
    upsertMeta("og:site_name", SITE, true);
    if (description) {
      upsertMeta("description", description, false);
      upsertMeta("og:description", description, true);
    }
    if (image) {
      upsertMeta("og:image", image, true);
    }
  }, [title, description, image]);
}
