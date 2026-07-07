import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../apps/web/public/og");

const cards = [
  {
    file: "playlisted-default.jpg",
    label: "Playlisted",
    subtitle: "Music charts and curated playlists for independent artists.",
    accent: "#7c5cff",
    background: ["#0b0b12", "#17172a"],
  },
  {
    file: "playlisted-artist-default.jpg",
    label: "Artist on Playlisted",
    subtitle: "Discover independent artists and their playlists.",
    accent: "#ff6bcb",
    background: ["#120b16", "#241428"],
  },
  {
    file: "playlisted-playlist-default.jpg",
    label: "Playlist on Playlisted",
    subtitle: "Curated playlists from the community.",
    accent: "#4fd1c5",
    background: ["#08131a", "#102433"],
  },
  {
    file: "playlisted-song-default.jpg",
    label: "Song on Playlisted",
    subtitle: "Listen to independent music.",
    accent: "#f6ad55",
    background: ["#17120b", "#2a2012"],
  },
] ;

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cardSvg({ label, subtitle, accent, background }) {
  return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${background[0]}" />
          <stop offset="100%" stop-color="${background[1]}" />
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="20%" r="55%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.35" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" />
      <rect width="1200" height="630" fill="url(#glow)" />
      <circle cx="1040" cy="120" r="180" fill="${accent}" fill-opacity="0.12" />
      <rect x="72" y="72" width="88" height="88" rx="24" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-opacity="0.45" />
      <text x="120" y="128" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="700" fill="${accent}">P</text>
      <text x="96" y="250" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>
      <text x="96" y="330" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="500" fill="#d4d4e8">${escapeXml(subtitle)}</text>
      <text x="96" y="560" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600" fill="#9b9bb0">playlisted.com</text>
    </svg>
  `;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  for (const card of cards) {
    const svg = cardSvg(card);
    const target = path.join(outDir, card.file);
    await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(target);
    console.log(`Wrote ${target}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
