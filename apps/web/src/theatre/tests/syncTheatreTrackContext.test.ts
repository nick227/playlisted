import { describe, expect, it, vi, beforeEach } from 'vitest'

const { setTrackContext } = vi.hoisted(() => ({
  setTrackContext: vi.fn(),
}))

vi.mock('../controller/lazyController', () => ({
  default: {
    setTrackContext,
  },
}))

import { syncTheatreTrackContext, toTheatreTrackContext } from '../syncTheatreTrackContext'

describe('syncTheatreTrackContext', () => {
  beforeEach(() => {
    setTrackContext.mockReset()
  })

  it('maps recording id to theatre track context', () => {
    expect(toTheatreTrackContext('rec-1')).toEqual({
      segmentId: 'rec-1',
      trackId: 'rec-1',
    })
  })

  it('clears context for empty ids', () => {
    syncTheatreTrackContext(null)
    expect(setTrackContext).toHaveBeenCalledWith(null)
  })

  it('binds context immediately for a recording', () => {
    syncTheatreTrackContext('rec-magic')
    expect(setTrackContext).toHaveBeenCalledWith({
      segmentId: 'rec-magic',
      trackId: 'rec-magic',
    })
  })
})
