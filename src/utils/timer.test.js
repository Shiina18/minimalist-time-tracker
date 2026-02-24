import { describe, it, expect } from 'vitest'
import { computeElapsedMs } from './timer.js'

describe('computeElapsedMs', () => {
  const base = 1000000000000

  it('无 segment 时返回 0', () => {
    expect(computeElapsedMs([], null, base)).toBe(0)
  })

  it('单段已结束：时长为 endAt - startAt', () => {
    const segments = [
      { id: 'a', startAt: base, endAt: base + 60000 },
    ]
    expect(computeElapsedMs(segments, null, base + 120000)).toBe(60000)
  })

  it('单段进行中、未暂停：时长为 now - startAt', () => {
    const segments = [
      { id: 'a', startAt: base, endAt: null },
    ]
    expect(computeElapsedMs(segments, null, base + 65000)).toBe(65000)
  })

  it('单段进行中、已暂停：时长为 pausedAt - startAt，与 now 无关', () => {
    const segments = [
      { id: 'a', startAt: base, endAt: null },
    ]
    const pausedAt = base + 30000
    expect(computeElapsedMs(segments, pausedAt, base + 100000)).toBe(30000)
  })

  it('多段：已结束段用 endAt，当前段用 effectiveNow', () => {
    const segments = [
      { id: 'a', startAt: base, endAt: base + 60000 },
      { id: 'b', startAt: base + 60000, endAt: null },
    ]
    expect(computeElapsedMs(segments, null, base + 60000 + 45000)).toBe(60000 + 45000)
  })

  it('多段且暂停：当前段只计到 pausedAt', () => {
    const segments = [
      { id: 'a', startAt: base, endAt: base + 60000 },
      { id: 'b', startAt: base + 60000, endAt: null },
    ]
    const pausedAt = base + 60000 + 20000
    expect(computeElapsedMs(segments, pausedAt, base + 60000 + 90000)).toBe(60000 + 20000)
  })

  it('仅当前段无 endAt 时视为进行中段', () => {
    const segments = [
      { id: 'a', startAt: base, endAt: base + 10000 },
      { id: 'b', startAt: base + 10000, endAt: base + 20000 },
      { id: 'c', startAt: base + 20000, endAt: null },
    ]
    expect(computeElapsedMs(segments, null, base + 25000)).toBe(25000)
  })
})
