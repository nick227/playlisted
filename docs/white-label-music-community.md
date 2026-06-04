# White-Label Music Community

## Concept

Build a sellable white-label music community platform on top of our existing backend, API, and SDK.

The current Playlisted frontend becomes the reference app. The white-label product gets its own frontend/runtime designed for custom skins from day one.

The pitch:

- launch a branded music community
- invite artists and listeners
- publish releases, mixes, playlists, podcasts, and scene pages
- curate discovery
- collect money
- ship web first, mobile app later

## What We Reuse

- Node/Express API
- Prisma schema
- auth/session system
- upload and media model
- OpenAPI contract
- generated SDK
- admin/studio product lessons
- current frontend as UX reference

## What We Do Not Reuse Directly

- current Tailwind-heavy pages as the skin system
- current app shell as the white-label shell
- hardcoded Playlisted layout assumptions
- public pages as fixed components

## Product Shape

```text
platform-core
  API client
  auth
  route contracts
  data loaders
  player state
  uploads
  permissions
  payments

skin-runtime
  loads the active skin
  provides page data
  provides actions
  protects routes
  handles loading/error states

skins
  default
  label
  magazine
  local-scene
  radio
```

## Skinning

Skinning means replacing pages and layouts, not just changing colors.

Skins should control:

- page structure
- markup
- layout
- Tailwind classes
- custom CSS
- images/assets
- public-facing components
- copy

Core should still control:

- auth
- permissions
- payment verification
- upload rules
- API calls
- player engine
- routing safety
- admin/studio critical workflows

## Template System

Use React/TSX as the template language. Modern devs already know it.

Our proprietary layer should be the contract:

- template hierarchy
- page data shapes
- platform components
- route helpers
- action helpers

Example structure:

```text
skins/my-skin/
  skin.json
  pages/
    home.tsx
    artist.tsx
    release.tsx
    search.tsx
    library.tsx
    login.tsx
  components/
    ReleaseCard.tsx
    ArtistHero.tsx
  styles.css
```

Example template:

```tsx
import { Page, PlayerButton, FavoriteButton, ArtistLink, usePageData } from "@musiccommunity/skin";

export default function ReleasePage() {
  const { release, tracks } = usePageData<"release">();

  return (
    <Page>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-5xl font-black">{release.title}</h1>
        <ArtistLink artist={release.artist} />
        <PlayerButton item={release} />
        <FavoriteButton item={release} />

        <ol className="mt-8 space-y-3">
          {tracks.map((track) => (
            <li key={track.id}>{track.title}</li>
          ))}
        </ol>
      </main>
    </Page>
  );
}
```

## Tailwind

Support Tailwind in skins.

Do not force skins to inherit our current Tailwind markup. Instead:

- skins can use Tailwind freely
- default skin can ship with Tailwind
- each skin can include its own CSS
- platform components expose stable class hooks
- tokens remain available for simple theming

Tailwind is a tool for skin authors, not the skin architecture.

## Page Contracts

Start with public pages only:

- home
- artist/profile
- release/playlist
- search
- library/browse
- static page
- login/register

Keep admin and studio core-owned at first. They can get smaller extension slots later.

## Platform Components

Expose a small blessed component kit:

- `Page`
- `Link`
- `ArtistLink`
- `ReleaseLink`
- `PlayerButton`
- `FavoriteButton`
- `FollowButton`
- `AuthGate`
- `UploadDropzone`
- `FormattedDuration`
- `ShareButton`

These keep platform behavior working while skins control presentation.

## Mobile App Angle

The mobile app should use the same platform contracts:

- same API
- same auth
- same player concepts
- same release/profile/search data
- same white-label brand settings

First mobile option:

- branded Capacitor app
- web runtime inside native shell
- push notifications later
- per-customer app icons/splash/name

Long-term premium option:

- native app shell
- shared SDK/data contracts
- skin-like mobile screen presets
- app store deployment package

This is a high-ticket differentiator: "your community, your website, your app."

## First Build

1. Create `apps/community-web`.
2. Reuse the generated SDK.
3. Build `@musiccommunity/skin` package.
4. Define page contracts for home, artist, release, search.
5. Build one default skin.
6. Prove we can swap in a second skin without changing core.
7. Keep admin/studio linked to existing core pages or rebuilt as protected core screens.

## Success Test

A developer can create a new skin by editing a small set of files, use Tailwind if they want, access our data/actions safely, and ship a site that does not feel like Playlisted with a different logo.

