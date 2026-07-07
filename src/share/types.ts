export type ShareMetaType = "website" | "profile" | "music.playlist" | "music.song" | "article";

export type ShareMeta = {
  title: string;
  description: string;
  image: string;
  url: string;
  type: ShareMetaType;
  siteName: "Playlisted";
  twitterCard: "summary_large_image";
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  canonicalUrl: string;
  imageAlt?: string;
  authorName?: string;
  publishedTime?: string;
  modifiedTime?: string;
  jsonLd?: Record<string, unknown>;
};
