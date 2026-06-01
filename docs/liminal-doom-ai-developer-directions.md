# Liminal Doom - Scene-Based Theatre Animation

## Developer Direction

Build a passive audio-reactive theatre scene where the viewer moves autonomously through a sequence of rooms. Each room is a self-contained stage with a cast, a mood, and scene-specific audio behavior. The hallway is only the transition between rooms.

This is not a corridor simulator. It is a sequence of strange venue dioramas the viewer drifts through.

Phase one has no player input, collision, HUD, fail state, or pointer lock. It is pure autopilot.

## Core Model

```txt
Room -> Scene -> Transition -> Room
```

Every room has:

- the same cheap shell: floor quad, ceiling quad, left wall quad, right wall quad
- a back wall where the scene composition lives
- a generated cast of flat-poly primitives
- scene-specific audio reactivity
- a passage trigger that moves the viewer onward

The corridor between rooms should be short and cheap:

- simple connecting geometry
- smoke or haze quads for depth
- one or two wall decals
- fast passage into the next room

The room is where the visual meaning lives. The corridor is breath and punctuation.

## Scene Types

These are the initial scene vocabulary. Each scene is a back-wall composition made from flat Canvas 2D primitives.

### Band Stage

Highest-energy scene type.

- Speaker stack rectangles left and right.
- Drum kit as overlapping circles and rectangles center back.
- Two or three figure silhouettes.
- Guitar neck shapes visible.
- Bass hits push speaker geometry forward.
- Drummer figure animates on beat.
- Stage lights pulse and clip into ugly bloom.
- Speaker cones can briefly become faces.

### Bar

Social, grimy, watchful.

- Long horizontal counter quad.
- Bottle silhouettes behind the counter: thin rectangles with slight shoulder taper.
- Bartender figure leaning forward.
- Stool silhouettes in front.
- Highs make bottles clink, jitter, or shift.
- Bartender face holds eye contact too long.
- Mids can animate the bartender mouth or jaw.

### Dance Floor

Crowded, strobing, unstable.

- Cluster of abstract human shapes.
- Bodies are simple ovals, rectangles, triangles, and bent limbs.
- Strobe effect tied to beat.
- Figures multiply slightly during `inhabited`.
- Chaos hit scatters or smears the crowd.
- No detailed faces unless the phase escalates.

### Conversation

Primary face-and-phrase delivery scene.

- One or two oversized faces near camera.
- Faces are slightly too large and too close.
- Text fragments or speech-bubble shapes appear, hold, and dissolve.
- The face watches the viewer.
- Mouth animation responds to mids.
- This scene owns the highest face detail budget.

Other scene types should keep face detail cheap so this one can spend the visual budget.

### Hallway Crowd

Transition scene with pressure.

- Simple figures lining both walls.
- Density increases as the camera moves forward.
- Figures barely move.
- They watch.
- Useful between heavier rooms or before `voidBloom`.

## Faces

Faces are the one place where detail budget exists. All other primitives stay minimal so faces can be expressive.

Faces may appear in:

- the conversation scene as the primary subject
- the bartender in the bar scene
- speaker cones in the band scene
- graffiti shapes on corridor walls
- door surfaces during threshold phase
- smoke shapes during inhabited phase

Face drawing approach:

- procedural mask shapes
- not realistic
- photocopied, xeroxed, degraded energy
- two eye shapes, a mouth shape, and a rough head outline
- distorted proportions
- recognizable as faces, but slightly wrong

Face behavior:

- `idle`: slow pulse on a breathing curve
- `watching`: eyes track toward camera center
- `talking`: mouth shape animates on mids
- `dissolving`: opacity drops on highs, shape fragments

Faces should disappear before the viewer fully resolves them. The uncertainty is the effect.

## Phrases

Phrases belong primarily to conversation scenes.

They should feel like fragments overheard in a venue, not exposition.

Examples of phrase behavior:

- appear as torn captions, speech bubbles, wall text, or subtitle-like shards
- hold just long enough to read partially
- smear, clip, or dissolve on highs
- pulse or open with mids when attached to a talking face
- sometimes be cut off mid-thought

Keep phrases modular so the generator can combine face type, room mood, and phrase bank later.

Seed phrase bank for phase one:

- "you came through the wrong door"
- "the sound guy left already"
- "don't look at the lights"
- "we played here before the ceiling fell"
- "your friend was just here"
- "cash only after midnight"
- "the green room is not green"
- "everyone hears it different"
- "keep your wristband visible"
- "that speaker has a face"
- "you missed the first set"
- "nobody goes backstage twice"
- "she said the hallway moved"
- "the drums are under the floor"
- "drink tickets are a kind of prayer"
- "you can stand there but don't stay"
- "the bartender knows your name wrong"
- "follow the cable"
- "this room used to be louder"
- "they are waiting between songs"
- "the exit sign is lying"
- "beautiful crowd tonight"
- "don't tell them you saw me"
- "one more door and then it starts"

Do not ship placeholder phrase text. The conversation scene depends on real fragments from the start.

## Audio Reactivity Map

Use theatre shared features and trigger helpers first:

- `context.shared.features`
- `context.shared.getTriggers`
- `context.shared.time`

| Signal | Primary Uses |
| --- | --- |
| Bass | speaker push, floor grid weight, light pulse, figure lean, smoke density |
| Mids | door frame bend, poster peel, talking-mouth animation, bottle shift |
| Highs | fluorescent flicker, face reveal, grime shimmer, dance-floor strobe |
| Beat | drummer hit, screen punch at threshold, stool tap, crowd snap |
| Chaos | geometry lurch, palette shift, face multiplication, `voidBloom` trigger |
| Onset | passage trigger, light drop, emergency color shift |

Scene-specific behavior:

- Band: bass and beat dominate.
- Bar: highs and mids dominate.
- Dance floor: beat, highs, and chaos dominate.
- Conversation: mids, highs, and face timing dominate.
- Hallway crowd: bass pressure and slow density ramps dominate.

## Autopilot Camera

The camera must make the viewer feel like they are moving from room to room, watching something, then moving on.

Core rules:

- No input in phase one.
- Forward motion is autonomous.
- Camera slows when approaching a scene.
- Camera holds while a room performs for a defined watch budget.
- Passage triggers move the camera through the next hallway.
- Camera motion should not feel like a short loop.

Watch duration budget:

- Default room hold: 12 seconds.
- Low-energy or sparse rooms: 8 to 10 seconds.
- High-energy rooms with strong audio activity: 14 to 20 seconds.
- Conversation scenes: 10 to 16 seconds, long enough for one phrase to partially land and dissolve.
- `voidBloom` may interrupt this budget when chaos stays high or a scripted collapse is due.
- Reduced-motion mode should favor the shorter side of the range to avoid prolonged visual strain.

Recommended motion:

- layered long-period sinusoids for lateral drift, bob, yaw, pitch, and roll
- seeded target changes so the gaze wanders from subject to subject
- bass-weighted step or floor pressure
- chaos-triggered lurches
- gentle subject framing during room holds
- threshold targeting so big hits land near doors or passage points

Synthetic fallback with no analyser:

- steady sleepwalk forward motion
- unstable security-camera drift
- slow breathing curve for speed
- rare synthetic pulses for minor door breath
- passage events driven by script timing rather than fake beat sync

## Phases

The scene still uses macro phases, but they now apply across room scenes rather than only corridors.

### approach

Camera approaches a room or visible back-wall scene.

- shell geometry establishes perspective
- scene silhouettes are readable from distance
- audio lightly affects lights and floor

### watch

Camera holds on the scene.

- room cast performs
- audio reactivity becomes scene-specific
- viewer has time to understand the room within two seconds
- hold lasts within the watch duration budget defined in `Autopilot Camera`

### threshold

Room begins to give way.

- door, back wall, curtain, light bloom, or smoke opens a passage
- scene geometry bends or dims
- onset or beat can trigger passage

### passage

Viewer moves between rooms.

- fast connecting corridor
- smoke, decals, door frames, crowd silhouettes
- old scene falls away
- new room is generated ahead

### inhabited

Faces and watching figures become more common.

- faces appear in scene anchors
- crowd density increases
- room casts react more directly to viewer

### voidBloom

High-intensity collapse and reset.

- palette shift or inversion
- scene geometry pulls apart
- faces multiply or smear
- bloom/overdraw peak
- reset into a new room sequence

## Proposed File Structure

```txt
apps/web/src/theatre/animations/liminalDoom/
  LiminalDoomScene.ts
  projection.ts
  autopilotCamera.ts
  world.ts
  generator.ts
  rooms.ts
  scenePrimitives.ts
  scenes.ts
  renderer.ts
  phases.ts
  palette.ts
  postFx.ts
  faces.ts
  phrases.ts
  decals.ts
  doors.ts
  types.ts
```

## Primitive Contract

`scenePrimitives.ts` must be built before complex scene composition. It is the shared catalogue of reusable flat-poly drawing functions. `scenes.ts` should handle layout, timing, and parameter passing; it should not accumulate one-off inline drawing code.

Primitive functions should:

- accept a render context or `CanvasRenderingContext2D`
- receive normalized room-space positions where possible
- accept audio-reactive parameters such as `bass`, `mids`, `highs`, `beat`, or `chaos`
- avoid allocations in the draw path
- draw only one reusable thing
- stay visually cheap unless explicitly drawing a face

Initial primitive catalogue:

```ts
drawSpeaker(ctx, x, y, w, h, bassLevel, options)
drawDrumKit(ctx, x, y, scale, beatLevel, options)
drawFigure(ctx, x, y, scale, pose, energy, options)
drawGuitarNeck(ctx, x, y, length, angle, energy, options)
drawBarCounter(ctx, x, y, w, h, options)
drawBottle(ctx, x, y, scale, highLevel, options)
drawStool(ctx, x, y, scale, tapLevel, options)
drawDanceBody(ctx, x, y, scale, pose, strobeLevel, options)
drawDoorFrame(ctx, x, y, w, h, bendLevel, options)
drawSmokeQuad(ctx, quad, alpha, options)
drawPosterShard(ctx, x, y, w, h, peelLevel, options)
drawPhraseShard(ctx, phrase, x, y, w, revealLevel, options)
```

Scene files should compose primitives like stage blocking. If a visual element is reused across two scene types, it belongs in `scenePrimitives.ts`.

## Face Implementation Decision

Phase one faces are procedural only.

Do not evaluate bitmap face generation for the first build. The target aesthetic is photocopied mask energy, and procedural drawing gives the best control over performance, morphing, flicker, and audio reactivity.

`faces.ts` should provide:

- procedural head outlines
- eye shapes that can track camera center
- mouth shapes that can animate on mids
- distortion parameters for wrong proportions
- dissolve and fragmentation controls
- optional offscreen bitmap caching for stable face states

Bitmap, generated, or curated texture faces can be reconsidered after the procedural face system is working and profiled.

## Implementation Order

### 1. Projection And Static Room

Build `projection.ts` and render one static room.

- floor, ceiling, left wall, right wall
- back wall
- one simple doorway or passage point
- flat polygon projection
- depth shading

This proves the visual grammar.

### 2. Autopilot Camera

Build `autopilotCamera.ts` with synthetic motion first.

- forward drift
- room approach
- room hold
- passage movement
- no audio dependency yet

The room should feel alive before audio is wired in.

### 3. World And Room Generator

Build `world.ts`, `generator.ts`, and `rooms.ts`.

- chain rooms together
- choose scene type per room
- generate cheap shells
- cull rooms behind the camera
- keep deterministic seeds

### 4. Scene Compositions

Build `scenePrimitives.ts` first, then `scenes.ts`.

Initial scene types:

- band stage
- bar
- dance floor
- conversation
- hallway crowd

Each scene must be readable within two seconds.

### 5. Faces And Phrases

Build `faces.ts` and `phrases.ts`.

- conversation scene first
- bartender face second
- face anchors in speakers, graffiti, doors, and smoke after that
- phrases as modular fragments

### 6. Audio Reactivity

Wire theatre features and triggers into each scene type.

- band reacts differently from bar
- conversation focuses on face and phrase timing
- hallway crowd focuses on density and watching pressure

### 7. Phases And Post FX

Build `phases.ts` and `postFx.ts`.

- threshold
- passage
- inhabited
- voidBloom
- palette shifts
- screen punch
- safe reduced-motion variants

### 8. Theatre Preset Registration

Register the scene as an opt-in theatre preset.

- respect reduced motion
- respect low-power policy
- clean `stop()` and `destroy()`
- no running loops after theatre exit
- no input listeners in phase one

## Performance Rules

- One Canvas 2D layer.
- External RAF driving via theatre controller.
- No per-frame allocation in the draw path.
- Pre-generate noise and grime quads at room creation time.
- Cap draw list at a fixed maximum per frame.
- Cull rooms and decals behind the camera immediately.
- Cache stable faces as offscreen bitmaps and recompute only on morph or flicker triggers.
- Smoke and grime quads should alpha-shift, not regenerate every frame.

Low-power mode:

- no face fragmentation
- no heavy smoke
- no strobe
- reduced scene cast density
- corridor and room shell geometry only if needed

Reduced-motion mode:

- no chaos lurch
- no `voidBloom` geometry collapse
- no aggressive strobe
- faces may appear but should not fragment violently

## Success Criteria For Phase One

- The viewer drifts through a sequence of recognizable venue rooms.
- Each room has a distinct cast and mood readable within two seconds.
- The music visibly changes the architecture, lights, figures, and faces.
- Corridors feel like transitions, not the main content.
- Faces appear, watch, and dissolve before the viewer fully catches them.
- Conversation scenes can combine faces and phrases in many variations.
- The scene runs cleanly for ten minutes without memory growth or frame drop.
- `stop()` and `destroy()` leave no running loops or attached listeners.
- A playable layer can be added later without rewriting phase one.
