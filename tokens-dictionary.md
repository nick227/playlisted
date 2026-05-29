# MusicPop Token Dictionary Draft

This is a starter token dictionary for a token-driven, themeable frontend.

Goals:
- establish a consistent naming system
- separate base tokens from semantic tokens
- make dark-theme MVP easy to implement
- support future light/editorial themes without rewriting components

---

## 1. Token Strategy

Use 3 layers:

1. **Base tokens**
   - raw scales and palette values
   - rarely referenced directly in components

2. **Semantic tokens**
   - meaning-based tokens used by components
   - preferred layer for app styling

3. **Component tokens**
   - optional component-specific aliases for sizing, padding, or specialized surfaces

**Rule:** components should mostly consume semantic tokens and only use component tokens where necessary.

---

## 2. Naming Convention

Use dot notation in docs and token source definitions:

- `color.base.neutral.950`
- `color.bg.canvas`
- `space.4`
- `radius.lg`
- `font.size.md`
- `size.player.height`
- `card.padding.md`

When exported as CSS variables, convert to kebab-case:

- `--color-base-neutral-950`
- `--color-bg-canvas`
- `--space-4`
- `--radius-lg`
- `--font-size-md`
- `--size-player-height`
- `--card-padding-md`

---

## 3. Base Tokens

## 3.1 Neutral palette

Designed for a dark-first audio UI.

```yaml
color.base.neutral.0:   #ffffff
color.base.neutral.50:  #f6f7f8
color.base.neutral.100: #eceef1
color.base.neutral.200: #d8dde3
color.base.neutral.300: #b8c0cc
color.base.neutral.400: #929dad
color.base.neutral.500: #6f7b8c
color.base.neutral.600: #556071
color.base.neutral.700: #3d4654
color.base.neutral.800: #262d38
color.base.neutral.850: #1d232d
color.base.neutral.900: #151a22
color.base.neutral.925: #11161d
color.base.neutral.950: #0c1016
color.base.neutral.975: #080b10
```

## 3.2 Brand palette

Primary product accent. This can be changed later without touching components.

```yaml
color.base.brand.100: #ece7ff
color.base.brand.200: #d4c8ff
color.base.brand.300: #b49bff
color.base.brand.400: #946fff
color.base.brand.500: #7c4dff
color.base.brand.600: #6838e6
color.base.brand.700: #532bbc
color.base.brand.800: #3e2092
```

## 3.3 Accent palette options

Useful for editorial moods and future themes.

```yaml
color.base.acid.400:   #b7ff3c
color.base.acid.500:   #9ae600
color.base.amber.400:  #ffbe55
color.base.amber.500:  #ff9f1a
color.base.crimson.400:#ff667f
color.base.crimson.500:#e64563
color.base.cyan.400:   #4ad8ff
color.base.cyan.500:   #17bdf0
```

## 3.4 Status palettes

```yaml
color.base.success.400: #5ee6a8
color.base.success.500: #27c77a
color.base.warning.400: #ffd166
color.base.warning.500: #f5b82e
color.base.danger.400:  #ff7a90
color.base.danger.500:  #eb4d68
color.base.info.400:    #6fd8ff
color.base.info.500:    #2eb7eb
```

## 3.5 Spacing scale

```yaml
space.0: 0
space.1: 0.25rem   # 4px
space.2: 0.5rem    # 8px
space.3: 0.75rem   # 12px
space.4: 1rem      # 16px
space.5: 1.25rem   # 20px
space.6: 1.5rem    # 24px
space.8: 2rem      # 32px
space.10: 2.5rem   # 40px
space.12: 3rem     # 48px
space.16: 4rem     # 64px
space.20: 5rem     # 80px
```

## 3.6 Radius scale

```yaml
radius.none: 0
radius.sm: 0.375rem   # 6px
radius.md: 0.5rem     # 8px
radius.lg: 0.75rem    # 12px
radius.xl: 1rem       # 16px
radius.2xl: 1.5rem    # 24px
radius.round: 9999px
```

## 3.7 Typography scale

```yaml
font.family.body: Inter, ui-sans-serif, system-ui, sans-serif
font.family.display: Inter, ui-sans-serif, system-ui, sans-serif
font.family.mono: ui-monospace, SFMono-Regular, Menlo, monospace

font.size.xs: 0.75rem    # 12px
font.size.sm: 0.875rem   # 14px
font.size.md: 1rem       # 16px
font.size.lg: 1.125rem   # 18px
font.size.xl: 1.25rem    # 20px
font.size.2xl: 1.5rem    # 24px
font.size.3xl: 1.875rem  # 30px
font.size.4xl: 2.25rem   # 36px

font.weight.regular: 400
font.weight.medium: 500
font.weight.semibold: 600
font.weight.bold: 700

lineHeight.tight: 1.15
lineHeight.snug: 1.25
lineHeight.normal: 1.5
lineHeight.relaxed: 1.65

letterSpacing.tight: -0.02em
letterSpacing.normal: 0
letterSpacing.wide: 0.04em
```

## 3.8 Shadow scale

```yaml
shadow.none: none
shadow.sm: 0 1px 2px rgba(0,0,0,0.24)
shadow.md: 0 6px 18px rgba(0,0,0,0.28)
shadow.lg: 0 14px 36px rgba(0,0,0,0.35)
shadow.xl: 0 24px 56px rgba(0,0,0,0.42)
shadow.overlay: 0 20px 70px rgba(0,0,0,0.55)
```

## 3.9 Motion tokens

```yaml
motion.duration.fast: 120ms
motion.duration.normal: 180ms
motion.duration.slow: 280ms
motion.easing.standard: cubic-bezier(0.2, 0, 0, 1)
motion.easing.emphasized: cubic-bezier(0.2, 0, 0, 1.15)
```

## 3.10 Z-index tokens

```yaml
z.base: 0
z.dropdown: 100
z.sticky: 200
z.drawer: 300
z.overlay: 400
z.modal: 500
z.toast: 600
z.player: 700
```

## 3.11 Layout size tokens

```yaml
size.container.max: 90rem         # 1440px
size.sidebar.width: 17rem         # 272px
size.sidebar.collapsed: 4.5rem    # 72px
size.topBar.height: 4rem          # 64px
size.player.height: 5.5rem        # 88px
size.player.heightMobile: 4.5rem  # 72px
size.page.gutter: 1.5rem          # 24px
size.page.gutterMobile: 1rem      # 16px
```

---

## 4. Semantic Tokens

These should be the main styling inputs for components.

## 4.1 Background tokens

```yaml
color.bg.canvas: var(color.base.neutral.950)
color.bg.canvasAlt: var(color.base.neutral.925)
color.bg.surface: var(color.base.neutral.900)
color.bg.surfaceSubtle: var(color.base.neutral.925)
color.bg.surfaceElevated: var(color.base.neutral.850)
color.bg.surfaceHover: rgba(255,255,255,0.04)
color.bg.surfaceActive: rgba(255,255,255,0.08)
color.bg.accent: var(color.base.brand.500)
color.bg.accentHover: var(color.base.brand.600)
color.bg.success: var(color.base.success.500)
color.bg.warning: var(color.base.warning.500)
color.bg.danger: var(color.base.danger.500)
color.bg.overlay: rgba(6,10,16,0.72)
color.bg.scrim: rgba(0,0,0,0.56)
```

## 4.2 Text tokens

```yaml
color.text.primary: var(color.base.neutral.0)
color.text.secondary: var(color.base.neutral.300)
color.text.muted: var(color.base.neutral.500)
color.text.inverse: var(color.base.neutral.950)
color.text.accent: var(color.base.brand.300)
color.text.success: var(color.base.success.400)
color.text.warning: var(color.base.warning.400)
color.text.danger: var(color.base.danger.400)
color.text.link: var(color.base.neutral.0)
color.text.linkHover: var(color.base.brand.300)
```

## 4.3 Border tokens

```yaml
color.border.subtle: rgba(255,255,255,0.08)
color.border.default: rgba(255,255,255,0.12)
color.border.strong: rgba(255,255,255,0.18)
color.border.accent: var(color.base.brand.500)
color.border.focus: var(color.base.brand.400)
color.border.danger: var(color.base.danger.500)
```

## 4.4 Icon tokens

```yaml
color.icon.primary: var(color.text.primary)
color.icon.secondary: var(color.text.secondary)
color.icon.muted: var(color.text.muted)
color.icon.accent: var(color.base.brand.300)
```

## 4.5 Interactive tokens

```yaml
color.interactive.primary.bg: var(color.base.brand.500)
color.interactive.primary.bgHover: var(color.base.brand.600)
color.interactive.primary.text: var(color.base.neutral.0)

color.interactive.secondary.bg: rgba(255,255,255,0.06)
color.interactive.secondary.bgHover: rgba(255,255,255,0.1)
color.interactive.secondary.text: var(color.base.neutral.0)

color.interactive.ghost.bg: transparent
color.interactive.ghost.bgHover: rgba(255,255,255,0.06)
color.interactive.ghost.text: var(color.base.neutral.0)

color.interactive.disabled.bg: rgba(255,255,255,0.06)
color.interactive.disabled.text: rgba(255,255,255,0.35)
```

## 4.6 Focus tokens

```yaml
focus.ring.color: rgba(148,111,255,0.65)
focus.ring.width: 3px
focus.ring.offset: 2px
```

---

## 5. Surface Tokens

These create consistency across cards, panels, forms, and overlays.

```yaml
surface.canvas.bg: var(color.bg.canvas)
surface.default.bg: var(color.bg.surface)
surface.default.border: var(color.border.subtle)
surface.default.shadow: var(shadow.sm)

surface.elevated.bg: var(color.bg.surfaceElevated)
surface.elevated.border: var(color.border.default)
surface.elevated.shadow: var(shadow.md)

surface.subtle.bg: var(color.bg.surfaceSubtle)
surface.subtle.border: transparent
surface.subtle.shadow: none

surface.overlay.bg: rgba(17,22,29,0.94)
surface.overlay.border: var(color.border.default)
surface.overlay.shadow: var(shadow.overlay)
```

---

## 6. Page/Layout Tokens

```yaml
page.maxWidth: var(size.container.max)
page.gutter.x: var(size.page.gutter)
page.gutter.xMobile: var(size.page.gutterMobile)
page.section.gap: var(space.8)
page.section.gapCompact: var(space.6)
page.header.gap: var(space.4)
```

---

## 7. Panel Tokens

Panels should all feel related, even when variants differ.

```yaml
panel.radius: var(radius.xl)
panel.padding.sm: var(space.4)
panel.padding.md: var(space.5)
panel.padding.lg: var(space.6)
panel.gap: var(space.4)
panel.header.gap: var(space.2)
panel.footer.gap: var(space.3)

panel.default.bg: var(surface.default.bg)
panel.default.border: var(surface.default.border)
panel.default.shadow: var(surface.default.shadow)

panel.elevated.bg: var(surface.elevated.bg)
panel.elevated.border: var(surface.elevated.border)
panel.elevated.shadow: var(surface.elevated.shadow)

panel.subtle.bg: var(surface.subtle.bg)
panel.subtle.border: var(surface.subtle.border)
panel.subtle.shadow: var(surface.subtle.shadow)
```

### Panel usage guidance
- `Panel`: `panel.default.*`
- `MediaPanel`: `panel.elevated.*`
- `ListPanel`: `panel.default.*`
- `FormPanel`: `panel.default.*`
- `GhostPanel` or surface-less section: use transparent bg and no border

---

## 8. Card Tokens

## 8.1 Shared card tokens

```yaml
card.radius: var(radius.lg)
card.padding.sm: var(space.3)
card.padding.md: var(space.4)
card.padding.lg: var(space.5)
card.gap: var(space.3)
card.title.gap: var(space.1)
card.meta.gap: var(space.1)

card.bg: transparent
card.bgHover: rgba(255,255,255,0.02)
card.border: transparent
card.shadow: none
card.shadowHover: var(shadow.md)

card.overlay.bg: linear-gradient(to top, rgba(0,0,0,0.56), rgba(0,0,0,0))
card.overlay.iconBg: rgba(12,16,22,0.72)
```

## 8.2 Playlist card tokens

```yaml
card.playlist.radius: var(radius.lg)
card.playlist.media.size.sm: 8rem      # 128px
card.playlist.media.size.md: 10rem     # 160px
card.playlist.media.size.lg: 12rem     # 192px
card.playlist.title.size: var(font.size.md)
card.playlist.subtitle.size: var(font.size.sm)
```

## 8.3 Artist card tokens

```yaml
card.artist.media.size.sm: 4.5rem      # 72px
card.artist.media.size.md: 6rem        # 96px
card.artist.media.size.lg: 7.5rem      # 120px
card.artist.media.radius: var(radius.round)
card.artist.title.size: var(font.size.md)
card.artist.meta.size: var(font.size.sm)
```

## 8.4 Feature card tokens

```yaml
card.feature.radius: var(radius.xl)
card.feature.minHeight.sm: 11rem
card.feature.minHeight.md: 14rem
card.feature.minHeight.lg: 18rem
card.feature.title.size.sm: var(font.size.lg)
card.feature.title.size.md: var(font.size.xl)
card.feature.title.size.lg: var(font.size.2xl)
card.feature.summary.size: var(font.size.sm)
```

---

## 9. Track/List Tokens

```yaml
trackRow.height: 3.5rem
trackRow.heightComfortable: 4rem
trackRow.padding.x: var(space.3)
trackRow.padding.y: var(space.2)
trackRow.radius: var(radius.md)
trackRow.bgHover: rgba(255,255,255,0.04)
trackRow.bgActive: rgba(124,77,255,0.12)
trackRow.border: transparent
trackRow.textActive: var(color.base.brand.300)
trackList.gap: var(space.1)
```

---

## 10. Typography Semantic Tokens

These are helpful for consistent text hierarchy.

```yaml
text.display.lg.fontSize: var(font.size.4xl)
text.display.lg.fontWeight: var(font.weight.bold)
text.display.lg.lineHeight: var(lineHeight.tight)

text.display.md.fontSize: var(font.size.3xl)
text.display.md.fontWeight: var(font.weight.bold)
text.display.md.lineHeight: var(lineHeight.tight)

text.heading.lg.fontSize: var(font.size.2xl)
text.heading.lg.fontWeight: var(font.weight.semibold)
text.heading.lg.lineHeight: var(lineHeight.snug)

text.heading.md.fontSize: var(font.size.xl)
text.heading.md.fontWeight: var(font.weight.semibold)
text.heading.md.lineHeight: var(lineHeight.snug)

text.heading.sm.fontSize: var(font.size.lg)
text.heading.sm.fontWeight: var(font.weight.semibold)
text.heading.sm.lineHeight: var(lineHeight.snug)

text.body.md.fontSize: var(font.size.md)
text.body.md.fontWeight: var(font.weight.regular)
text.body.md.lineHeight: var(lineHeight.normal)

text.body.sm.fontSize: var(font.size.sm)
text.body.sm.fontWeight: var(font.weight.regular)
text.body.sm.lineHeight: var(lineHeight.normal)

text.caption.fontSize: var(font.size.xs)
text.caption.fontWeight: var(font.weight.medium)
text.caption.lineHeight: var(lineHeight.normal)
text.caption.letterSpacing: var(letterSpacing.wide)
```

---

## 11. Button Tokens

```yaml
button.height.sm: 2rem
button.height.md: 2.5rem
button.height.lg: 3rem
button.padding.x.sm: var(space.3)
button.padding.x.md: var(space.4)
button.padding.x.lg: var(space.5)
button.radius: var(radius.round)
button.fontSize: var(font.size.sm)
button.fontWeight: var(font.weight.semibold)

button.primary.bg: var(color.interactive.primary.bg)
button.primary.bgHover: var(color.interactive.primary.bgHover)
button.primary.text: var(color.interactive.primary.text)

button.secondary.bg: var(color.interactive.secondary.bg)
button.secondary.bgHover: var(color.interactive.secondary.bgHover)
button.secondary.text: var(color.interactive.secondary.text)

button.ghost.bg: var(color.interactive.ghost.bg)
button.ghost.bgHover: var(color.interactive.ghost.bgHover)
button.ghost.text: var(color.interactive.ghost.text)
```

---

## 12. Input/Form Tokens

```yaml
input.height: 2.75rem
input.radius: var(radius.lg)
input.padding.x: var(space.4)
input.padding.y: var(space.3)
input.bg: rgba(255,255,255,0.04)
input.bgHover: rgba(255,255,255,0.06)
input.bgFocus: rgba(255,255,255,0.08)
input.border: var(color.border.default)
input.borderFocus: var(color.border.focus)
input.text: var(color.text.primary)
input.placeholder: var(color.text.muted)
input.label: var(color.text.secondary)
input.help: var(color.text.muted)
input.error: var(color.text.danger)
```

---

## 13. Player Tokens

```yaml
player.height: var(size.player.height)
player.heightMobile: var(size.player.heightMobile)
player.bg: rgba(12,16,22,0.94)
player.border: var(color.border.default)
player.shadow: var(shadow.overlay)
player.progress.bg: rgba(255,255,255,0.14)
player.progress.fill: var(color.base.brand.500)
player.progress.handle: var(color.base.neutral.0)
player.control.bgHover: rgba(255,255,255,0.08)
player.control.icon: var(color.icon.primary)
```

---

## 14. Navigation Tokens

```yaml
nav.topBar.bg: rgba(12,16,22,0.82)
nav.topBar.border: var(color.border.subtle)
nav.sidebar.bg: var(color.bg.canvasAlt)
nav.sidebar.border: var(color.border.subtle)
nav.item.radius: var(radius.md)
nav.item.bgHover: rgba(255,255,255,0.05)
nav.item.bgActive: rgba(124,77,255,0.14)
nav.item.text: var(color.text.secondary)
nav.item.textActive: var(color.text.primary)
```

---

## 15. State Tokens

```yaml
state.success.bg: rgba(39,199,122,0.14)
state.success.border: rgba(39,199,122,0.34)
state.success.text: var(color.text.success)

state.warning.bg: rgba(245,184,46,0.14)
state.warning.border: rgba(245,184,46,0.34)
state.warning.text: var(color.text.warning)

state.danger.bg: rgba(235,77,104,0.14)
state.danger.border: rgba(235,77,104,0.34)
state.danger.text: var(color.text.danger)

state.info.bg: rgba(46,183,235,0.14)
state.info.border: rgba(46,183,235,0.34)
state.info.text: var(color.base.info.400)
```

---

## 16. Theme Examples

## 16.1 `dark-default`

This is the current recommended MVP theme.

```yaml
color.bg.canvas: #0c1016
color.bg.surface: #151a22
color.bg.surfaceElevated: #1d232d
color.text.primary: #ffffff
color.text.secondary: #b8c0cc
color.border.subtle: rgba(255,255,255,0.08)
color.interactive.primary.bg: #7c4dff
```

## 16.2 `dark-editorial`

A richer, more magazine-like version.

```yaml
color.bg.canvas: #090b12
color.bg.surface: #131824
color.bg.surfaceElevated: #1a2130
color.text.primary: #f8f8fb
color.text.secondary: #bfc4d2
color.interactive.primary.bg: #946fff
color.text.accent: #d4c8ff
```

## 16.3 Future `light`

Not for MVP, but semantic tokens make this feasible.

```yaml
color.bg.canvas: #f6f7f8
color.bg.surface: #ffffff
color.bg.surfaceElevated: #eceef1
color.text.primary: #11161d
color.text.secondary: #3d4654
color.border.subtle: rgba(17,22,29,0.08)
color.interactive.primary.bg: #6838e6
```

---

## 17. Suggested Implementation Format

## Option A: CSS variables + TypeScript token source
Best for flexibility.

- define canonical tokens in TS/JSON
- emit CSS variables per theme
- consume tokens in components via CSS vars

### Example
```css
:root[data-theme="dark-default"] {
  --color-bg-canvas: #0c1016;
  --color-bg-surface: #151a22;
  --color-text-primary: #ffffff;
  --panel-radius: 1rem;
}
```

```css
.panel {
  background: var(--panel-default-bg);
  border: 1px solid var(--panel-default-border);
  border-radius: var(--panel-radius);
}
```

## Option B: tokens in JSON
Good if you want tooling compatibility later.

```json
{
  "color": {
    "bg": {
      "canvas": { "value": "#0c1016" }
    }
  }
}
```

---

## 18. Recommended Minimal MVP Token Set

If you want to start smaller, implement these first:

### Must-have
- background colors
- text colors
- border colors
- spacing scale
- radius scale
- typography scale
- panel tokens
- card tokens
- button tokens
- player tokens
- nav tokens

### Can come second
- state tokens
- motion tokens
- alternate themes
- component-specific card sizes

---

## 19. Rules for Developers

1. Never hard-code colors in feature components
2. Prefer semantic tokens over base tokens in components
3. Use component tokens only when semantics are not enough
4. Reuse spacing scale values only
5. Reuse typography semantic styles for headers/body/captions
6. Do not create route-specific token names like `home.hero.purple`
7. Any new component should document which semantic tokens it consumes

---

## 20. Best Next Step

After this token dictionary, the strongest next artifact is:

1. a **component API spec** for:
   - `Panel`
   - `PlaylistCard`
   - `ArtistCard`
   - `FeatureCard`
   - `TrackRow`

or

2. a **theme + folder architecture doc** showing how tokens, themes, and components are organized in code.
