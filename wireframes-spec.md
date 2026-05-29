# MusicPop Wireframes + Page Specs

This document turns the product plan into low-fidelity page wireframes and implementation-ready UI specs.

---

## 0. Global App Shell

These elements persist across most authenticated pages.

### 0.1 Top Bar

**Purpose**
- global navigation
- fast search
- account access
- entry point for mobile sidebar

**Desktop layout**
```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [☰] MusicPop        [ Search songs, playlists, artists...        ] [User ▼] │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Mobile layout**
```text
┌──────────────────────────────────────────┐
│ [☰] MusicPop                 [User/Icon] │
│ [ Search...                              ] │
└──────────────────────────────────────────┘
```

**Elements**
- hamburger button
- wordmark/logo
- search input
- auth widget:
  - logged out: Log in / Sign up
  - logged in: avatar, name, dropdown

**Interactions**
- hamburger opens/closes sidebar on mobile
- search submits to `/search?q=`
- auth widget opens account menu

**States**
- default
- search focused
- logged out
- logged in
- mobile collapsed

---

### 0.2 Sidebar

**Purpose**
- primary navigation
- creator shortcuts
- user playlist library

**Desktop wireframe**
```text
┌──────────────────────┐
│ Discover             │
│ Home                 │
│ Trending             │
│ New Releases         │
│ Editor Picks         │
│                      │
│ Library              │
│ Favorites            │
│ Recently Played      │
│ Your Playlists       │
│                      │
│ Create               │
│ + Upload Music       │
│ + New Playlist       │
│                      │
│ Playlists            │
│ - Night Drive        │
│ - Tape Experiments   │
│ - Podcast Cuts       │
└──────────────────────┘
```

**Sections**
- Discover
- Library
- Create
- User playlists list

**Interactions**
- collapse/expand groups
- playlist click navigates directly
- create actions open upload/create page

**Mobile behavior**
- drawer overlay
- dismiss on outside click or route change

---

### 0.3 Persistent Bottom Player

**Purpose**
- continuous playback across route changes
- queue and playback controls

**Wireframe**
```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Art] Track Title — Artist      [♥]   [◀◀] [▶/▌▌] [▶▶]   1:12 / 3:44 [Queue] │
│                    ─────────────── progress / seek bar ──────────────────── │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Core elements**
- current track art
- title + creator
- play/pause
- previous/next
- seek bar
- elapsed / duration
- favorite
- queue toggle
- volume (desktop)

**Important requirements**
- playback must continue when changing routes
- queue can be created from playlist, homepage row, or search results
- clicking current track opens playlist or track context

**States**
- idle / no track loaded
- loading
- playing
- paused
- error
- queue open

---

## 1. Homepage

**Route**: `/`

**Purpose**
- make the platform feel active and curated
- let listeners resume playback quickly
- drive discovery through varied editorial rows

### 1.1 Page structure

```text
┌──────────────────────────────── Main Content ────────────────────────────────┐
│ Welcome back, {Name}                                                         │
│                                                                              │
│ [Featured Hero / Editorial Spotlight]                                        │
│                                                                              │
│ Favorites                    [View all]                                      │
│ [■] [■] [■] [■] [■]                                                         │
│                                                                              │
│ New Artists                  [View all]                                      │
│ (●) (●) (●) (●) (●)                                                         │
│                                                                              │
│ Editor Picks                 [View all]                                      │
│ [▬▬ wide feature ▬▬] [▬▬ wide feature ▬▬]                                   │
│                                                                              │
│ Recently Listened            [View all]                                      │
│ [■] [■] [■] [■] [■]                                                         │
│                                                                              │
│ Trending                     [View all]                                      │
│ [■] [■] [■] [■] [■]                                                         │
│                                                                              │
│ Site News                    [View all]                                      │
│ [▬▬ card ▬▬] [▬▬ card ▬▬]                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Sections

**Hero module**
- one featured release, playlist, or editorial spotlight
- background image + title + short summary + CTA buttons
- actions:
  - Play now
  - Open playlist
  - Read editor note (optional)

**Personalized rows**
- Favorites
- Recently listened
- From your library
- Custom mix

**Discovery rows**
- Featured playlists
- New releases
- New artists
- Trending
- Editor picks
- Site news

### 1.3 Card types

**A. Square card**
Used for playlists/albums/mixes.
```text
┌──────────┐
│  Cover   │
└──────────┘
Title
Creator
```

**B. Circular artist card**
Used for artists/members.
```text
   (Avatar)
Artist Name
Genre / Tag
```

**C. Wide feature card**
Used for editorials/news/spotlights.
```text
┌───────────────────────┐
│  image/banner         │
│  Title                │
│  short summary        │
└───────────────────────┘
```

### 1.4 Interactions
- play button on hover for playable cards
- save/favorite quick action
- horizontal row scroll on mobile
- "View all" may open dedicated collection pages later

### 1.5 Empty/loading states
- skeleton loaders per row
- if user has no favorites/recent items, replace with editorial recommendations
- no empty blank rails

### 1.6 Engineering notes
- homepage should be driven by modular row config
- each row should support `title`, `type`, `items`, `layout`, `cta`
- editorial rows should be manageable in admin later

---

## 2. Member Page

**Route**: `/member/:username`

**Purpose**
- present creator identity
- showcase public playlists/releases
- provide a single destination for artist, DJ, or podcaster presence

### 2.1 Wireframe

```text
┌──────────────────────────────── Hero Banner ────────────────────────────────┐
│                                                                              │
│                       large creator hero image                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ [Avatar]  Display Name                    [Follow] [Share]                  │
│          @username                                                          │
│          short bio / genre tags / location                                  │
│                                                                              │
│ Pinned Release                                                               │
│ [Large featured playlist card]                                               │
│                                                                              │
│ Public Playlists                         [Sort ▼]                            │
│ [■] [■] [■] [■]                                                             │
│ [■] [■] [■] [■]                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Sections
- hero image
- profile identity block
- optional pinned playlist/release
- public playlist grid
- optional about section or links later

### 2.3 Fields shown
- avatar
- display name
- username
- bio
- tags/genres
- maybe counts later:
  - playlists
  - followers
  - monthly listeners (future)

### 2.4 Actions
- follow creator (future-friendly, can be hidden in MVP)
- share profile
- play pinned release
- click any playlist card

### 2.5 Empty states
- no public playlists: show profile info and a message like "No public releases yet"
- if own profile: show CTA to create playlist

### 2.6 Notes
- keep this page clean and creator-centric
- avoid cluttering with too much social functionality in MVP

---

## 3. Playlist Page

**Route**: `/playlist/:id`

**Purpose**
- this is the core content page
- a playlist acts as album, release, mix, or podcast channel

### 3.1 Top section wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [ Cover Art ]   Playlist Title                                               │
│                by Creator Name                                               │
│                type: Album / Playlist / Podcast                              │
│                description text...                                           │
│                                                                              │
│                [Play] [Shuffle] [Favorite] [Share] [Edit*]                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tracklist wireframe

```text
┌──────────────────────────────── Track List ─────────────────────────────────┐
│ #   Title                    Info                     Duration   Actions     │
│ 1   First Track              song / tag / date         3:44      [⋯]        │
│ 2   Second Track             song / tag / date         4:12      [⋯]        │
│ 3   Third Track              podcast / tag             28:10     [⋯]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Lower sections
Optional but useful:
- creator mini-card
- related playlists
- editor note / release note
- comments later, not MVP

### 3.4 Core actions
- play playlist from first item
- play specific track
- add track to queue
- favorite playlist
- share
- if owner:
  - edit playlist
  - add audio
  - reorder/manage tracks

### 3.5 Track row interactions
- clicking title plays track
- clicking row can select/highlight current track
- kebab menu:
  - play next
  - add to queue
  - copy link
  - remove from playlist (owner only)

### 3.6 Podcast compatibility
For podcast playlists:
- episodes may show publish date more prominently
- longer descriptions can expand inline or in a detail panel

### 3.7 States
- loading skeleton for header and rows
- private playlist unauthorized state
- playlist with no tracks yet
- upload in progress if owner adds files directly here

### 3.8 Notes
- current playing track should be visibly highlighted
- playlist page should be a strong candidate for the app's default queue source

---

## 4. Create Playlist Page

**Route**: `/playlists/new`

**Purpose**
- let users create a new empty playlist quickly
- then proceed to upload/manage recordings

### 4.1 Wireframe

```text
┌────────────────────────────── Create Playlist ──────────────────────────────┐
│ Cover Art Upload                                                            │
│ [  image dropzone  ]                                                        │
│                                                                              │
│ Title *                                                                      │
│ [____________________________]                                               │
│                                                                              │
│ Description                                                                  │
│ [______________________________________________________________]            │
│                                                                              │
│ Type                                                                         │
│ ( ) Album   ( ) Playlist   ( ) Mix   ( ) Podcast                            │
│                                                                              │
│ Visibility                                                                   │
│ ( ) Public  ( ) Private  ( ) Unlisted                                        │
│                                                                              │
│ [Cancel]                                             [Create Playlist]       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Required fields
- title
- type
- visibility

### 4.3 Optional fields
- cover art
- description

### 4.4 Success path
After create:
- redirect to edit/manage page
- optionally open upload drawer immediately

---

## 5. Edit Playlist / Manage Recordings Page

**Route**: `/playlist/:id/edit`

**Purpose**
- creator control center for one playlist
- upload, edit, sort, delete, and publish recordings

### 5.1 Full page wireframe

```text
┌──────────────────────────── Edit Playlist ──────────────────────────────────┐
│ [Cover]   Title [_____________________]                                     │
│           Description [______________________________]                      │
│           Type [Album ▼]   Visibility [Public ▼]                            │
│           [Save Changes]                                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── Upload Panel ───────────────────────────────────┐
│ [ Drag audio files here ]  [Select files]                                   │
│ Queued uploads: 3                                                           │
│ file1.mp3  uploading...                                                     │
│ file2.wav  ready                                                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── Recording Manager ──────────────────────────────┐
│ [Select all] [Delete selected] [Auto-sort]                                  │
│                                                                              │
│ ☰ 1  Title [_______________]  Type [Song ▼]  Genre [____]  [Delete]         │
│ ☰ 2  Title [_______________]  Type [Song ▼]  Genre [____]  [Delete]         │
│ ☰ 3  Title [_______________]  Type [Podcast ▼] [Expand]                     │
│                                                                              │
│ [Save Order]                                            [Publish/Update]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Sections
- playlist metadata editor
- cover art uploader
- bulk audio upload area
- recordings table/list
- metadata editor per recording
- multi-select delete
- drag-to-reorder

### 5.3 Recording fields
Per recording:
- title
- description
- artwork optional
- type: song/podcast
- genre/category
- track number/order
- duration (derived)

### 5.4 Actions
- upload multiple files at once
- remove uploaded item before save
- edit metadata inline
- reorder tracks via drag handle
- multi-delete selected items
- save draft / publish update

### 5.5 Validation
- block publish if required audio processing failed
- show invalid file types clearly
- preserve unsaved work warning on navigation

### 5.6 Important UX notes
- bulk upload should feel fast and forgiving
- metadata editing should not require separate modal for every track
- use autosave only if reliable; otherwise provide explicit save feedback

---

## 6. Search Results Page

**Route**: `/search?q=query`

**Purpose**
- search across songs, playlists, and creators
- help users narrow by category/genre quickly

### 6.1 Wireframe

```text
┌──────────────────────────── Search Results ─────────────────────────────────┐
│ Search: [ ambient house                                      ] [Search]      │
│                                                                              │
│ Chips: [All] [Songs] [Playlists] [Artists] [Podcasts] [Electronic] [Live]   │
│ Sort: [Relevance ▼]                                                          │
│                                                                              │
│ Top Result                                                                   │
│ [Large card with primary match]                                              │
│                                                                              │
│ Songs                                                                        │
│ 1  Track Name — Artist                                  3:33   [Play] [⋯]   │
│ 2  Track Name — Artist                                  4:01   [Play] [⋯]   │
│                                                                              │
│ Playlists                                                                    │
│ [■] [■] [■] [■]                                                             │
│                                                                              │
│ Artists                                                                      │
│ (●) (●) (●)                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Search modes
- all
- songs
- playlists
- artists
- podcasts

### 6.3 Filters / chips
Initial chip ideas:
- genre tags
- content type
- maybe mood/theme later

### 6.4 Interactions
- pressing enter updates route query
- clicking chips updates filters
- track play button starts playback without leaving search
- clicking result opens detail page

### 6.5 Empty states
- no results for query
- suggest alternate genres or featured content
- show recent/popular searches later if useful

### 6.6 Notes
- search should prioritize exact title matches, then relevant playlists, then creators
- top result helps avoid a flat, overwhelming list

---

## 7. Login Page

**Route**: `/login`

**Purpose**
- quick sign-in with minimal friction

### 7.1 Wireframe

```text
┌─────────────────────────────── Login ───────────────────────────────────────┐
│ MusicPop                                                                     │
│ Welcome back                                                                 │
│                                                                              │
│ Email                                                                         │
│ [____________________________]                                               │
│ Password                                                                      │
│ [____________________________]                                               │
│                                                                              │
│ [ Log In ]                                                                    │
│                                                                              │
│ Don't have an account? [Sign up]                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Requirements
- email + password
- clear error messaging
- success redirects to intended page or homepage

### 7.3 Optional later
- social auth
- forgot password

---

## 8. Register Page

**Route**: `/register`

**Purpose**
- create account fast enough for both listeners and creators

### 8.1 Wireframe

```text
┌────────────────────────────── Register ─────────────────────────────────────┐
│ Join MusicPop                                                                 │
│                                                                              │
│ Username                                                                      │
│ [____________________________]                                               │
│ Display name                                                                  │
│ [____________________________]                                               │
│ Email                                                                         │
│ [____________________________]                                               │
│ Password                                                                      │
│ [____________________________]                                               │
│                                                                              │
│ I am primarily a:                                                             │
│ ( ) Listener   ( ) Artist/DJ   ( ) Podcaster                                 │
│                                                                              │
│ [ Create account ]                                                            │
│                                                                              │
│ Already have an account? [Log in]                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Required fields
- username
- display name
- email
- password

### 8.3 Optional product choice
- primary role selection can personalize onboarding later

---

## 9. Shared Components Spec

### 9.1 Playlist Card
**Used on** homepage, member page, search

**Fields**
- cover art
- title
- creator
- optional subtitle: type / year / genre

**Actions**
- open playlist
- hover play
- favorite

### 9.2 Artist Card
**Used on** homepage, search

**Fields**
- avatar/portrait
- display name
- short genre line

### 9.3 Feature Card
**Used on** homepage editorials/news

**Fields**
- banner image
- title
- deck/summary
- CTA label

### 9.4 Track Row
**Used on** playlist page, search results, queue

**Fields**
- index/art
- title
- creator
- metadata
- duration

**Actions**
- play
- add to queue
- menu

---

## 10. Responsive Behavior

### Desktop
- sidebar visible
- multiple cards per row
- full player controls with queue and volume

### Tablet
- tighter card widths
- sidebar may collapse
- fewer columns in grids

### Mobile
- sidebar becomes drawer
- homepage rows become horizontal carousels
- playlist header stacks vertically
- bottom player becomes compact mini-player with expandable full player

---

## 11. MVP Build Order for UI

1. Global app shell
   - top bar
   - sidebar
   - bottom player
2. Homepage rows + reusable card components
3. Playlist page
4. Create/edit playlist flow
5. Member page
6. Search page
7. Login/register

---

## 12. Open Product Questions

Before high-fidelity design or implementation, decide:
- should artists and podcasters share identical profile layout?
- should playlist type change visible labels and metadata on page?
- is "favorites" for tracks only, playlists only, or both?
- do we need separate pages for news/editorial posts in MVP?
- should there be a mini onboarding flow after registration?

---

## 13. Recommended Next Step

Turn these wireframes into:
1. a **component inventory** (`AppShell`, `ContentRow`, `PlaylistCard`, `TrackTable`, etc.)
2. a **route-by-route implementation checklist**
3. optionally a **single HTML mockup** for the homepage and playlist page first
