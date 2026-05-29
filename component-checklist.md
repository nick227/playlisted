# MusicPop Component Checklist

This checklist converts the wireframes into implementation units.

---

## 1. App Shell Components

### 1.1 `AppShell`
**Purpose**
- root authenticated layout
- composes top bar, sidebar, main content area, and bottom player

**Responsibilities**
- persistent layout across route changes
- reserve bottom space for player
- coordinate mobile sidebar open/close state

**Props / Inputs**
- `children`
- `user`
- `isAuthenticated`

**Depends on**
- `TopBar`
- `Sidebar`
- `BottomPlayer`

**Checklist**
- [ ] desktop layout structure
- [ ] mobile layout structure
- [ ] content area scroll behavior
- [ ] bottom padding for persistent player
- [ ] z-index layering for overlays/drawers

---

### 1.2 `TopBar`
**Purpose**
- global navigation and search

**Subcomponents**
- `HamburgerButton`
- `Logo`
- `SearchBar`
- `AuthWidget`

**Checklist**
- [ ] logo/brand area
- [ ] hamburger button
- [ ] desktop search input
- [ ] mobile search layout
- [ ] auth widget states: logged out / logged in
- [ ] sticky positioning if desired
- [ ] keyboard focus states

---

### 1.3 `Sidebar`
**Purpose**
- primary navigation + library shortcuts

**Subcomponents**
- `NavSection`
- `NavLink`
- `PlaylistNavList`
- `CreateActions`

**Checklist**
- [ ] discover links
- [ ] library links
- [ ] create links
- [ ] user playlist list
- [ ] active-route styling
- [ ] collapsible behavior for smaller screens
- [ ] mobile drawer mode
- [ ] overlay close behavior

---

### 1.4 `BottomPlayer`
**Purpose**
- persistent playback UI

**Subcomponents**
- `PlayerNowPlaying`
- `PlayerControls`
- `PlayerSeekBar`
- `PlayerVolume`
- `PlayerQueueToggle`

**Checklist**
- [ ] no-track idle state
- [ ] loading state
- [ ] playing state
- [ ] paused state
- [ ] error state
- [ ] previous / play-pause / next controls
- [ ] seek bar interaction
- [ ] elapsed + duration display
- [ ] queue toggle
- [ ] volume control on desktop
- [ ] mobile compact mode

---

## 2. Playback / Audio State Components

### 2.1 `AudioPlayerProvider`
**Purpose**
- global state for playback and queue

**Checklist**
- [ ] current track state
- [ ] queue state
- [ ] play / pause / seek actions
- [ ] next / previous actions
- [ ] set queue from playlist
- [ ] append to queue
- [ ] preserve playback across route changes
- [ ] handle audio ended event
- [ ] handle media load/error events

---

### 2.2 `QueuePanel`
**Purpose**
- show upcoming tracks/episodes

**Checklist**
- [ ] drawer or panel UI
- [ ] current track highlight
- [ ] reorder support later if desired
- [ ] remove item from queue
- [ ] play specific queued item
- [ ] empty queue state

---

## 3. Shared Discovery Components

### 3.1 `ContentRow`
**Purpose**
- reusable homepage/discovery row wrapper

**Props**
- `title`
- `items`
- `layout` (`square`, `circle`, `feature`, `trackList`)
- `viewAllHref`

**Checklist**
- [ ] row title
- [ ] optional subtitle/description
- [ ] view all CTA
- [ ] horizontal scroll behavior
- [ ] skeleton loading state
- [ ] empty fallback state

---

### 3.2 `SectionHeader`
**Purpose**
- consistent title + action header

**Checklist**
- [ ] title text
- [ ] optional supporting text
- [ ] optional CTA link/button

---

### 3.3 `HeroSpotlight`
**Purpose**
- featured homepage hero

**Checklist**
- [ ] background image/banner
- [ ] title
- [ ] summary text
- [ ] primary CTA: play
- [ ] secondary CTA: open/read more
- [ ] responsive stacking behavior

---

## 4. Card Components

### 4.1 `PlaylistCard`
**Used on**
- homepage
- member page
- search
- related playlists

**Checklist**
- [ ] cover art
- [ ] title
- [ ] creator name
- [ ] optional subtitle metadata
- [ ] hover/focus play affordance
- [ ] favorite/save action
- [ ] click-through navigation
- [ ] loading skeleton

---

### 4.2 `ArtistCard`
**Used on**
- homepage
- search

**Checklist**
- [ ] circular avatar image
- [ ] artist/member display name
- [ ] genre/tag line
- [ ] click-through navigation
- [ ] loading skeleton

---

### 4.3 `FeatureCard`
**Used on**
- homepage editor picks
- site news
- spotlight content

**Checklist**
- [ ] banner image
- [ ] title
- [ ] short summary/deck
- [ ] CTA text
- [ ] visual emphasis style

---

### 4.4 `TrackRow`
**Used on**
- playlist page
- search results
- queue
- recent playback lists

**Checklist**
- [ ] track index or artwork
- [ ] title
- [ ] creator
- [ ] metadata line
- [ ] duration
- [ ] play interaction
- [ ] current track highlight state
- [ ] kebab/action menu

---

## 5. Homepage Components

### 5.1 `HomePage`
**Checklist**
- [ ] welcome header
- [ ] featured hero module
- [ ] favorites row
- [ ] recently listened row
- [ ] library row
- [ ] featured playlists row
- [ ] custom mix row
- [ ] new releases row
- [ ] new artists row
- [ ] trending row
- [ ] editor picks row
- [ ] site news row
- [ ] fallback content when user data is empty

---

### 5.2 `HomeFeedBuilder` or row config
**Purpose**
- map row definitions to UI components

**Checklist**
- [ ] row config model
- [ ] alternating row layouts
- [ ] support personalized vs editorial rows
- [ ] support feature cards and artist cards in same page config

---

## 6. Member Page Components

### 6.1 `MemberPage`
**Checklist**
- [ ] hero image
- [ ] avatar/profile block
- [ ] display name + username
- [ ] bio
- [ ] genre/location/tags
- [ ] pinned release section
- [ ] public playlists grid
- [ ] empty state for no playlists

---

### 6.2 `ProfileHero`
**Checklist**
- [ ] hero background image
- [ ] avatar
- [ ] name/handle block
- [ ] follow/share actions (future-safe)
- [ ] responsive layout

---

### 6.3 `PinnedReleaseCard`
**Checklist**
- [ ] large featured playlist presentation
- [ ] play CTA
- [ ] open playlist CTA

---

## 7. Playlist Page Components

### 7.1 `PlaylistPage`
**Checklist**
- [ ] playlist hero/header
- [ ] cover art
- [ ] title
- [ ] creator link
- [ ] type badge
- [ ] description
- [ ] playlist actions
- [ ] track list/table
- [ ] related playlists section
- [ ] creator mini-card or context section
- [ ] empty playlist state
- [ ] unauthorized private state

---

### 7.2 `PlaylistHeader`
**Checklist**
- [ ] cover art
- [ ] title and metadata
- [ ] creator info
- [ ] play button
- [ ] shuffle button
- [ ] favorite button
- [ ] share button
- [ ] edit button for owner only

---

### 7.3 `TrackList`
**Checklist**
- [ ] header row
- [ ] list of `TrackRow`
- [ ] current item highlight
- [ ] click row to play
- [ ] keyboard navigation if possible
- [ ] owner actions where applicable

---

### 7.4 `TrackActionsMenu`
**Checklist**
- [ ] play next
- [ ] add to queue
- [ ] copy link
- [ ] owner remove action

---

## 8. Playlist Creation / Editing Components

### 8.1 `CreatePlaylistPage`
**Checklist**
- [ ] cover upload area
- [ ] title input
- [ ] description input
- [ ] type selector
- [ ] visibility selector
- [ ] cancel action
- [ ] submit action
- [ ] validation messaging

---

### 8.2 `PlaylistForm`
**Purpose**
- shared form for create and edit

**Checklist**
- [ ] reusable controlled inputs
- [ ] create mode
- [ ] edit mode
- [ ] validation rules
- [ ] submission/loading state
- [ ] success/error feedback

---

### 8.3 `CoverArtUploader`
**Checklist**
- [ ] image preview
- [ ] drag-and-drop support
- [ ] file picker fallback
- [ ] replace/remove image
- [ ] validation for type/size

---

### 8.4 `EditPlaylistPage`
**Checklist**
- [ ] metadata section
- [ ] save changes action
- [ ] upload panel
- [ ] upload queue list
- [ ] recording manager table/list
- [ ] bulk actions
- [ ] drag-to-reorder
- [ ] publish/update action
- [ ] unsaved changes warning

---

### 8.5 `AudioUploadDropzone`
**Checklist**
- [ ] drag-and-drop upload
- [ ] multi-file selection
- [ ] file type validation
- [ ] upload progress display
- [ ] upload error display
- [ ] retry/remove failed upload

---

### 8.6 `UploadQueueList`
**Checklist**
- [ ] filename display
- [ ] progress state
- [ ] success state
- [ ] failure state
- [ ] remove from queue action

---

### 8.7 `RecordingManager`
**Checklist**
- [ ] multi-select checkboxes
- [ ] select all
- [ ] delete selected
- [ ] inline metadata editing
- [ ] drag handles for sorting
- [ ] save order action
- [ ] responsive mobile fallback

---

### 8.8 `RecordingEditorRow`
**Checklist**
- [ ] title field
- [ ] type selector
- [ ] genre/category field
- [ ] optional description toggle
- [ ] artwork edit later or inline
- [ ] delete action

---

## 9. Search Components

### 9.1 `SearchPage`
**Checklist**
- [ ] query input synced to route
- [ ] filter chips
- [ ] sort dropdown
- [ ] top result block
- [ ] songs result section
- [ ] playlists result section
- [ ] artists result section
- [ ] no results state
- [ ] loading state

---

### 9.2 `SearchFilterChips`
**Checklist**
- [ ] all filter
- [ ] songs filter
- [ ] playlists filter
- [ ] artists filter
- [ ] podcasts filter
- [ ] genre chips
- [ ] active chip styles

---

### 9.3 `TopResultCard`
**Checklist**
- [ ] visually prominent result block
- [ ] support playlist or track result
- [ ] play action
- [ ] open action

---

### 9.4 `SearchResultSections`
**Checklist**
- [ ] track rows section
- [ ] playlist cards section
- [ ] artist cards section
- [ ] optional pagination/load more

---

## 10. Auth Components

### 10.1 `LoginPage`
**Checklist**
- [ ] email input
- [ ] password input
- [ ] submit button
- [ ] error message area
- [ ] link to register
- [ ] loading state

---

### 10.2 `RegisterPage`
**Checklist**
- [ ] username input
- [ ] display name input
- [ ] email input
- [ ] password input
- [ ] primary role selection
- [ ] submit button
- [ ] error message area
- [ ] link to login
- [ ] loading state

---

### 10.3 `AuthWidget`
**Checklist**
- [ ] logged out buttons
- [ ] logged in avatar
- [ ] account dropdown menu
- [ ] logout action

---

## 11. Utility / Feedback Components

### 11.1 `EmptyState`
**Used for**
- no favorites
- no playlists
- no search results
- empty queue

**Checklist**
- [ ] icon/illustration slot
- [ ] title
- [ ] explanation text
- [ ] optional CTA

---

### 11.2 `Skeleton`
**Checklist**
- [ ] card skeleton
- [ ] row skeleton
- [ ] page header skeleton
- [ ] track row skeleton

---

### 11.3 `Toast` or `InlineAlert`
**Checklist**
- [ ] success feedback
- [ ] error feedback
- [ ] upload status feedback
- [ ] save confirmation

---

### 11.4 `Modal` / `Drawer`
**Likely uses**
- queue panel
- confirm delete
- mobile nav

**Checklist**
- [ ] focus trapping
- [ ] escape key close
- [ ] overlay click close where appropriate

---

## 12. Data / API Integration Checklist

### 12.1 Homepage data
- [ ] fetch personalized rows
- [ ] fetch editorial rows
- [ ] merge row config + content

### 12.2 Member data
- [ ] fetch profile by username
- [ ] fetch public playlists
- [ ] fetch pinned release

### 12.3 Playlist data
- [ ] fetch playlist detail
- [ ] fetch track list
- [ ] fetch related playlists
- [ ] owner permissions

### 12.4 Playlist editing
- [ ] create playlist mutation
- [ ] update playlist mutation
- [ ] upload audio mutation/process
- [ ] reorder recordings mutation
- [ ] delete recording mutation

### 12.5 Search
- [ ] query endpoint
- [ ] filter params
- [ ] sort params

### 12.6 Auth
- [ ] register mutation
- [ ] login mutation
- [ ] session fetch
- [ ] logout mutation

---

## 13. Recommended Implementation Order

### Phase A: Core layout + state
- [ ] `AudioPlayerProvider`
- [ ] `AppShell`
- [ ] `TopBar`
- [ ] `Sidebar`
- [ ] `BottomPlayer`
- [ ] `QueuePanel`

### Phase B: Shared UI primitives
- [ ] `SectionHeader`
- [ ] `ContentRow`
- [ ] `PlaylistCard`
- [ ] `ArtistCard`
- [ ] `FeatureCard`
- [ ] `TrackRow`
- [ ] `EmptyState`
- [ ] `Skeleton`

### Phase C: Core pages
- [ ] `HomePage`
- [ ] `PlaylistPage`
- [ ] `MemberPage`
- [ ] `SearchPage`

### Phase D: Creator workflow
- [ ] `PlaylistForm`
- [ ] `CreatePlaylistPage`
- [ ] `EditPlaylistPage`
- [ ] `CoverArtUploader`
- [ ] `AudioUploadDropzone`
- [ ] `RecordingManager`

### Phase E: Auth
- [ ] `LoginPage`
- [ ] `RegisterPage`
- [ ] `AuthWidget`

---

## 14. Suggested Folder Structure

```text
src/
  components/
    app-shell/
      AppShell
      TopBar
      Sidebar
      BottomPlayer
      QueuePanel
    discovery/
      ContentRow
      SectionHeader
      HeroSpotlight
    cards/
      PlaylistCard
      ArtistCard
      FeatureCard
    tracks/
      TrackRow
      TrackList
      TrackActionsMenu
    playlist-form/
      PlaylistForm
      CoverArtUploader
      AudioUploadDropzone
      UploadQueueList
      RecordingManager
      RecordingEditorRow
    feedback/
      EmptyState
      Skeleton
      Toast
      Modal
  pages/
    HomePage
    MemberPage
    PlaylistPage
    CreatePlaylistPage
    EditPlaylistPage
    SearchPage
    LoginPage
    RegisterPage
  providers/
    AudioPlayerProvider
  hooks/
  services/
  types/
```

---

## 15. Best Next Step

After this checklist, the cleanest next document would be:
1. a **route-by-route implementation checklist**, or
2. a **frontend component tree** for the homepage and playlist page first.
