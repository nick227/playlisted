# Liminal Doom-Style Autopilot Scene Roadmap

## Vision

Build an autonomous, low-poly, Doom-adjacent liminal exploration scene inside the theatre animation system. Phase one is not player-controlled. The corridor runs itself: the camera drifts forward, doors breathe and open on musical events, faces appear and dissolve, and the whole space behaves like a haunted music visualizer trying to become a game.

The long-term goal is a playable psychedelic corridor ritual. The immediate goal is a passive audio-reactive theatre scene that proves the renderer, camera path, door transitions, and visual language before any input, collision, or route-level game shell is added.

The current implementation direction is scene-based: the viewer moves from room to room, and each room is a stage with its own cast and mood. Corridors are transitions, not the main content. See [liminal-doom-ai-developer-directions.md](./liminal-doom-ai-developer-directions.md) for the implementation-facing brief.

## Creative Pillars

- **Liminal pressure:** long corridors, impossible repetition, ambiguous scale, distant doors, and spaces that feel almost institutional but wrong.
- **Gritty music culture:** stickered doors, concrete, cheap venue lighting, stained floors, blown speakers, torn posters, basement-show color palettes, and harsh bloom.
- **Unstable presence:** faces appear in walls, behind doors, inside light leaks, and in the negative space between hallway segments.
- **Flat-poly unease:** geometry is simple, sharp, and visibly projected. The renderer should feel hand-built and slightly imprecise.
- **Audio as architecture:** bass gives weight to floors and doors, mids bend thresholds, highs flicker faces and lights, chaotic hits collapse the hallway outward.
- **Autopilot first:** phase one should feel exploratory without input. The future playable layer should sit on top of an already-working autonomous camera and world loop.

## Renderer Direction

Use a custom Canvas 2D flat-poly perspective renderer rather than raycasting or WebGL.

Recommended approach:

- Represent the world as corridor segments, doors, wall planes, floor planes, ceiling planes, decals, and face sprites.
- Project simple world-space points into screen-space using a lightweight perspective camera.
- Draw visible quads with flat fills, gradients, noise overlays, and painter's-algorithm z sorting.
- Keep geometry intentionally low detail. Texture should come from decals, color shifts, procedural grime, and bloom-style compositing.
- Use screen-space post effects for punch, shake, palette inversion, smear, and bloom approximations.

Why this route:

- It fits the existing theatre system and `CanvasAnimation` lifecycle.
- It avoids WebGL setup complexity while still supporting non-rectilinear spaces.
- It allows the camera to drift, roll, and breathe in ways that strict raycasting fights.
- It supports the desired expressionist, low-poly, haunted-venue feel.

## Phase One Experience

The first theatre-scene demo should include:

- A first-person corridor view rendered on Canvas 2D.
- Autonomous forward camera drift with low-frequency wander.
- Procedurally appended hallway segments.
- One distant closed door as the initial visual objective.
- Beat, onset, or chaos-triggered threshold passages.
- Phase-based world behavior: `approach`, `threshold`, `passage`, `inhabited`, `voidBloom`.
- Audio-reactive camera motion and visuals when theatre audio features are available.
- Synthetic fallback motion when no analyser is available.
- Reduced-motion and low-power behavior that lowers shake, flashes, face density, and post effects.

Explicitly out of phase one:

- Player movement.
- Pointer lock.
- Input handling.
- Collision.
- Fail states.
- Game HUD.

## Scene Phases

### approach

Long empty corridor. The world should feel quiet but loaded.

- Distant door anchors the composition.
- Bass subtly darkens floor planes and thickens grid lines.
- Camera drift is slow and uncertain.
- Decals are sparse: stains, torn show flyers, painted arrows, broken venue markings.

### threshold

The autonomous camera nears a door. The environment begins responding more obviously.

- Door breathes with mids.
- Door frame bends or shears slightly.
- Light leaks around the threshold.
- Movement may slow as if the room is resisting the camera.
- First face hints can appear in reflections, cracks, or poster shapes.

### passage

Crossing a threshold becomes the scene's main ritual transition.

- Beat hit, onset, or chaos trigger creates screen punch.
- Door plane opens, splits, melts, or overexposes.
- Old corridor falls away behind the camera.
- New corridor segments spawn ahead.
- Palette shifts but keeps continuity with the track energy.

### inhabited

The hallway starts to watch back.

- Faces appear in doors, wall panels, ceiling stains, speaker cones, and poster fragments.
- Highs cause face flicker, eye glints, and short-lived mask shapes.
- Door density increases.
- Some doors are fake, some breathe, some show silhouettes.
- The corridor may subtly narrow or tilt during chaotic audio moments.

### voidBloom

The scene temporarily collapses into maximum psychedelic pressure.

- Palette inversion or harsh complementary swap.
- Hallway planes pull outward from their vanishing structure.
- Faces multiply or smear into geometry.
- Bloom and overdraw peak briefly.
- After the hit, the world resets into a new quieter corridor state.

## Proposed File Structure

```txt
apps/web/src/theatre/animations/liminalDoom/
  LiminalDoomScene.ts
  camera.ts
  projection.ts
  world.ts
  generator.ts
  renderer.ts
  phases.ts
  autopilotCamera.ts
  palette.ts
  postFx.ts
  decals.ts
  faces.ts
  doors.ts
  types.ts
```

Initial registry integration:

- Add a theatre scene preset such as `liminal-doom-demo`.
- Mark it as a high-intensity or opt-in dynamic preset.
- Keep it out of calm default rotation until the demo has performance safeguards.

## Core Systems

### Camera

- Position: `x`, `y`, `z`.
- Rotation: yaw, pitch, optional roll.
- Drift: layered low-frequency procedural offset.
- Audio response: bass affects step weight, mids affect threshold pull, chaos affects shake and roll.
- Passage targeting: camera motion should bias toward doors as threshold timing approaches.

### Autopilot Camera

Phase one depends on the camera path feeling intentional without becoming obviously looped.

- Use layered sinusoids with different long periods for lateral drift, vertical bob, yaw, pitch, and roll.
- Modulate drift amplitudes with audio energy, but keep a non-audio baseline so silence still moves.
- Add seeded noise or slowly changing random targets so a three-minute run does not reveal a simple loop.
- Maintain a forward progression clock independent from visual shake.
- When a door is upcoming, gently correct the camera path so big musical hits can land near the threshold.
- Use chaos/onset triggers for lurches, hard leans, and sudden focus pulls.
- In reduced motion, preserve forward drift but greatly reduce roll, shake, and sudden lurches.

### Synthetic Fallback Camera Motion

When no analyser is connected, the scene should still feel alive, but it should not fake beat sync too aggressively. The fallback should feel like a steady sleepwalk with unstable security-camera drift.

- Forward speed follows a slow breathing curve instead of a constant conveyor-belt pace.
- Lateral drift uses layered long-period waves plus seeded target changes.
- Small yaw corrections imply attention moving from door to wall to ceiling stain.
- Rare synthetic pulses can trigger minor door breath, but full `passage` events should use slower script timing.
- Fallback intensity should stay below real audio-reactive intensity so connected playback feels meaningfully different.
- Reduced-motion fallback becomes almost processional: forward drift, minimal roll, minimal shake.

### World Model

- Corridor is a list of generated segments.
- Each segment owns dimensions, palette influence, door candidates, decals, lights, and face anchors.
- Segment parameters should be deterministic from a seed so bugs and interesting worlds can be replayed.
- Old segments can be culled after they are far behind the camera.

### Projection

- Transform world points relative to camera.
- Clip or skip points behind the near plane.
- Project to screen using a simple focal length.
- Emit screen-space polygons with depth values for z sorting.

### Renderer

- Build a draw list of quads, sprites, decals, and post-effect primitives.
- Sort back-to-front by approximate depth.
- Draw flat fills first, then grime, decals, faces, light leaks, and bloom overlays.
- Prefer stable geometry over visual perfection.

### Audio Reactivity

Use `context.shared.features` and `context.shared.getTriggers` first.

- Bass: floor pulse, camera weight, door impact, hallway depth breathing.
- Mids: door bending, wall shear, poster movement, threshold shimmer.
- Highs: face flicker, light stutter, edge noise, fine bloom.
- Chaos/onset: screen punch, palette shifts, geometry collapse, passage transitions.

### Script Runner Layer

Use the existing stop-motion/script DSL idea for macro pacing, not individual corridor layout.

The script should manage:

- phase transitions
- intensity curves
- face-density ramps
- voidBloom timing
- reset conditions
- rare special moments
- threshold windows that make door passages feel earned in autopilot mode

The procedural generator should manage:

- actual corridor segments
- door placement
- face anchors
- decals
- geometry variation

## Milestones

### 1. Renderer Spike

Deliver a static corridor drawn through the custom projection renderer.

- Floor, ceiling, left wall, right wall.
- A closed door at the far end.
- Flat fills and simple depth shading.
- Canvas resizes through `CanvasAnimation`.
- No audio, no input, no procedural generation yet.

Success criteria:

- The visual grammar works immediately.
- The corridor feels dimensional and low-poly.
- The far door reads as a destination.

### 2. Moving Camera Demo

Add autonomous camera drift.

- Slow forward movement through corridor space.
- Layered lateral drift, bob, yaw, pitch, and roll.
- Non-looping synthetic fallback motion.
- Audio-modulated camera weight when features are available.
- Stable projection while moving.

Success criteria:

- It feels like someone or something is moving through the hallway.
- It can run for several minutes without feeling like a short loop.

### 3. Procedural Corridor Chain

Generate corridor segments ahead of the camera.

- Segment dimensions vary within strict guardrails.
- Doors appear at believable intervals.
- Old segments are culled.
- A seeded generator can reproduce a run.

Success criteria:

- The hallway can continue indefinitely.
- Variation is noticeable but not chaotic.

### 4. Door Threshold Interaction

Make doors meaningful.

- Detect when the autonomous camera is near a door.
- Trigger `threshold`.
- On beat, onset, or chaos hit, transition through `passage`.
- Spawn a new corridor state after crossing.
- Add timing windows so the camera is close enough to the door when major musical events land.

Success criteria:

- Doors feel like scene transitions, not static props.
- The experience has a repeatable autonomous scene loop.

### 5. Faces And Inhabited State

Introduce faces as environmental events.

- Face anchors on doors, walls, posters, ceiling, and light leaks.
- Face probability increases with phase intensity.
- High-frequency audio controls flicker and reveal.
- Faces should be uncanny but cheap to draw: simple masks, cutout silhouettes, distorted portraits, or procedural features.

Success criteria:

- The world starts to feel occupied without relying on complex character AI.
- Faces are surprising but do not destroy readability.

### 6. Audio Reactive Pass

Wire visuals to theatre audio features.

- Bass floor weight.
- Midrange door bend.
- High flicker.
- Triggered screen punch.
- Chaos-driven palette inversion and geometry collapse.

Success criteria:

- The track changes the architecture.
- No-audio fallback still feels alive.

### 7. VoidBloom Event

Build the first full collapse sequence.

- Geometry expands or tears away from the vanishing point.
- Palette inversion.
- Face multiplication.
- Bloom/overdraw peak.
- Reset into a new corridor.

Success criteria:

- The sequence feels like a climax, not random noise.
- It remains performant and recovers cleanly.

### 8. Theatre Preset Integration

Register the scene inside the theatre system.

- Add preset metadata.
- Respect reduced motion.
- Respect low-power policy.
- Ensure `stop()` and `destroy()` clean up scene state.
- Keep it opt-in while experimental.

Success criteria:

- The scene behaves like a first-class theatre animation.
- Entering and exiting theatre mode leaves no stuck scene state or running loops.

## Performance Budget

Initial constraints:

- One Canvas 2D layer.
- Controller-owned RAF via external driving.
- Avoid per-frame allocation inside the draw path.
- Cap draw-list size.
- Cull segments and decals behind the camera.
- Clamp DPR through theatre performance policy.
- Reduce faces, bloom passes, shake, and decals in low-power mode.

Target:

- Smooth desktop playback at normal theatre dimensions.
- Acceptable reduced version on lower-power devices.
- No impact on audio playback if the scene fails.

## Art Direction Notes

Palette families should avoid a single clean neon look. Favor ugly, lived-in combinations:

- nicotine yellow, emergency red, dead fluorescent green
- oxidized teal, black concrete, dirty white
- sodium orange against cold utility blue
- bruised magenta with cheap LED cyan
- overexposed white bloom used sparingly for thresholds

Geometry language:

- corridors are simple but skewed
- doors are too tall or too narrow
- floor grids do not perfectly align
- posters and stickers create cultural texture
- venue-like details should feel specific: hand stamps, show flyers, cable runs, speaker stacks, painted arrows, bathroom tile, backroom doors

Faces:

- avoid polished horror-monster design
- use cheap photocopy-mask energy
- make faces sometimes ambiguous: stains, xerox posters, security-camera smears, reflections
- let them disappear before the viewer fully understands them

## Open Decisions

- How much direct player control should exist in theatre mode before it stops feeling like a visual scene and becomes a separate game route?
- When the playable layer arrives, should pointer lock live inside theatre mode or only in a dedicated game route?
- Should faces be procedural drawings first, generated bitmap assets later, or derived from curated venue/photo textures?
- Should the demo have a fail state, or should it stay as an endless ritual with escalating resets?
- Should this live only as a theatre preset, or eventually graduate into its own `/experience/liminal` route?
- What should the synthetic fallback camera motion feel like when no audio analyser is connected: steady sleepwalk, unstable security-camera drift, or ritual procession?

## First Build Task

Start with `drawCorridor(ctx, camera, segments, palette)`.

The first implementation should only prove the visual grammar:

- one generated corridor
- one end door
- floor, ceiling, wall quads
- simple perspective projection
- z-sorted flat polygons
- a small amount of procedural grime

Once that feels right, layer in autonomous camera motion. Once the camera feels alive, make doors matter. The faces and bloom should arrive after the hallway itself has a pulse.

## Future Playable Layer

The future game demo should reuse the phase-one renderer, world generator, door system, and camera model.

Likely additions:

- input handling
- collision
- player-controlled movement
- pointer lock or keyboard-only mode
- interactable doors
- route-level game shell if theatre mode becomes too constrained
- optional fail states or objective structure

The key design constraint is that phase one should not be thrown away when playability arrives. Autopilot movement should become the attract-mode, idle-mode, or assisted-camera layer for the later game.
