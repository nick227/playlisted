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
    presetId: string | null
    mediaSrc: string | null
    artworkUrl: string | null
  }
  registerPlaybackSource(el: HTMLMediaElement | null, meta?: { artworkUrl?: string | null }): void
  setArtwork(url: string | null): void
  toggle(): Promise<void>
  enter(): Promise<void>
  exit(): Promise<void>
  changePreset(id: string): Promise<void>
}

class LazyTheatreController extends EventTarget {
  // Mirrors the real controller's state shape; safe defaults before load.
  public state = {
    active:    false,
    canEnter:  false,
    presetId:  null as string | null,
    mediaSrc:  null as string | null,
    artworkUrl: null as string | null,
  }

  private _real: RealTheatreController | null = null
  private _loadPromise: Promise<RealTheatreController> | null = null

  // Last buffered calls — replayed when the real controller loads.
  private _pendingSource: { el: HTMLMediaElement | null; meta?: { artworkUrl?: string | null } } | null = null
  private _pendingArtwork: { url: string | null } | null = null

  // Lightweight audio-element tracking so canEnter works before load.
  private _trackedEl: HTMLMediaElement | null = null
  private _onAudioChange = () => {
    const el = this._trackedEl
    const playing = !!el && !el.paused
    if (playing !== this.state.canEnter || (el?.currentSrc ?? null) !== this.state.mediaSrc) {
      this.state.canEnter = playing
      this.state.mediaSrc = el?.currentSrc || null
      this.dispatchEvent(new Event('change'))
    }
  }

  private _trackElement(el: HTMLMediaElement | null) {
    if (el === this._trackedEl) return
    if (this._trackedEl) {
      this._trackedEl.removeEventListener('play',    this._onAudioChange)
      this._trackedEl.removeEventListener('pause',   this._onAudioChange)
      this._trackedEl.removeEventListener('emptied', this._onAudioChange)
    }
    this._trackedEl = el
    if (el) {
      el.addEventListener('play',    this._onAudioChange)
      el.addEventListener('pause',   this._onAudioChange)
      el.addEventListener('emptied', this._onAudioChange)
      this._onAudioChange()
    } else {
      this.state.canEnter = false
      this.state.mediaSrc = null
      this.dispatchEvent(new Event('change'))
    }
  }

  // ── Private load ─────────────────────────────────────────────────────────────

  private async _load(): Promise<RealTheatreController> {
    if (this._real) return this._real
    if (!this._loadPromise) {
      this._loadPromise = import('./TheatreController').then(mod => {
        const real = mod.default as unknown as RealTheatreController
        this._real = real

        // Replay buffered side-effects before handing control over.
        if (this._pendingSource !== null) {
          real.registerPlaybackSource(this._pendingSource.el, this._pendingSource.meta)
        }
        if (this._pendingArtwork !== null) {
          real.setArtwork(this._pendingArtwork.url)
        }

        // Replace our stub state with the real state object so reads on
        // `theatreController.state.X` automatically reflect real state.
        this.state = real.state

        // Forward every event from the real controller through this façade.
        // All handlers were registered on the façade via super.addEventListener
        // so this.dispatchEvent reaches them without double-registration.
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
      })
    }
    return this._loadPromise
  }

  // ── Lightweight methods (no load required) ────────────────────────────────

  public registerPlaybackSource(
    el: HTMLMediaElement | null,
    meta?: { artworkUrl?: string | null },
  ) {
    if (meta?.artworkUrl !== undefined) {
      this.state.artworkUrl = meta.artworkUrl
    }
    this._pendingSource = { el, meta }
    this._trackElement(el)
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

  public async exit() {
    // exit() is only meaningful if theatre is open, which requires load.
    return this._real?.exit()
  }

  // ── Heavy methods — trigger load ──────────────────────────────────────────

  public async toggle() {
    return (await this._load()).toggle()
  }

  public async enter() {
    return (await this._load()).enter()
  }

  public async changePreset(id: string) {
    return (await this._load()).changePreset(id)
  }
}

const lazyController = new LazyTheatreController()
export default lazyController
