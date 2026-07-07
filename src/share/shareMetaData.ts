import { DEFAULT_SHARE_DESCRIPTION, SITE_NAME } from "./constants.js";
import { defaultShareImage } from "./shareImages.js";
import type { ShareOrigins } from "./shareRequest.js";
import type { ShareMeta, ShareMetaType } from "./types.js";

type BuildShareMetaInput = {
  title: string;
  description: string;
  image: string;
  canonicalPath: string;
  canonicalOrigin: string;
  type: ShareMetaType;
  imageAlt?: string;
  authorName?: string;
  publishedTime?: string;
  modifiedTime?: string;
  jsonLd?: Record<string, unknown>;
};

export function buildShareMeta(input: BuildShareMetaInput): ShareMeta {
  const canonicalUrl = `${input.canonicalOrigin}${input.canonicalPath}`;

  return {
    title: input.title,
    description: input.description,
    image: input.image,
    url: canonicalUrl,
    canonicalUrl,
    type: input.type,
    siteName: SITE_NAME,
    twitterCard: "summary_large_image",
    twitterTitle: input.title,
    twitterDescription: input.description,
    twitterImage: input.image,
    imageAlt: input.imageAlt,
    authorName: input.authorName,
    publishedTime: input.publishedTime,
    modifiedTime: input.modifiedTime,
    jsonLd: input.jsonLd,
  };
}

export function defaultShareMeta(pathname: string, origins: ShareOrigins): ShareMeta {
  return buildShareMeta({
    title: SITE_NAME,
    description: DEFAULT_SHARE_DESCRIPTION,
    image: defaultShareImage(origins.assetOrigin),
    canonicalPath: pathname || "/",
    canonicalOrigin: origins.canonicalOrigin,
    type: "website",
    imageAlt: `${SITE_NAME} — ${DEFAULT_SHARE_DESCRIPTION}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: origins.canonicalOrigin,
      description: DEFAULT_SHARE_DESCRIPTION,
    },
  });
}

export function homeShareMeta(origins: ShareOrigins): ShareMeta {
  const title = `${SITE_NAME} — Music charts and curated playlists for independent artists`;
  const description =
    "Discover independent artists, curated playlists, and music charts on Playlisted.";

  return buildShareMeta({
    title,
    description,
    image: defaultShareImage(origins.assetOrigin),
    canonicalPath: "/",
    canonicalOrigin: origins.canonicalOrigin,
    type: "website",
    imageAlt: title,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: origins.canonicalOrigin,
      description,
    },
  });
}

type StaticPageKey =
  | "company"
  | "privacy"
  | "terms"
  | "search"
  | "charts"
  | "favorites"
  | "musicians"
  | "developers"
  | "advertising"
  | "jobs"
  | "media";

const STATIC_PAGES: Record<
  StaticPageKey,
  { path: string; title: string; description: string; type?: ShareMetaType }
> = {
  company: {
    path: "/company",
    title: "About Playlisted",
    description: "Playlisted is another music community. Trying to be like Soundcloud.",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy",
    description: "A plain-language privacy summary for Playlisted.",
  },
  terms: {
    path: "/terms",
    title: "Terms",
    description: "Terms of use for Playlisted.",
  },
  search: {
    path: "/search",
    title: "Search",
    description: "Search songs, artists, playlists, and genres on Playlisted.",
  },
  charts: {
    path: "/charts",
    title: "Charts",
    description: "Top charts, liked tracks, playlists, and artists on Playlisted.",
  },
  favorites: {
    path: "/favorites",
    title: "Favorites",
    description: "Top charts and your liked tracks, playlists, and artists on Playlisted.",
  },
  musicians: {
    path: "/musicians",
    title: "For musicians",
    description: "What musicians can use on Playlisted right now.",
  },
  developers: {
    path: "/developers",
    title: "For developers",
    description: "API access and developer tools for Playlisted.",
  },
  advertising: {
    path: "/advertising",
    title: "Advertising",
    description: "Advertising and collaborations on Playlisted.",
  },
  jobs: {
    path: "/jobs",
    title: "Jobs",
    description: "Work with Playlisted.",
  },
  media: {
    path: "/media",
    title: "Media",
    description: "Media resources for Playlisted.",
  },
};

export function staticPageShareMeta(page: StaticPageKey, origins: ShareOrigins): ShareMeta {
  const config = STATIC_PAGES[page];
  const title = `${config.title} — ${SITE_NAME}`;

  return buildShareMeta({
    title,
    description: config.description,
    image: defaultShareImage(origins.assetOrigin),
    canonicalPath: config.path,
    canonicalOrigin: origins.canonicalOrigin,
    type: config.type ?? "article",
    imageAlt: title,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: config.title,
      url: `${origins.canonicalOrigin}${config.path}`,
      description: config.description,
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: origins.canonicalOrigin,
      },
    },
  });
}

export function staticPageShareMetaByPath(pathname: string, origins: ShareOrigins): ShareMeta | null {
  const entry = Object.entries(STATIC_PAGES).find(([, config]) => config.path === pathname);
  if (!entry) return null;
  return staticPageShareMeta(entry[0] as StaticPageKey, origins);
}
