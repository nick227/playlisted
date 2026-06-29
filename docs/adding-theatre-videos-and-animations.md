# Adding Videos and Animations to Theatre FX

This guide explains how developers can add new videos or canvas animations to the Playlisted Theatre system. The Theatre system is a layered, audio-reactive visual engine that runs behind or around the music player.

## 1. Adding a New Video (The Simple Way)

You do **not** need to create a new class or write any boilerplate to add a video! 
The Theatre system provides a built-in `VideoAnimation` base class and a `createVideoPackage` helper that does all the heavy lifting. Videos can be hosted locally (e.g. in the `public` folder) or remotely via a URL.

### Step 1: Open the Registry
Open the theatre registry file: `apps/web/src/theatre/registry/seed.ts`.

### Step 2: Register the Video Package
Add a new `createVideoPackage(...)` call to the package registration list at the bottom of the file.

```ts
import { createVideoPackage } from '../packages/createVideoPackage'

// Inside the array of registerAnimationPackage calls...
[
  // ... other packages ...

  // Example: Adding a local video from the public folder
  createVideoPackage({
    id: 'myLocalVideo',
    label: 'My Cool Local Video',
    videoUrl: '/videos/my-cool-video.mp4',
    category: 'production', 
    weight: 5,
  }),

  // Example: Adding a remote video
  createVideoPackage({
    id: 'myRemoteVideo',
    label: 'Remote Abstract Loop',
    videoUrl: 'https://example.com/videos/abstract-loop.mp4',
    category: 'production',
  }),

].forEach(registerAnimationPackage)
```

**That's it!** The `createVideoPackage` helper automatically creates the `VideoAnimation` layer, registers it, and sets up a Theatre Scene Preset for you. It handles everything including autoplay, looping, and pausing when Theatre mode closes.

---

## 2. Adding a Canvas Animation

For generative or particle-based visuals, extend the base `CanvasAnimation` class. This provides built-in resizing, high-DPI canvas support, and a `draw()` method driven by the central game loop.

Create `apps/web/src/theatre/animations/myCanvasEffect.ts`:

```ts
import { CanvasAnimation } from '../core/CanvasAnimation';
import type { AnimationContext } from '../core/IAnimation';

class MyCanvasEffect extends CanvasAnimation {
  constructor() {
    // Enable micro-effects (like screen shake) and set default z-index
    super({ useEffects: true, defaultZIndex: 100 });
  }

  protected draw(context: AnimationContext) {
    const t = context.shared?.time?.elapsed ?? performance.now();
    
    // Access audio features (bass, mids, highs)
    const bands = this.readBands(context);
    
    // Clear previous frame
    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    // Draw something reactive (e.g., a circle that pulses with the bass)
    const centerX = this.cssWidth / 2;
    const centerY = this.cssHeight / 2;
    const radius = 50 + (bands.bass * 100);

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `hsl(${(t * 0.05) % 360}, 80%, 50%)`;
    this.ctx.fill();

    // Render micro-effects (if any were triggered)
    this.effects?.update(this.ctx, t, this.pixelRatio);
  }
}

export default function myCanvasEffectFactory(ctx: AnimationContext) {
  return new MyCanvasEffect();
}
```

Once created, register it in `apps/web/src/theatre/registry/seed.ts` via the `registry.register(...)` and `registerPreset(...)` functions.
