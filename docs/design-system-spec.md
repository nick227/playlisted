# Playlisted Design System Planning

This document expands the UI system so the frontend is:
- consistent across pages
- built from reusable cards and panels
- token-driven and easy to theme
- named predictably for scale

---

## 1. Design System Goals

### Primary goals
1. **Consistency** — similar content should look and behave the same everywhere
2. **Reusability** — build pages from shared primitives, not one-off layouts
3. **Themeability** — color, radius, spacing, typography, shadows, and motion should come from tokens
4. **Flexibility** — cards and panels should support homepage, search, profile, and playlist contexts without branching into custom variants too early
5. **Editorial identity** — the system should support both utility UI and expressive discovery surfaces

### Core principle
Each page should feel composed from the same system:
- **shell primitives**
- **layout panels**
- **content cards**
- **list/table rows**
- **controls/forms**
- **feedback states**

---

## 2. UI Architecture Layers

Think in 5 layers:

### Layer 1: Tokens
Raw design decisions:
- color
- spacing
- radius
- typography
- shadow
- motion
- z-index

### Layer 2: Foundations
Low-level style utilities and primitives:
- `Box`
- `Stack`
- `Inline`
- `Grid`
- `Text`
- `Heading`
- `Icon`
- `Button`
- `Input`
- `Surface`

### Layer 3: Layout Containers
Reusable structure elements:
- `AppShell`
- `PageContainer`
- `PageSection`
- `Panel`
- `ContentRow`
- `Drawer`
- `Modal`

### Layer 4: Content Components
Reusable display patterns:
- `PlaylistCard`
- `ArtistCard`
- `FeatureCard`
- `TrackRow`
- `ProfileHero`
- `PlaylistHeader`

### Layer 5: Page Compositions
Route-level screens:
- `HomePage`
- `MemberPage`
- `PlaylistPage`
- `EditPlaylistPage`
- `SearchPage`

---

## 3. Card System

Cards should be treated as a formal component family, not ad hoc blocks.

### 3.1 What is a card?
A card is a compact content container that:
- represents a single entity or highlighted content item
- is clickable or actionable
- can appear in grids, rows, panels, or search results
- has predictable media, text, metadata, and actions areas

### 3.2 Standard card anatomy
Every card should support this internal structure where relevant:

```text
Card
 ├─ Media
 ├─ Overlay actions
 ├─ Body
 │   ├─ Eyebrow / badge
 │   ├─ Title
 │   ├─ Subtitle / creator
 │   └─ Meta
 └─ Footer actions (optional)
```

### 3.3 Shared card API ideas
All card types should align on a similar API shape.

**Shared props**
- `title`
- `href`
- `image`
- `subtitle`
- `meta`
- `badges`
- `isPlayable`
- `isFavorited`
- `onPlay`
- `onFavorite`
- `size`
- `tone`

**Shared states**
- default
- hover
- focus-visible
- active/pressed
- selected
- loading
- disabled

### 3.4 Card categories

#### A. Entity cards
Represent a thing in the library.
- `PlaylistCard`
- `ArtistCard`
- `TrackCard` (optional later)
- `EditorialCard`

#### B. Feature cards
Represent promoted or highlighted content.
- `FeatureCard`
- `SpotlightCard`
- `NewsCard`

#### C. Utility cards
Represent empty/loading/system surfaces.
- `EmptyStateCard`
- `CreateNewCard`
- `UploadPromptCard`

---

## 4. Detailed Card Types

## 4.1 `PlaylistCard`

**Purpose**
Represents playlists, albums, mixes, podcast channels, featured releases.

**Primary contexts**
- homepage rows
- member page grids
- search results
- related playlists
- library views

**Visual anatomy**
```text
┌──────────────┐
│ cover image  │
│    overlay   │
└──────────────┘
Badge/Eyebrow
Title
Creator
Meta
```

**Content slots**
- cover art
- title
- creator name
- optional type label: Album / Mix / Podcast / Playlist
- optional meta: track count, year, genre, duration

**Variants**
- `playlist-card--default`
- `playlist-card--compact`
- `playlist-card--featured`
- `playlist-card--library`

**Sizes**
- `sm`
- `md`
- `lg`

**Behavior**
- clicking cover/title navigates to playlist page
- hover reveals play action
- optional favorite/save action
- optional context menu

**Rules**
- image ratio should be square by default
- title should clamp to 1–2 lines
- subtitle should remain visually subordinate to title
- action density should remain low in browse contexts

---

## 4.2 `ArtistCard`

**Purpose**
Represents artists, DJs, podcasters, or members.

**Primary contexts**
- homepage artist rows
- search
- suggested creators

**Visual anatomy**
```text
   ( portrait )
Eyebrow
Name
Genre/Meta
```

**Content slots**
- portrait/avatar
- display name
- optional role label or genre
- optional location/tag

**Variants**
- `artist-card--default`
- `artist-card--compact`
- `artist-card--featured`

**Rules**
- media is circular in standard discovery rows
- title is the person/entity name
- metadata should be short and scannable

---

## 4.3 `FeatureCard`

**Purpose**
For editor picks, site news, spotlights, premiere banners.

**Primary contexts**
- homepage editorial rows
- feature rails
- news sections

**Visual anatomy**
```text
┌──────────────────────────┐
│ banner image             │
│ gradient overlay         │
│ Eyebrow                  │
│ Title                    │
│ Summary                  │
│ CTA                      │
└──────────────────────────┘
```

**Content slots**
- banner image
- eyebrow: Editor Pick / News / Spotlight
- title
- summary/deck
- CTA label

**Variants**
- `feature-card--wide`
- `feature-card--hero`
- `feature-card--tile`

**Rules**
- title can occupy more space than standard cards
- summary should usually be 2–3 lines max
- stronger contrast treatment than utility cards

---

## 4.4 `NewsCard`

**Purpose**
A specialized editorial card for site updates and articles.

**Use only if needed**
If `FeatureCard` can cover this, do not split early.

**Possible difference**
- smaller image emphasis
- stronger text hierarchy
- read-more CTA instead of play CTA

---

## 4.5 `TrackRow` vs `TrackCard`

### `TrackRow`
Should be the default for tracks/episodes in dense lists.

**Contexts**
- playlist page
- queue
- search songs section
- recently played list

**Why row first?**
Tracks are high-density content. Rows are easier to scan than cards.

### `TrackCard`
Use later only if needed for special discovery modules.

**Recommendation**
Do not prioritize `TrackCard` in MVP.

---

## 4.6 `CreateNewCard`

**Purpose**
System utility card for empty grids.

**Examples**
- create playlist
- upload first release
- add your first episode

**Rules**
- visually distinct from content cards
- should never look like actual media content

---

## 5. Card Consistency Rules

To keep pages coherent, define shared rules.

### 5.1 Media rules
- playlist media defaults to square
- artist media defaults to circle
- feature media defaults to wide rectangle
- avoid arbitrary ratios per page unless tokenized

### 5.2 Text rules
- title = strongest text inside card
- subtitle = creator/secondary entity
- meta = smaller, lower-contrast support line
- eyebrow = optional, short, uppercase or label style

### 5.3 Action rules
- browse surfaces: show only 1 primary quick action + maybe favorite/menu
- dense contexts: push actions into menus
- avoid more than 2 always-visible icon actions on small cards

### 5.4 Spacing rules
- use tokenized internal spacing only
- card padding should come from size scale, not arbitrary values

### 5.5 Motion rules
- hover lift should be subtle and token-driven
- play overlay transitions should be consistent across card families

---

## 6. Reusable Panel System

Panels should become the main page-composition primitive.

### 6.1 What is a panel?
A panel is a reusable content section container that groups related information or controls.

Unlike a card:
- a **card** usually represents one entity
- a **panel** usually contains one or more components, lists, or forms

### 6.2 Why panels matter
Panels create consistency across pages by standardizing:
- section spacing
- headers
- backgrounds/surfaces
- grouping behavior
- internal padding
- optional actions

### 6.3 Standard panel anatomy

```text
Panel
 ├─ PanelHeader
 │   ├─ Title
 │   ├─ Description (optional)
 │   └─ Actions (optional)
 ├─ PanelBody
 └─ PanelFooter (optional)
```

### 6.4 Core panel types

#### `Panel`
Base container for most grouped content.

**Use for**
- metadata sections
- grouped controls
- search sections
- form groups

#### `MediaPanel`
Panel with stronger visual media emphasis.

**Use for**
- featured playlist blocks
- pinned release sections
- hero support panels

#### `ListPanel`
Panel wrapping rows or track lists.

**Use for**
- track list
- queue list
- search result sections

#### `FormPanel`
Panel wrapping form controls.

**Use for**
- create playlist form section
- account settings later
- upload metadata groups

#### `StatPanel`
Compact summary panel.

**Use for later**
- creator stats
- counts
- analytics

---

## 7. Panel API Planning

### 7.1 Base `Panel`
**Props**
- `title`
- `description`
- `actions`
- `children`
- `variant`
- `padding`
- `tone`
- `bordered`

### 7.2 Variants
Suggested base variants:
- `solid`
- `subtle`
- `ghost`
- `elevated`

### 7.3 Tones
Suggested tones:
- `default`
- `accent`
- `success`
- `warning`
- `danger`

Usually keep tone usage limited in MVP.

### 7.4 Sizes
- `sm`
- `md`
- `lg`

### 7.5 Examples by page

**Homepage**
- hero spotlight inside `MediaPanel`
- content rows inside `Panel` or surface-less `PageSection`

**Member page**
- profile block inside `MediaPanel`
- public playlists inside `Panel`

**Playlist page**
- playlist header inside `MediaPanel`
- tracks inside `ListPanel`
- related playlists inside `Panel`

**Edit page**
- metadata editor inside `FormPanel`
- uploads inside `FormPanel`
- recordings manager inside `ListPanel`

---

## 8. Naming Convention Plan

We should choose conventions early to avoid component sprawl.

## 8.1 Naming principles
1. **Name by role, not page decoration**
   - good: `PlaylistCard`
   - bad: `HomePlaylistBox`
2. **Prefer domain meaning over vague UI names**
   - good: `TrackList`
   - bad: `DataContainer`
3. **Use page-specific names only at route composition level**
   - `HomePage`, `MemberPage`
4. **Variant names should describe behavior or layout, not random visual quirks**
   - good: `featured`, `compact`, `hero`
   - bad: `blue`, `big2`, `special`

---

## 8.2 Recommended component naming pattern

### Foundations
- `Box`
- `Stack`
- `Inline`
- `Grid`
- `Surface`
- `Text`
- `Heading`

### Containers
- `PageContainer`
- `PageSection`
- `Panel`
- `PanelHeader`
- `PanelBody`
- `PanelFooter`

### Domain components
- `PlaylistCard`
- `ArtistCard`
- `FeatureCard`
- `TrackRow`
- `PlaylistHeader`
- `ProfileHero`

### Compositions
- `HomeFeed`
- `PlaylistDetails`
- `SearchResultsSection`
- `RecordingManager`

### State components
- `EmptyState`
- `SkeletonCard`
- `LoadingRow`

---

## 8.3 File naming
Use **PascalCase** for React component file names.

**Examples**
- `PlaylistCard.tsx`
- `Panel.tsx`
- `TrackRow.tsx`
- `AudioPlayerProvider.tsx`

Related helpers:
- `playlist-card.types.ts`
- `playlist-card.utils.ts`
- `playlist-card.test.tsx`
- `playlist-card.stories.tsx`

Or keep local files grouped in component folders:
```text
PlaylistCard/
  PlaylistCard.tsx
  PlaylistCard.types.ts
  PlaylistCard.module.css
  PlaylistCard.stories.tsx
```

---

## 8.4 CSS/class naming
If using CSS Modules, class names can stay simple.

**Examples**
- `root`
- `media`
- `body`
- `title`
- `meta`
- `actions`

If using global CSS or utility conventions, use component-scoped names:
- `playlistCard`
- `playlistCardMedia`
- `playlistCardTitle`

Avoid page-coupled class names like:
- `homepageBigCard`
- `searchTrackSpecial`

---

## 8.5 Token naming conventions
Use semantic tokens instead of hard-coded component colors.

### Good
- `color.bg.surface`
- `color.text.primary`
- `color.border.subtle`
- `space.3`
- `radius.card.md`

### Avoid
- `blue500`
- `cardGray2`
- `homepagePurple`

Keep raw/base tokens and semantic tokens separate.

---

## 9. Token-Driven Frontend Strategy

The frontend should be themeable by replacing tokens, not rewriting components.

## 9.1 Token layers

### Layer A: Base tokens
Raw values.

Examples:
- colors
- spacing scale
- font sizes
- radii
- shadows

### Layer B: Semantic tokens
Map base tokens to UI meaning.

Examples:
- app background
- panel background
- text primary
- text secondary
- accent interactive
- border muted

### Layer C: Component tokens
Optional, for more control when needed.

Examples:
- card padding
- panel gap
- player height
- row hover background

---

## 9.2 Suggested token groups

### Color tokens
**Base**
- `color.base.neutral.0-1000`
- `color.base.brand.*`
- `color.base.success.*`
- `color.base.warning.*`
- `color.base.danger.*`

**Semantic**
- `color.bg.canvas`
- `color.bg.surface`
- `color.bg.surfaceElevated`
- `color.bg.accent`
- `color.text.primary`
- `color.text.secondary`
- `color.text.muted`
- `color.border.subtle`
- `color.border.strong`
- `color.interactive.primary`
- `color.interactive.primaryHover`
- `color.interactive.secondary`
- `color.overlay.scrim`

### Spacing tokens
- `space.0`
- `space.1`
- `space.2`
- `space.3`
- `space.4`
- `space.5`
- `space.6`
- `space.8`
- `space.10`
- `space.12`

### Radius tokens
- `radius.none`
- `radius.sm`
- `radius.md`
- `radius.lg`
- `radius.xl`
- `radius.round`
- `radius.card`
- `radius.panel`
- `radius.input`

### Typography tokens
- `font.family.body`
- `font.family.display`
- `font.size.xs`
- `font.size.sm`
- `font.size.md`
- `font.size.lg`
- `font.size.xl`
- `font.weight.regular`
- `font.weight.medium`
- `font.weight.semibold`
- `font.weight.bold`
- `lineHeight.tight`
- `lineHeight.normal`
- `lineHeight.relaxed`

### Shadow tokens
- `shadow.sm`
- `shadow.md`
- `shadow.lg`
- `shadow.overlay`

### Motion tokens
- `motion.duration.fast`
- `motion.duration.normal`
- `motion.duration.slow`
- `motion.easing.standard`
- `motion.easing.emphasized`

### Size/layout tokens
- `size.topBar.height`
- `size.sidebar.width`
- `size.player.height`
- `size.card.playlist.sm`
- `size.card.playlist.md`
- `size.card.artist.md`
- `size.container.max`

---

## 9.3 Example semantic token mapping

```text
color.bg.canvas = neutral.950
color.bg.surface = neutral.900
color.bg.surfaceElevated = neutral.850
color.text.primary = neutral.0
color.text.secondary = neutral.300
color.border.subtle = neutral.700
color.interactive.primary = brand.500
```

This makes dark/light or alternate themes much easier.

---

## 10. Component Token Ideas

Some components deserve their own token namespace.

### 10.1 Card tokens
- `card.padding.sm`
- `card.padding.md`
- `card.radius`
- `card.title.gap`
- `card.media.overlay`
- `card.hover.shadow`

### 10.2 Panel tokens
- `panel.padding.sm`
- `panel.padding.md`
- `panel.gap`
- `panel.radius`
- `panel.border.color`
- `panel.bg.default`
- `panel.bg.elevated`

### 10.3 Player tokens
- `player.height`
- `player.bg`
- `player.border`
- `player.progress.active`
- `player.progress.inactive`

### 10.4 Form tokens
- `input.height`
- `input.radius`
- `input.bg`
- `input.border`
- `input.border.focus`

---

## 11. Theme Strategy

## 11.1 Theme model
Start with at least:
- `dark-default`
- `dark-editorial`

Later add:
- `light`
- `high-contrast`
- `seasonal`

## 11.2 Theme switching
Components should consume semantic tokens only.
Theme files should redefine token values.

### Example
- the `Panel` component always uses `color.bg.surface`
- the theme decides what `color.bg.surface` actually is

## 11.3 Editorial flexibility
Playlisted likely benefits from a richer dark theme.
Possible accent themes by curation mood:
- electric violet
- acid green
- warm amber
- muted crimson

These should enter via tokens, not hard-coded component variants.

---

## 12. Consistency Rules Across Pages

### 12.1 Shared page structure
Each major page should prefer:
- `PageContainer`
- `PageHeader` or hero block
- stacked `Panel` / `PageSection` groups
- consistent vertical rhythm from spacing tokens

### 12.2 Shared header patterns
Use consistent patterns for:
- page title
- subtitle / metadata
- primary CTA
- secondary actions

### 12.3 Shared empty states
All empty states should share:
- icon style
- tone
- action button pattern
- text hierarchy

### 12.4 Shared loading states
Use skeletons aligned to real layouts.
Do not mix spinners and skeletons randomly.

---

## 13. Recommended Component Family Map

### Foundation primitives
- `Box`
- `Stack`
- `Inline`
- `Grid`
- `Surface`
- `Text`
- `Heading`
- `Button`
- `IconButton`
- `Input`
- `Select`
- `Chip`

### Layout primitives
- `PageContainer`
- `PageSection`
- `PageHeader`
- `Panel`
- `PanelHeader`
- `PanelBody`
- `PanelFooter`

### Content display
- `PlaylistCard`
- `ArtistCard`
- `FeatureCard`
- `TrackRow`
- `TrackList`
- `HeroSpotlight`
- `ProfileHero`
- `PlaylistHeader`

### Utility/state
- `EmptyState`
- `SkeletonCard`
- `SkeletonRow`
- `Toast`
- `Modal`
- `Drawer`

---

## 14. Suggested Do/Don't Rules

### Do
- use shared cards before inventing new page-specific content blocks
- use panels to group content and forms consistently
- define sizes and tones via tokens
- keep variant names semantic
- map all colors to semantic tokens

### Don't
- hard-code colors in components
- create `Home*` or `Search*` versions of generic cards too early
- use one-off spacing values
- introduce too many card variants before proving need
- couple component styling to one route

---

## 15. Practical Next Implementation Step

The best next planning artifact would be one of these:

1. **a token dictionary draft**
   - actual token names and starter values
2. **a component API spec**
   - exact props for `Panel`, `PlaylistCard`, `ArtistCard`, `FeatureCard`
3. **a folder structure + naming standard doc**
   - for React components, CSS, tokens, and themes

---

## 16. Recommended Immediate Decisions

Before implementation starts, decide:
- styling approach: CSS Modules, Tailwind + CSS vars, styled system, or another approach
- token format: CSS variables, JSON tokens, TS object, or combination
- theme scope: app-wide only or section/page accents too
- whether `Panel` should always render a visible surface or support surface-less sections

---

## 17. Strong Recommendation

For Playlisted, the cleanest direction is:
- **semantic design tokens via CSS variables**
- **shared primitives + Panel system**
- **small, disciplined card family**
- **page composition from reusable sections rather than custom route-specific blocks**

That gives the site a recognizable visual system while still leaving room for editorial personality.
