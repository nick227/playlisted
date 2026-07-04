# Metropolis — Epic Theatre FX Plan

**Codename:** `metropolis`  
**Preset target:** `metropolisNight` (lab → production when ready)  
**Package type:** Internal engine (not public Author SDK v1)  
**View:** 3/4 aerial oblique — SimCity / GTA night map energy, Playlisted gritty culture  
**Aesthetic:** Rich **16–24-bit pixel metropolis** — deep palettes, dense detail, not photoreal 3D

---

## Vision (one paragraph)

A sprawling night city seen from above at a 3/4 angle: grid and organic roads threading through districts that tell different stories — rusted industry, collapsed affordable blocks, neon nightlife, decadent towers, horror pockets, substance haze, rap/rock venues, theatre marquees, parking-lot parties. Cars move. Windows flicker. Smoke and steam rise. The moon and clouds drift. Over a full preset hold (~90s+), **timed events** punctuate the city (blackout wave, sirens, club strobe spill, train pass, fireworks over the river, etc.) while **audio** pushes district intensity.

---

## Architectural fit

| Concern | Approach |
|---------|----------|
| SDK scope | **Internal** — extends `CanvasAnimation`, uses runtime APIs, phased director like `liminalDoom` |
| Single canvas | Yes — one layer, multi-pass renderer inside |
| Time | `MetropolisDirector` — script + phase machine (see `stopMotionScript`, `liminalDoom` phases) |
| Scale | **Chunked city** — generate from seed; never hand-place every building |
| Performance | LOD tiers, offscreen caching, `particleScale` / `lowPower` gates |

---

## Aesthetic pillars

1. **Palette:** Night base `#080810` → `#1a1a2e`; neons saturated but dirty; sodium streetlights `#ffb347`; no clean Disney city.
2. **Pixel depth:** Target **24-bit color** with **16-bit-era composition** — limited silhouette vocabulary, maximal texture in windows/signage/grime.
3. **Culture:** Dilapidated > pristine. Every district has decay layer (stains, broken signs, tarps, graffiti, flickering bulbs).
4. **Readability at theatre scale:** Strong district color coding + motion (cars, signs) so mood reads on phone screens.

---

## Camera & space

```
        N (vanishing)
         ↗
    W ←  ●  → E   camera above SW, looking NE
         ↘
        S

Screen X = (worldX - worldY) * cos(θ)
Screen Y = (worldX + worldY) * sin(θ) * 0.5 - elevation
```

**Tasks (Phase A — Foundation)**

| ID | Task | Done when |
|----|------|-----------|
| A1 | Define `WorldCoord`, `ScreenCoord`, `TileSize`, camera bounds | Unit tests for round-trip / z-order |
| A2 | Implement `project(x,y,z)` + `depthSort` key | Known cube corners map correctly |
| A3 | Viewport pan/zoom (slow drift + optional audio-driven nudge) | City fills frame at all aspect ratios |
| A4 | `MetropolisScene.ts` shell — empty sky + ground plane | Registers as dev preset, one frame renders |

---

## Render pipeline (back → front)

```
1. Sky gradient + stars + moon + cloud layers
2. Distant horizon haze / city glow bloom
3. Terrain (water, dirt, rail embankments)
4. Roads (base asphalt, markings, potholes, wet reflections)
5. Building footprints sorted by depth
6. Facades (walls, windows, roofs, fire escapes)
7. Roof clutter (AC units, antennas, laundry)
8. Street furniture (lamps, signs, trash, barriers)
9. Vehicles + trains
10. Particle FX (steam, smoke, embers, rain)
11. Atmospheric overlay (fog, vignette, chromatic grit)
12. Event flashes (blackout, lightning, strobe spill)
```

**Tasks (Phase B — Renderer core)

| ID | Task | Done when |
|----|------|-----------|
| B1 | `RenderPass` interface + ordered pass list | Passes can be toggled in dev |
| B2 | Offscreen layer cache for static chunks | Profiling shows cache hit on static tiles |
| B3 | Depth-sorted draw list for dynamic entities | Cars occlude correctly behind tall blocks |
| B4 | Night lighting model (window LUT, street cone, neon bleed) | Same building reads lit vs dead |

---

## City generation

**Model:** Seed → district map → block grid → lot → building archetype → facade variant.

```
┌─────────────────────────────────────┐
│ IND │ IND │ PORT │ RUST │ RUST      │
│─────┼─────┼──────┼──────┼───────────│
│ HOOD│ HOOD│ CLUB │ CLUB │ DECADENT  │
│─────┼─────┼──────┼──────┼───────────│
│ HOOD│ RUIN│ STRIP│ THEAT│ DECADENT  │
│─────┼─────┼──────┼──────┼───────────│
│ RAIL│ FACT │ FACT │ HOBO │ RIVER    │
└─────────────────────────────────────┘
```

**District enum (v1 set)**

| Zone | Mood | Visual hooks |
|------|------|----------------|
| `projects` | Poverty | Broken windows, fire barrels, cop lights distant |
| `industrial` | Industry | Smokestacks, sparks, chain-link, floodlights |
| `strip` | Decadence / vice | Pink/purple neon, motels, parking lots |
| `clubRow` | Nightlife | Strobe spill, bass-pulse windows, queue silhouettes |
| `theatre` | Entertainment | Marquees, ticket booths, poster walls |
| `venue` | Rap / rock | Venue signs, line crowds, speaker stacks on roof |
| `horror` | Horror | Flicker, abandoned hospital, wrong-color glow |
| `haze` | Substance / liminal | Heat shimmer, purple haze, slow pedestrians |
| `rust` | Dilapidated commercial | Empty shops, boarded glass, faded signs |
| `waterfront` | River / port | Cranes, boats, reflections |
| `core` | Dense downtown | Tall stacks, traffic density highest |

**Tasks (Phase C — Generation)

| ID | Task | Done when |
|----|------|-----------|
| C1 | `DistrictId` + weighted noise map on city grid | Map renders false-color debug overlay |
| C2 | Road generator (highway spine, grid, alleys) | Connected graph, no orphan segments |
| C3 | Block subdivision → lots | Lots respect road frontage |
| C4 | Building archetype library (≥12 types × 4 variants) | At least 48 visually distinct footprints |
| C5 | Facade generator (windows, signs, grime passes) | Same archetype varies by district |
| C6 | City seed reproducibility test | Same seed → identical city bytes |

---

## Sky & atmosphere (Phase D)

| ID | Task | Done when |
|----|------|-----------|
| D1 | Star field (parallax layers, twinkle) | Visible on dark band above horizon |
| D2 | Moon phase + halo + cloud occlude | Moon hides behind cloud layers correctly |
| D3 | Cloud drift (2–3 speeds) | Parallax reads depth |
| D4 | Horizon glow from city light pollution | Glow color shifts with active district events |
| D5 | Weather states: clear / hazy / light rain | Audio `highs` triggers rain optional |

---

## Motion systems (Phase E)

| ID | Task | Done when |
|----|------|-----------|
| E1 | Car entity pool + lane following | Cars follow road graph, stop at intersections |
| E2 | Headlight/taillight trails (cheap) | Visible motion blur on highway |
| E3 | Train on rail district edge (timed) | Crosses city every N seconds |
| E4 | Window flicker + sign animation tick | Async phases, not all sync |
| E5 | Pedestrian dots (optional LOD) | Disabled on `lowPower` |
| E6 | Smokestack / vent particles | Respects `particleScale` |

---

## Timed events (Phase F — Director)

**`MetropolisDirector`** — timeline of scripted beats; can jump/branches on audio triggers.

Example beat sheet (first playable vertical slice):

| Time | Event |
|------|-------|
| 0s | Establish — slow pan, city hum glow |
| 8s | Highway traffic density + |
| 16s | Club row strobe spill (bass-driven) |
| 24s | Blackout wave rolls across `projects` → `core` |
| 32s | Power returns; sirens in `hood` |
| 40s | Train pass (foreground) |
| 48s | Fireworks over `waterfront` (chorus hit) |
| 56s | Horror pocket flicker cascade |
| 64s | Decadence strip neon surge |
| 72s | Wind + cloud cover moon |
| 80s+ | Loop or hold ambient |

**Tasks**

| ID | Task | Done when |
|----|------|-----------|
| F1 | `MetropolisEvent` type + timeline runner | Events fire at ms offsets in dev log |
| F2 | Event implementations (blackout, strobe, siren flash, fireworks) | Each isolated and testable |
| F3 | Audio trigger overrides (`beat`, `bassHit`, `chaosHit`) | Bass hit can fire strobe early |
| F4 | `reducedMotion` path — static city, minimal cars | Passes policy check |

---

## Audio reactivity (Phase G)

| Band / trigger | City response |
|----------------|---------------|
| `bass` | Club/theatre window pulse, highway rumble |
| `mids` | Sign flicker rate, car density micro-boost |
| `highs` | Rain shimmer, neon sparkle |
| `beat` | Strobe event eligibility, screen punch (micro) |
| `chaosHit` | Blackout wave, horror flicker, siren |
| `energy` | Horizon glow intensity, traffic speed |

| ID | Task | Done when |
|----|------|-----------|
| G1 | `readAudio(context)` → district weights | Debug overlay shows active zones |
| G2 | Wire district weights to window/sign shaders | Club row visibly louder on bass |
| G3 | Global `cityEnergy` smoothed envelope | No flicker spam on silence |

---

## Performance (Phase H)

| Tier | Policy |
|------|--------|
| Full | All passes, max cars, pedestrians |
| Lite | Skip pedestrians, half cars, static clouds |
| Low | Static city + looped car sprites only |
| Reduced motion | No pan, minimal animation, no strobes |

| ID | Task | Done when |
|----|------|-----------|
| H1 | Chunk visibility culling | Off-screen chunks skip draw |
| H2 | Static chunk bake to bitmap | FPS stable on mid phone |
| H3 | Dev overlay: pass timings, entity counts | `?theatreDev=1` panel section |

---

## Package structure (target)

```
packages/metropolis/
  PLAN.md                    ← this file
  index.ts                   ← defineAnimationPackage / internal registration
  MetropolisScene.ts         ← CanvasAnimation entry
  director/
    MetropolisDirector.ts
    events/
  world/
    coords.ts
    cityGen.ts
    districts.ts
    roads.ts
  render/
    passes/
    palette.ts
    lighting.ts
  entities/
    Car.ts
    Train.ts
  assets/                    ← optional PNG sheets later
  scripts/
    metropolisNight.script.ts
  presets.ts
  manifest.ts
```

---

## Milestone roadmap (recommended order)

### M0 — Plan lock ✅
- [x] This document
- [ ] Sign off aesthetic reference board (2–3 mood images / palette swatch)

### M1 — Vertical slice (playable ugly)
**Goal:** Small 32×32 tile city, one district of each type, sky, 10 cars, no events.  
**Tasks:** A1–A4, B1, C1–C3, D1, E1, G1

### M2 — City scale
**Goal:** 128×128 effective sprawl, full road network, 48+ building variants.  
**Tasks:** C4–C6, B2–B4, E2–E4

### M3 — Life & atmosphere
**Goal:** Weather, particles, trains, full sky.  
**Tasks:** D2–D5, E3, E5–E6, H1–H2

### M4 — Event timeline
**Goal:** 90s scripted night with 8+ event types + audio overrides.  
**Tasks:** F1–F4, G2–G3

### M5 — Polish & ship
**Goal:** Production preset, reduced-motion path, QA checklist.  
**Tasks:** H3, preset tuning, `reducedMotionPreset: 'quietPulse'`

---

## Out of scope (for now)

- True 3D mesh / WebGL city
- Interactive camera user control
- Day cycle
- Named NPC characters
- Interior room views (separate preset if ever)
- Multi-layer theatre composition (single canvas only)

---

## Open decisions (locked — top settings)

1. **Tile resolution:** **16px** base tile @ 1080p reference
2. **Pan behavior:** Slow autonomous drift + **audio-driven sway/zoom**
3. **Culture tone:** Full gritty implied pockets (neon, haze, horror flicker — stylized not literal)
4. **Preset duration:** **120s flagship hold**, looping timeline
5. **References:** SimCity 2000 density + GTA III night map + Playlisted decay

---

## Progress

### M1 — Vertical slice ✅
- [x] A1–A4 Coords, projection, camera, scene shell
- [x] D1 Sky (stars, moon, clouds, light pollution)
- [x] C1–C3 District map, roads, lots/buildings (48×48)
- [x] E1 Traffic (48 cars)
- [x] F1 Timeline director (blackout, strobe, siren, fireworks)
- [x] G1 Audio → camera sway + window pulse + events
- [x] Dev preset `metropolisNight` registered

### M2 — City scale (in progress)
- [x] B2 Static city layer cache (zoom-keyed bake, drift/sway via translate)
- [x] B3 Building detail — fire escapes, roof clutter, neon signs, theatre marquees
- [x] B4 Wet road shimmer + animated water reflections
- [x] C4 Building archetype library (12 types × 4 variants = 48)
- [x] C5 Facade generator — archetype roof styles, billboards, window density
- [x] C6 City seed reproducibility test (fingerprint)
- [x] C1–C3 Scale to 128×128 + tiered road network (highway/arterial/local)
- [x] D2 Train pass on dedicated rail row
- [x] F2 Rolling blackout wave (projects → core district sweep)
- [x] F3 Expanded timeline — horror cascade, neon surge, moon cover (8 events)
- [x] E2 Headlight trails on traffic
- [x] E5 Pedestrians (LOD via particleScale)
- [x] E6 Industrial vent smoke particles
- [x] H1 Chunk visibility culling
- [ ] H3 Dev overlay pass timings / entity counts

---

## Open decisions (superseded — see locked settings above)

---

## Next session starter

When ready to code, begin **M1 / Phase A**:

```
Task A1 → A4: coords + MetropolisScene shell + dev preset registration
```

No generation until camera projection tests pass.
