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
    mode: 'background' | 'immersive' | null
    presetId: string | null
    mediaSrc: string | null
    artworkUrl: string | null
  }
  registerPlaybackSource(el: HTMLMediaElement | null, meta?: { artworkUrl?: string | null }): void
  setArtwork(url: string | null): void
  setCanEnter(canEnter: boolean): void
  toggle(): Promise<void>
  enter(): Promise<void>
  enterBackground(): Promise<void>
  exit(): Promise<void>
  changePreset(id: string): Promise<void>
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
    mode:       null as 'background' | 'immersive' | null,
    presetId:   null as string | null,
    mediaSrc:   null as string | null,
    artworkUrl: null as string | null,
  }

  private _real: RealTheatreController | null = null
  private _loadPromise: Promise<RealTheatreController> | null = null

  // Buffered calls replayed when the real controller loads.
  private _pendingSource: { el: HTMLMediaElement | null; meta?: { artworkUrl?: string | null } } | null = null
  private _pendingArtwork: { url: string | null } | null = null

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
        if (this._pendingArtwork !== null) {
          real.setArtwork(this._pendingArtwork.url)
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
    meta?: { artworkUrl?: string | null },
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

  public setCanEnter(canEnter: boolean) {
    if (this._real) {
      this._real.setCanEnter(canEnter)
      return
    }

    if (this.state.canEnter === canEnter) return
    this.state.canEnter = canEnter
    this.dispatchEvent(new Event('change'))
    if (canEnter) {
      void this._load().then(real => {
        if (this.state.canEnter) real.setCanEnter(true)
      })
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

  public async changePreset(id: string) {
    return (await this._load()).changePreset(id)
  }
}

const lazyController = new LazyTheatreController()
export default lazyController
