# Playlister Plan

## 1. Product Direction

### Working concept
Playlister is an audio-sharing platform that combines:
- the browsing and playback convenience of YouTube Music
- the editorial taste and discovery framing of Pitchfork
- a creator-friendly publishing workflow for artists, bands, DJs, and podcasters

### Core problem to solve
Most indie audio platforms feel empty because they launch as generic upload libraries without strong curation, identity, or reasons to return.

### Differentiation strategy
To avoid becoming "just another empty community," Playlister should focus on 3 pillars:
1. **Editorial discovery first** — homepage sections, featured releases, editor picks, site news, themed mixes
2. **Playlist-as-publishing model** — every recording belongs to a playlist, which doubles as an album/channel/release container
3. **Taste-driven identity** — curated scenes, genres, moods, local spotlights, staff notes, release writeups, not just raw uploads

## 2. MVP Goals

The MVP should prove that users can:
- register/login
- upload audio
- create and manage playlists
- play audio continuously across navigation
- discover featured and recent content on the homepage
- search songs and playlists
- view member and playlist pages

The MVP should also prove that admins/editors can seed the platform with enough curated content to make it feel alive.

## 3. User Types

### Listeners
- browse homepage sections
- play music continuously
- favorite tracks/playlists
- search songs and playlists
- view artist/member profiles

### Creators
- create playlists (albums/channels)
- upload multiple recordings
- edit metadata and artwork
- reorder tracks
- toggle playlist visibility

### Editors/Admins
- feature playlists/releases
- publish editor picks and site news
- shape homepage discovery modules
- moderate content

## 4. Site Architecture

### Primary pages
1. **Homepage**
   - favorites
   - recently listened
   - from your library
   - featured playlists
   - custom mix
   - new releases
   - new artists
   - trending
   - editor picks
   - site news
   - use 3 alternating row styles for visual rhythm:
     - square cards
     - circular artist-style cards
     - wide rectangular feature cards

2. **Member Page**
   - hero image
   - profile details
   - public playlists
   - possibly featured release / pinned playlist

3. **Playlist Page**
   - cover art
   - title, description, creator
   - persistent media player integration
   - track/podcast list
   - add audio to playlist flow
   - for artists: playlist acts like album/release
   - for podcasters: playlist acts like channel/show

4. **Create/Edit Playlist Page**
   - batch upload
   - multi-delete
   - drag/sort recordings
   - edit song/podcast details
   - upload/change cover art
   - change title and description
   - toggle visibility

5. **Search Results Page**
   - tabs or grouped results for songs and playlists
   - category/genre chips
   - sorting/filtering

6. **Login/Register**
   - simple auth flow

### Persistent navigation/layout
7. **Top Bar**
   - hamburger menu
   - search input
   - auth widget / user menu

8. **Sidebar Menu**
   - upload music
   - new playlist
   - list of playlists

9. **Bottom Music Player**
   - persistent across route changes
   - SPA playback state
   - queue, next/previous, seek, play/pause

## 5. Feature Priorities

### Phase 1: Foundation
- auth (login/register/logout)
- global app shell
- persistent top bar, sidebar, bottom player
- SPA routing
- audio playback state management

### Phase 2: Content Model
- users/members
- playlists
- tracks/episodes
- favorites
- recently played
- playlist visibility
- upload storage and metadata

### Phase 3: Creator Tools
- create playlist
- edit playlist
- batch upload audio
- reorder items
- delete items
- artwork upload
- metadata editing

### Phase 4: Discovery
- homepage modules
- featured playlists
- new releases
- trending
- editor picks
- search + chips/filters

### Phase 5: Retention / Identity
- staff notes/editorials
- scene/genre pages
- recommended mixes
- listener library improvements
- follow creators/playlists

## 6. Recommended MVP Scope

To keep the first version focused, include:
- auth
- homepage with seeded curated rows
- member page
- playlist page
- create/edit playlist page
- search page
- persistent player

Defer until later:
- social comments
- direct messaging
- advanced recommendation engine
- monetization
- live streaming
- full community features

## 7. UX / Design Direction

### Visual goals
- dark, immersive audio-first interface
- strong artwork presentation
- magazine/editorial feeling for featured content
- varied row layouts so the homepage feels curated rather than repetitive

### Homepage row system
Create a reusable content-row system with 3 alternating layouts:
1. **Grid Row** — square covers for albums/playlists
2. **Artist Row** — circular images for artists/creators
3. **Feature Row** — wide rectangular banners for editorial picks, site news, spotlight releases

### Important UX principles
- playback should never feel interrupted
- creator publishing flow should be simple and fast
- homepage should never look empty
- every page should encourage exploration of another playlist or artist

## 8. Data Model Outline

### User
- id
- username
- display_name
- bio
- avatar
- hero_image
- role (listener, creator, editor, admin)

### Playlist
- id
- owner_id
- title
- description
- cover_art
- type (album, mix, podcast, playlist)
- visibility (public/private/unlisted)
- featured flag
- created_at
- updated_at

### Recording
- id
- playlist_id
- title
- description
- audio_url
- artwork
- duration
- track_number
- category/genre
- type (song/podcast)

### Activity / Discovery support
- favorites
- recently_played
- featured_slots
- editorial_posts
- trending metrics

## 9. Technical Plan

### Frontend
- SPA architecture
- persistent layout shell
- shared global player state
- reusable card and row components
- upload/edit forms for creator tools

### Backend
- auth system
- media storage for audio + images
- CRUD for playlists and recordings
- search endpoint for songs/playlists
- featured/editorial management
- listening history + favorites

### Key implementation concern
The persistent bottom player should be architected early so playback survives route changes. This is one of the defining UX requirements.

## 10. Content Strategy Before Launch

To prevent the platform from feeling empty at launch:
- seed it with featured playlists and demo creators
- prepare editor picks and site news posts
- curate a small but polished genre spread
- create 10–20 strong sample playlists/albums/channels
- spotlight a few distinct scenes or moods

## 11. Unique Ideas Worth Exploring

These can make Playlister feel more distinct:
- **Editor notes on releases** — short writeups attached to featured playlists
- **Scene pages** — local scenes, niche genres, communities
- **Listening journeys** — curated paths like "Start here," "Late night," "New underground"
- **Creator drops** — highlighted release events or premieres
- **Playlist covers with strong art direction** — platform identity built through presentation

## 12. Suggested Build Order

1. Define data model and routing
2. Build app shell (top bar, sidebar, bottom player)
3. Implement auth
4. Implement playlist + recording CRUD
5. Build playlist detail page
6. Build create/edit playlist flow with uploads
7. Build homepage sections with seeded content
8. Build member page
9. Build search page
10. Add favorites, recently played, and discovery polish

## 13. Immediate Next Tasks

### Product
- finalize the unique positioning statement
- decide whether launch audience is indie musicians, DJs, podcasters, or mixed creators
- decide the initial genre/editorial focus

### UX
- sketch homepage row variations
- define playlist page layout
- define creator upload workflow

### Engineering
- choose stack for frontend, backend, database, and storage
- define schema for users, playlists, recordings, favorites, and activity
- design persistent player state architecture

## 14. One-Sentence Product Positioning

**Playlister is a curated audio publishing and discovery platform where playlists act as albums, channels, and mixes, combining continuous listening with editorial taste and creator-first publishing tools.**
