# Persistent Audio Visualizer Proposal

## 1. Goal

Add a persistent, site-wide audio visualizer to Playlisted that behaves like the existing bottom media player:

- mounts once at the app shell/root level
- survives internal React Router navigation
- connects to the existing persistent audio element
- reacts to the current playback session
- can be toggled from the global bottom player
- stores user preferences locally
- fails safely without interrupting playback

The MVP should use Canvas 2D and the Web Audio API. WebGL/Three.js should remain a future renderer option, not part of the first pass.

## 2. Existing Playback Architecture

The current player architecture is a good fit for this feature.

Relevant files:

- `apps/web/src/main.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/BottomPlayer.tsx`
- `apps/web/src/providers/AudioPlayerProvider.tsx`

Current behavior:

- `AudioPlayerProvider` is mounted above the app in `main.tsx`.
- It owns one hidden persistent `<audio>` element.
- It stores queue, current track, playback state, current time, duration, volume, shuffle, repeat, and queue actions.
- `BottomPlayer` consumes `useAudioPlayer()`.
- `AppShell` renders route content plus the persistent bottom player.

Important gap:

- `AudioPlayerProvider` owns `audioRef`, but the context does not currently expose it.
- The visualizer needs safe access to the same persistent audio element.

Recommended small player API addition:

```ts
audioRef: RefObject<HTMLAudioElement | null>;
```

This keeps the visualizer as a consumer of playback state, not a dependency of playback itself.

## 3. MVP Scope

The MVP should include:

- persistent full-screen background visualizer layer
- Canvas 2D renderer
- Web Audio analyser connection to the existing audio element
- four visual modes
- palette presets
- localStorage-backed preferences
- bottom-player toggle
- safe idle rendering with no track or paused playback
- reduced-motion handling
- tests or smoke checks for state persistence and no-audio safety

The MVP should not include:

- Three.js/WebGL
- backend preference storage
- per-track stored visualizer metadata
- page-specific visualizer mounts
- complex user-facing design controls

Hard safety boundary:

- The visualizer must be treated as optional decoration.
- Playback, routing, queue state, and player controls must remain fully functional if the visualizer provider, analyser, canvas renderer, localStorage, or Web Audio API fails.
- Any visualizer error must disable the visualizer layer.
- In development, visualizer errors should log a warning.
- In production, failures should fail quietly unless the app already has a client error reporting path.

## 4. Proposed File Structure

```txt
apps/web/src/features/visualizer/
  VisualizerProvider.tsx
  PersistentVisualizerLayer.tsx
  useAudioAnalyser.ts
  visualizerStore.ts
  visualizerTypes.ts
  visualizerModes.ts
  visualizerPalettes.ts
  visualizerSeed.ts
  components/
    VisualizerControls.tsx
    VisualizerDevPanel.tsx
  renderers/
    canvasRenderer.ts
    modes/
      drawBars.ts
      drawRadial.ts
      drawBlob.ts
      drawWave.ts
```

## 5. State Model

Visualizer preferences should be global and locally persisted.

```ts
type VisualizerMode =
  | "ambient-bars"
  | "radial-pulse"
  | "soft-blob"
  | "wave-ribbon";

type VisualizerMotion = "off" | "low" | "normal" | "high";

type VisualizerSettings = {
  enabled: boolean;
  mode: VisualizerMode;
  paletteId: string;
  intensity: number;
  backgroundOpacity: number;
  glow: number;
  motion: VisualizerMotion;
  disabledReason?: "user" | "reduced-motion" | "performance" | "error";
  showDevControls?: boolean;
};
```

Use a provider/store pattern that matches the app's existing React context style. Avoid adding a state library for this feature unless the app adopts one elsewhere.

Persistence:

- localStorage key: `playlisted.visualizer.settings`
- read once during provider initialization
- write after user changes
- clamp values on read to prevent stale/bad data from crashing rendering

Reduced motion:

- detect `prefers-reduced-motion: reduce`
- default new reduced-motion users to `enabled: false` or `motion: "low"`
- set `disabledReason: "reduced-motion"` when reduced-motion disables the layer by default
- preserve manual user choices after they change settings
- derive `effectiveMotion` at runtime instead of overwriting saved preferences

Performance disabling:

- if the renderer detects repeated slow frames or a low-power/mobile fallback condition, it may disable the visualizer with `disabledReason: "performance"`
- the UI should make this state debuggable without implying playback is broken
- users can still manually re-enable the visualizer unless reduced-motion policy says otherwise

## 6. Audio Analyser Design

Create `useAudioAnalyser` as the only module responsible for Web Audio setup.

Responsibilities:

- accept the persistent `audioRef`
- lazily create one `AudioContext`
- create one `MediaElementAudioSourceNode` per audio element
- create one `AnalyserNode`
- connect source -> analyser -> destination
- resume the audio context after playback/user interaction when allowed
- return stable analyser data helpers
- fail safely and report analyser unavailable

Important constraint:

Browsers only allow one `MediaElementAudioSourceNode` per media element. Recreating this node for the same `<audio>` element can throw an error. The hook should keep the source node in a ref or module-level weak map keyed by the audio element.

Routing constraint:

- use `MediaElementSource -> AnalyserNode -> AudioContext.destination`
- create this route only once per persistent audio element
- do not create parallel routes that double audio output
- do not change volume, playback rate, sink, or other playback behavior from the visualizer

Suggested return shape:

```ts
type AudioAnalyserState = {
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  connected: boolean;
  error: Error | null;
  resume: () => Promise<void>;
};
```

Performance notes:

- allocate `Uint8Array` buffers once
- reuse buffers every frame
- do not allocate large arrays during animation
- use fallback zero/idle buffers when unavailable

## 7. Persistent Layer Mounting

Mount the visualizer once near the app shell.

Recommended structure:

```tsx
<AudioPlayerProvider>
  <VisualizerProvider>
    <App />
  </VisualizerProvider>
</AudioPlayerProvider>
```

Then render `PersistentVisualizerLayer` inside `AppShell`, before page content:

```tsx
<div className="flex min-h-full">
  <PersistentVisualizerLayer />
  <Sidebar />
  ...
</div>
```

This keeps the layer route-independent while letting pages sit above it.

Layer styling:

```css
.visualizer-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
```

The app content, sidebar, top bar, queue panel, modals, and bottom player should remain above the visualizer.

Use root attributes for styling hooks:

```html
<html data-visualizer="on" data-visualizer-mode="radial-pulse">
```

or a root app wrapper if mutating `document.documentElement` is undesirable.

Page-level surface control:

Some pages should be able to soften or hide the visualizer without unmounting it. Use a data attribute on the page or route wrapper:

```tsx
<div data-visualizer-surface="editor">
  ...
</div>
```

Suggested values:

- `default`
- `soft`
- `hidden`
- `editor`
- `immersive`

Expected behavior:

- `default`: normal global settings
- `soft`: lower opacity/intensity
- `hidden`: hide layer visually, keep global preference unchanged
- `editor`: calm, low-contrast, low-motion visuals for Studio/admin/editing views
- `immersive`: allow stronger visuals for public playlist or feature surfaces

This is especially important for Studio, admin, and editing pages where visual noise can get in the way of focused work.

## 8. Rendering Engine

Use a Canvas 2D renderer for the MVP.

`canvasRenderer.ts` should own:

- canvas setup
- DPR-aware resizing
- animation loop helpers
- frame clearing/fading
- selecting the active mode renderer
- passing normalized analyser data to modes

Frame input should be renderer-agnostic:

```ts
type VisualizerFrame = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  settings: VisualizerSettings;
  palette: VisualizerPalette;
  seed: VisualizerSeed;
  playbackState: "idle" | "loading" | "playing" | "paused" | "error";
  time: number;
  delta: number;
};
```

This shape keeps future WebGL support possible because mode logic can be cleanly separated from player state.

Define a renderer interface now, even though the MVP only ships Canvas:

```ts
type VisualizerRenderer = {
  mount: (canvas: HTMLCanvasElement) => void;
  resize: (width: number, height: number, dpr: number) => void;
  render: (frame: VisualizerFrame) => void;
  destroy: () => void;
};
```

Canvas should be the first implementation of this interface. A future WebGL renderer should be able to implement the same shape without changing player integration or visualizer settings.

## 9. MVP Modes

### `ambient-bars`

Low, soft spectrum bars that float near the bottom or sides of the viewport.

Good default because it is readable behind content and not too busy.

### `radial-pulse`

Circular/radial frequency response centered or slightly offset.

Use track seed to vary rotation, radius, and accent emphasis.

### `soft-blob`

Organic blurred blob or contour responding to bass/mids.

Should stay subtle and slow, especially behind content.

### `wave-ribbon`

Smooth time-domain waveform ribbon crossing the screen.

Useful as a calmer mode and good for reduced-motion fallback.

## 10. Palette Registry

Create `visualizerPalettes.ts`.

```ts
type VisualizerPalette = {
  id: string;
  name: string;
  background: string;
  base: string;
  accent: string;
  glow: string;
  secondary?: string;
};
```

Starter palettes:

- `midnight-radio`
- `indie-paper`
- `neon-booth`
- `warm-tape`
- `cloud-fm`
- `editorial-minimal`

Keep palettes restrained enough that page content remains readable.

## 11. Track-Seeded Variation

Create `visualizerSeed.ts`.

Use `currentTrack?.id` as the seed input. Generate deterministic values for small visual differences:

- bar spacing
- curve density
- radial rotation offset
- pulse softness
- accent emphasis
- blob drift direction

Do not store per-track visualizer data yet.

Suggested API:

```ts
function createVisualizerSeed(recordingId: string | undefined): VisualizerSeed;
```

When no track exists, use a stable idle seed.

## 12. Bottom Player Controls

Add a compact control group to `BottomPlayer`.

MVP controls:

- visualizer on/off toggle
- compact mode selector if layout allows

Optional after MVP:

- palette selector
- intensity selector
- dev-only panel toggle

The control should be available even when a track is loaded. For the no-track idle player state, either omit it or show only the toggle if the layout remains clean.

Suggested labels:

- `Visualizer`
- `Off`
- `Mode`

Use icon buttons where possible and keep it visually quieter than play/pause.

## 13. Dev Panel

Add `VisualizerDevPanel` as dev-only.

Visibility conditions:

- `import.meta.env.DEV`
- or localStorage flag: `playlisted.visualizer.dev=true`

Controls:

- mode
- palette
- background color
- base color
- accent color
- glow
- intensity
- background opacity
- motion level
- copy current preset JSON

This should not be visible to normal users by default.

## 14. MVP Implementation Phases

### Phase 1: Player Access

- Add `audioRef` to `AudioPlayerContextValue`.
- Include `audioRef` in the provider value.
- Confirm existing player consumers are unaffected.

Acceptance:

- app compiles
- playback still works
- no changes to playback behavior

### Phase 2: Visualizer State

- Add visualizer types.
- Add palette registry.
- Add provider/store with localStorage persistence.
- Add reduced-motion default handling.

Acceptance:

- settings load with defaults
- settings persist after reload
- invalid stored settings fall back safely

### Phase 3: Persistent Layer

- Add `PersistentVisualizerLayer`.
- Mount it once in `AppShell`.
- Add fixed, pointer-events-none canvas layer.
- Add root data attributes or CSS variables.

Acceptance:

- layer survives route changes
- layer does not intercept clicks
- page scrolling and player controls still work

### Phase 4: Audio Analyser

- Add `useAudioAnalyser`.
- Connect to the existing audio element.
- Avoid repeated media source creation.
- Return reusable frequency/time buffers.
- Fail safely when Web Audio is unavailable.

Acceptance:

- no console errors before playback
- no crash with no track loaded
- no repeated `MediaElementSource` connection error
- no double-routed audio or volume changes
- playback continues if analyser setup fails

### Phase 5: Canvas Renderer and Modes

- Add `canvasRenderer.ts`.
- Implement DPR-aware canvas resizing.
- Add idle rendering.
- Add `ambient-bars`, `radial-pulse`, `soft-blob`, and `wave-ribbon`.
- Clamp DPR to 2.

Acceptance:

- renderer idles with no audio
- renderer reacts to playback
- renderer reduces motion when paused
- disabling visualizer stops or throttles animation
- renderer errors disable the visualizer instead of propagating into the player

### Phase 6: Player Controls

- Add `VisualizerControls` to `BottomPlayer`.
- Support toggle on/off.
- Add mode selector if layout remains clean.

Acceptance:

- toggle hides layer immediately
- toggle preference persists
- player remains usable on desktop and mobile

### Phase 7: Polish and Safety

- Add seeded track variation.
- Add palette selector if still low-risk.
- Add dev-only panel.
- Add tests/smoke checks.

Acceptance:

- visual identity changes per track in subtle deterministic ways
- dev panel is hidden outside dev/local flag
- mobile performance is acceptable

## 15. Tests and Smoke Checks

Suggested test coverage:

- visualizer store returns defaults with empty localStorage
- visualizer store clamps invalid localStorage values
- toggling `enabled` persists to localStorage
- disabled reasons can be represented for user, reduced-motion, performance, and error states
- `PersistentVisualizerLayer` renders without an audio element
- analyser hook handles missing/unsupported Web Audio without throwing
- renderer failure disables the visualizer layer without throwing through the app

Manual smoke checks:

- navigate between pages while audio plays
- start playback, pause, resume, seek, skip track
- toggle visualizer on/off
- reload page and confirm preference persists
- test with no track loaded
- test with reduced-motion enabled
- test mobile viewport
- check browser console for Web Audio and canvas errors

## 16. Risks

### Repeated MediaElementSource connection

This is the highest-risk technical area. Solve it by connecting once per audio element and keeping the source node stable.

### Visual clutter behind content

Keep opacity low by default. Prefer soft contrast and avoid busy central motion.

### Mobile performance

Clamp DPR, reduce detail in low-power/mobile contexts, and avoid allocations per frame.

### Browser audio restrictions

Only initialize/resume `AudioContext` after user interaction or playback events when needed. Failure must not block playback.

### Visualizer failure isolation

Visualizer exceptions should be caught at the provider/layer boundary. Disable the layer, store `disabledReason: "error"`, warn in development, and leave playback untouched.

## 17. Future Expansion

Future work can add:

- WebGL renderer
- beat detection helpers
- user-saved visualizer presets
- playlist-specific visual styles
- artist/creator palette suggestions
- expanded player popover controls
- page-level opt-out classes for dense admin/editorial views

The renderer boundary should make WebGL additive:

```txt
renderers/
  canvasRenderer.ts
  webglRenderer.ts
```

The player and visualizer state API should not need to change for that upgrade.

## 18. Final Build Instruction

The visualizer must be treated as optional decoration. Playback, routing, queue state, and player controls must remain fully functional if the visualizer provider, analyser, canvas renderer, localStorage, or Web Audio API fails.
