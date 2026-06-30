# Object Spinner Mover

Composable sticker theatre engine. One canvas scene (`objectSpinnerMover`) driven by `objectTheatre` preset config on each scene preset layer.

## Seed entry shape

```ts
{
  id: 'burger-bounce-carnival',
  label: 'Burger Bounce Carnival',
  config: {
    backgroundPreset: 'checkerboard',
    shapePack: 'fastFood',
    motionPreset: 'bounce',
    beatBehavior: 'spinKick',
    spawnStyle: 'edges',
    palette: 'poster',
    depthBands: 3,
    heroObject: { shape: 'burger', behavior: 'centerWobble', scale: 2.5 },
  },
}
```

Add new FX by appending to `presetEntries.ts` — no engine changes needed.

## v0 composables

| Key | Options |
| --- | --- |
| `shapePack` | fastFood, spooky, party, kitchen, nature, gambling, cosmic, silly, rave, horrorSnack |
| `motionPreset` | float, swarm, orbit, falling, rising, bounce, spiral, tunnel, waveRows, panic |
| `beatBehavior` | scaleOnBeat, spinKick, burstSpawn, backgroundFlash, bassGravity, snareShuffle, dropExplosion, colorFlash, spawnMore |
| `backgroundPreset` | radialGradient, checkerboard, starfield, liquidLava, vhsGrid, comicBurst, spotlightStage, tunnelWarp, paperCollage, neonCity |
| `palette` | candy, toxic, midnight, sunset, monoChrome, acid, pastel, poster, chrome, horror |
| `spawnStyle` | edges, centerBurst, gridFill, randomPop, beatBurst, fountain, rain, orbitRing |
| `depthBands` | 3 (back/mid/front layers) |
| `heroObject` | optional giant centerpiece |

High-motion presets use `osm-calm-float` as `reducedMotionPreset`.

## Reduced motion

`osm-calm-float` is the production-safe fallback: slow float, pastel palette, gentle beat scale.
