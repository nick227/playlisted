import { EditorialInfoPage } from "@/pages/site/EditorialInfoPage";

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
    title: "Now offering API access.",
    description:
    "We just released cool new features.",
    intro:
      "Hello, we would love to hear from you.",
    sections: [],
    bullets: [
      "API key used to connect through curl.",
      "Public radio api for streaming.",
      "Desktop app coming soon.",
    ],
    contactEmail: "email coming soon",
  },
  advertising: {
    pageKey: "advertising",
    eyebrow: "Advertising",
    title: "Advertising and collaborations.",
    description:
      "We are interested in collaborations that fit the project and help the artists.",
    intro:
      "If you want to talk about music, technology or online promotions let's chat.",
    contactEmail: "email coming soon",
    sections: [],
  },
  company: {
    pageKey: "company",
    eyebrow: "Company",
    title: "About Playlisted.",
    contactEmail: "email coming soon",
    description:
      "Playlisted is another music community. Trying to be like Soundcloud.",
    intro:
      "The site started because Nick wanted a real place to listen to his own AI-generated music. The goal is a platform for all kinds of audio creators.",
  },
  jobs: {
    pageKey: "jobs",
    eyebrow: "Jobs",
    title: "Work with Playlisted.",
    description:
      "An organization is only as good as it's people.",
    intro:
      "Here is our current and pressing business needs.",
    contactEmail: "email coming soon",
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
    description: "Coming Soon!",
    intro: "Please send all questions or interests to.",
    contactEmail: "email coming soon",
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
