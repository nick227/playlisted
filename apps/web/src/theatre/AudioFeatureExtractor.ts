export type BandFeatures = {
  bass: number
  mids: number
  highs: number
}

export type Features = {
  rms: number
  env: number
  bands: BandFeatures
  bandEnv: BandFeatures
  flux: {
    overall: number
    bass: number
    mids: number
    highs: number
  }
  centroid: number
}

export default class AudioFeatureExtractor {
  private analyser: AnalyserNode
  private freq: Uint8Array<ArrayBuffer>
  private time: Uint8Array<ArrayBuffer>
  private lastFreq: Uint8Array<ArrayBuffer>
  private features: Features
  private envSmooth = 0.86
  private bandSmooth = 0.87

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser
    this.freq = new Uint8Array(this.analyser.frequencyBinCount)
    this.time = new Uint8Array(this.analyser.fftSize)
    this.lastFreq = new Uint8Array(this.freq.length)
    this.features = {
      rms: 0,
      env: 0,
      bands: { bass: 0, mids: 0, highs: 0 },
      bandEnv: { bass: 0, mids: 0, highs: 0 },
      flux: { overall: 0, bass: 0, mids: 0, highs: 0 },
      centroid: 0,
    }
  }

  getFeatures(): Features {
    return this.features
  }

  update() {
    this.analyser.getByteFrequencyData(this.freq)
    this.analyser.getByteTimeDomainData(this.time)

    // RMS from time domain
    let sum = 0
    for (let i = 0; i < this.time.length; i++) {
      const v = (this.time[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / Math.max(1, this.time.length))
    this.features.rms = rms
    this.features.env = this.features.env * this.envSmooth + rms * (1 - this.envSmooth)

    // bands, flux and centroid in one pass
    const len = this.freq.length
    const lowEnd = Math.max(1, Math.floor(len * 0.06))
    const midEnd = Math.max(lowEnd + 1, Math.floor(len * 0.25))
    const invLow = 1 / lowEnd
    const invMid = 1 / Math.max(1, midEnd - lowEnd)
    const invHigh = 1 / Math.max(1, len - midEnd)
    const inv255 = 1 / 255

    let lowSum = 0
    let midSum = 0
    let highSum = 0
    let magSum = 0
    let weighted = 0
    let fluxOverall = 0
    let fluxLow = 0
    let fluxMid = 0
    let fluxHigh = 0

    for (let i = 0; i < len; i++) {
      const v = this.freq[i]
      const diff = v - this.lastFreq[i]
      const posDiff = diff > 0 ? diff : 0

      magSum += v
      weighted += i * v
      fluxOverall += posDiff

      if (i < lowEnd) {
        lowSum += v
        fluxLow += posDiff
      } else if (i < midEnd) {
        midSum += v
        fluxMid += posDiff
      } else {
        highSum += v
        fluxHigh += posDiff
      }

      this.lastFreq[i] = v
    }

    const bass = lowSum * invLow * inv255
    const mids = midSum * invMid * inv255
    const highs = highSum * invHigh * inv255

    this.features.bands.bass = bass
    this.features.bands.mids = mids
    this.features.bands.highs = highs

    this.features.bandEnv.bass = this.features.bandEnv.bass * this.bandSmooth + bass * (1 - this.bandSmooth)
    this.features.bandEnv.mids = this.features.bandEnv.mids * this.bandSmooth + mids * (1 - this.bandSmooth)
    this.features.bandEnv.highs = this.features.bandEnv.highs * this.bandSmooth + highs * (1 - this.bandSmooth)

    this.features.flux.overall = fluxOverall * inv255 / len
    this.features.flux.bass = fluxLow * inv255 * invLow
    this.features.flux.mids = fluxMid * inv255 * invMid
    this.features.flux.highs = fluxHigh * inv255 * invHigh
    this.features.centroid = magSum > 0 ? (weighted / magSum) / len : 0
  }
}
