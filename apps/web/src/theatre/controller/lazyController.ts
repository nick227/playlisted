/**
 * Lazy façade for TheatreController.
 *
 * The real controller (and every animation factory, the liminalDoom bundle,
 * the registry — all of it) is deferred until the user actually opens theatre.
 * 99% of users never do, so this keeps ~200 KB out of the initial chunk.
 *
 * Public surface matches TheatreController exactly so call-sites need only
 * change their import path.
 */

interface RealTheatreController extends EventTarget {
  state: {
    active: boolean
    canEnter: boolean
    fxEnabled: boolean
    mode: 'background' | 'immersive' | null
    presetId: string | null
    mediaSrc: string | null
    artworkUrl: string | null
  }
  registerPlaybackSource(el: HTMLMediaElement | null, meta?: { artworkUrl?: string | null; recordingId?: string | null }): void
  setArtwork(url: string | null): void
  setCanEnter(canEnter: boolean): void
  setFxEnabled(enabled: boolean): void | Promise<void>
  toggle(): Promise<void>
  enter(): Promise<void>
  enterBackground(): Promise<void>
  exit(opts?: { rearmBackground?: boolean }): Promise<void>
  changePreset(id: string): void
  rotateRandomPreset(): Promise<void>
  onPlaybackSegmentChanged(): Promise<void>
  setAutoRotation(enabled: boolean): void
  setClipDuration(durationMs: number | null): void
  setTrackContext(track: { segmentId?: string | null; trackId?: string | null } | null): void
}

const THEATRE_RELOAD_KEY = 'playlisted:theatre:chunk-reload-attempted'

function isDynamicImportFailure(error: unknown) {
  if (!(error instanceof Error)) return false
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    error.message,
  )
}

function reloadForFreshTheatreChunk(error: unknown): Promise<never> {
  if (
    typeof window !== 'undefined' &&
    isDynamicImportFailure(error) &&
    window.sessionStorage.getItem(THEATRE_RELOAD_KEY) !== '1'
  ) {
    window.sessionStorage.setItem(THEATRE_RELOAD_KEY, '1')
    window.location.reload()
    return new Promise(() => {
      // Keep the current promise pending while the browser navigates.
    })
  }

  throw error
}

class LazyTheatreController extends EventTarget {
  // Mirrors the real controller's state shape; safe defaults before load.
  public state = {
    active:     false,
    canEnter:   false,
    fxEnabled:  true,
    mode:       null as 'background' | 'immersive' | null,
    presetId:   null as string | null,
    mediaSrc:   null as string | null,
    artworkUrl: null as string | null,
  }

  private _real: RealTheatreController | null = null
  private _loadPromise: Promise<RealTheatreController> | null = null

  // Buffered calls replayed when the real controller loads.
  private _pendingSource: { el: HTMLMediaElement | null; meta?: { artworkUrl?: string | null } } | null = null
  private _pendingClipDuration: number | null = null
  private _pendingTrackContext: { segmentId?: string | null; trackId?: string | null } | null | undefined = undefined
  private _pendingArtwork: { url: string | null } | null = null
  private _pendingAutoRotate: boolean = false
  private _pendingFxEnabled: boolean | null = null

  // ── Private load ──────────────────────────────────────────────────────────

  private async _load(): Promise<RealTheatreController> {
    if (this._real) return this._real
    if (!this._loadPromise) {
      this._loadPromise = import('./TheatreController').then(mod => {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(THEATRE_RELOAD_KEY)
        }

        const real = mod.default as unknown as RealTheatreController
        this._real = real

        // Replay buffered side-effects before handing control over.
        if (this._pendingSource !== null) {
          real.registerPlaybackSource(this._pendingSource.el, this._pendingSource.meta)
        }
        if (this._pendingClipDuration !== null) {
          real.setClipDuration(this._pendingClipDuration)
        }
        if (this._pendingTrackContext !== undefined) {
          real.setTrackContext(this._pendingTrackContext)
        }
        if (this._pendingArtwork !== null) {
          real.setArtwork(this._pendingArtwork.url)
        }
        real.setAutoRotation(this._pendingAutoRotate)
        if (this._pendingFxEnabled !== null) {
          real.setFxEnabled(this._pendingFxEnabled)
        }
        
        // Push current canEnter so the real controller starts in sync.
        real.setCanEnter(this.state.canEnter)

        // Replace our stub state with the real state object so reads on
        // `theatreController.state.X` automatically reflect real state.
        this.state = real.state

        // Forward every event from the real controller through this façade.
        real.addEventListener('change', () => {
          this.state = real.state
          this.dispatchEvent(new Event('change'))
        })
        real.addEventListener('enter', () => {
          this.state = real.state
          this.dispatchEvent(new Event('enter'))
        })
        real.addEventListener('exit', () => {
          this.state = real.state
          this.dispatchEvent(new Event('exit'))
        })

        return real
      }).catch(reloadForFreshTheatreChunk)
    }
    return this._loadPromise
  }

  // ── Lightweight methods (no load required) ────────────────────────────────

  public registerPlaybackSource(
    el: HTMLMediaElement | null,
    meta?: { artworkUrl?: string | null; recordingId?: string | null },
  ) {
    if (el === null) {
      this.state.artworkUrl = null
    } else if (meta?.artworkUrl !== undefined) {
      this.state.artworkUrl = meta.artworkUrl
    }
    this._pendingSource = { el, meta }
    this._real?.registerPlaybackSource(el, meta)
  }

  public setArtwork(url: string | null) {
    this._pendingArtwork = { url }
    this.state.artworkUrl = url
    if (this._real) {
      this._real.setArtwork(url)
    } else {
      this.dispatchEvent(new Event('change'))
    }
  }

  public setAutoRotation(enabled: boolean) {
    this._pendingAutoRotate = enabled
    if (this._real) {
      this._real.setAutoRotation(enabled)
    }
  }

  public setClipDuration(durationMs: number | null) {
    this._pendingClipDuration = durationMs
    if (this._real) {
      this._real.setClipDuration(durationMs)
    }
  }

  public setTrackContext(track: { segmentId?: string | null; trackId?: string | null } | null) {
    this._pendingTrackContext = track
    if (this._real) {
      this._real.setTrackContext(track)
      return
    }

    if (track) {
      void this._load().then(real => {
        if (this._pendingTrackContext !== undefined) {
          real.setTrackContext(this._pendingTrackContext)
        }
      })
    }
  }

  public setCanEnter(canEnter: boolean) {
    if (this._real) {
      this._real.setCanEnter(canEnter)
      return
    }

    if (this.state.canEnter === canEnter) return
    this.state.canEnter = canEnter
    this.dispatchEvent(new Event('change'))
    if (canEnter && this.state.fxEnabled) {
      void this._load().then(real => {
        if (this._pendingTrackContext !== undefined) {
          real.setTrackContext(this._pendingTrackContext)
        }
        if (this.state.canEnter) real.setCanEnter(true)
      })
    }
  }

  public async setFxEnabled(enabled: boolean) {
    this._pendingFxEnabled = enabled

    if (this._real) {
      this._real.setFxEnabled(enabled)
      return
    }

    this.state.fxEnabled = enabled
    this.dispatchEvent(new Event('change'))

    if (!enabled) return

    if (this.state.canEnter) {
      const real = await this._load()
      real.setFxEnabled(enabled)
    }
  }

  public async exit() {
    if (this._real) return this._real.exit()
    if (this._loadPromise) return (await this._load()).exit()
  }

  // ── Heavy methods — trigger load ──────────────────────────────────────────

  public async toggle() {
    return (await this._load()).toggle()
  }

  public async enter() {
    return (await this._load()).enter()
  }

  public async enterBackground() {
    return (await this._load()).enterBackground()
  }

  public changePreset(id: string) {
    void this._load().then(real => real.changePreset(id))
  }

  public async rotateRandomPreset() {
    if (this._real) return this._real.rotateRandomPreset()
    if (!this.state.active) return
    return (await this._load()).rotateRandomPreset()
  }

  public async onPlaybackSegmentChanged() {
    if (this._real) return this._real.onPlaybackSegmentChanged()
    return (await this._load()).onPlaybackSegmentChanged()
  }
}

const lazyController = new LazyTheatreController()
export default lazyController
