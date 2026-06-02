import { EditorialInfoPage } from "@/pages/site/EditorialInfoPage";
import { title } from "process";

const pages = {
  musicians: {
    pageKey: "musicians",
    eyebrow: "For musicians",
    title: "What musicians can use right now.",
    description:
      "Playlisted is a small experimental music app. Right now it is mainly Nick using it and building it.",
    intro:
      "Thank you for even considering putting your music here. We know that is not a small ask, especially for a young platform.",
    sections: [],
    bullets: [
      "Upload songs and artwork.",
      "Organize releases and playlists.",
      "Publish clean music pages.",
      "Let listeners play and favorite tracks.",
      "Manage your profile in Studio.",
    ],
    closing:
      "We are investing in bringing more traffic to the songs artists publish here.",
  },
  developers: {
    pageKey: "developers",
    eyebrow: "For developers",
    title: "For people who want to work with the experiment.",
    description:
    "We just rolled out our first developer features.",
    intro:
      "Hiya, what kind of developer?",
    bullets: [
      "API key used to connect through curl.",
      "Public radio api for streaming.",
      "Desktop app coming soon.",
    ],
    contactEmail: "it@playlisted.com",
  },
  advertising: {
    pageKey: "advertising",
    eyebrow: "Advertising",
    title: "Advertising and collaborations.",
    description:
      "Playlisted does not have a formal advertising product right now. We are interested in simple collaborations that fit the project.",
    intro:
      "If you want to talk about a small partnership, a music-related placement, or another practical idea, send an email.",
    contactEmail: "advertising@playlisted.com",
    sections: [],
  },
  company: {
    pageKey: "company",
    eyebrow: "Company",
    title: "About Playlisted.",
    contactEmail: "company@playlisted.com",
    description:
      "Playlisted is a creator services platform for insomniacs.",
    intro:
      "The site started because Nick wanted a real place to organize, publish, and listen to his own AI-generated music. That is part of the project, but the broader goal is a platform for music pages, playlists, radio, discovery, and creator tools.",
    sections: [
      {
        title: "Long term realism",
        body:
          "Playlisted is still trying to find a niche to fill. We are also interested in advertising, but for now, the focus is to improve the product, and collect interesting music.",
      },
    ],
  },
  jobs: {
    pageKey: "jobs",
    eyebrow: "Jobs",
    title: "Work with Playlisted.",
    description:
      "An organization is only as good as it's people.",
    intro:
      "We still have a lot of growth before we can even begins to consider making these key hires..",
    contactEmail: "jobs@playlisted.com",
    contactAfterContent: true,
    sections: [],
    tableItems: [
      { role: "Founding sales lead", focus: "First customers and revenue" },
      { role: "Growth marketer", focus: "Traffic, campaigns, testing" },
      { role: "Product designer", focus: "Interface, brand, usability" },
      { role: "Artist outreach lead", focus: "Musician relationships" },
      { role: "Ad partnerships lead", focus: "Sponsor conversations" },
    ],
    closing:
      "Let's chat and see where it goes.",
  },
  media: {
    pageKey: "media",
    eyebrow: "Media",
    title: "Media inquiries.",
    description: "We especially like Survivor and Family Feud.",
    intro: "Please send all questions or interests to.",
    contactEmail: "media@playlisted.com",
    sections: [],
  },
} as const;

export function MusiciansPage() {
  return <EditorialInfoPage {...pages.musicians} />;
}

export function DevelopersPage() {
  return <EditorialInfoPage {...pages.developers} />;
}

export function AdvertisingPage() {
  return <EditorialInfoPage {...pages.advertising} />;
}

export function CompanyPage() {
  return <EditorialInfoPage {...pages.company} />;
}

export function JobsPage() {
  return <EditorialInfoPage {...pages.jobs} />;
}

export function MediaPage() {
  return <EditorialInfoPage {...pages.media} />;
}
