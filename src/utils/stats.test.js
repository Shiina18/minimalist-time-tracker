import { describe, it, expect } from 'vitest'
import {
  computeSessionDurationMs,
  aggregateMsByDayFromSegments,
  getMonthBounds,
  getRangeBounds,
} from './stats.js'

const base = 1000000000000 // 某日 0 点附近

describe('computeSessionDurationMs', () => {
  it('无 segment 时返回 0', () => {
    const session = { id: 's1', startAt: base, endAt: base + 3600000 }
    expect(computeSessionDurationMs(session, [], base + 7200000)).toBe(0)
  })

  it('单段已结束：时长为 endAt - startAt', () => {
    const session = { id: 's1', startAt: base, endAt: base + 3600000 }
    const segments = [{ startAt: base, endAt: base + 60000 }]
    expect(computeSessionDurationMs(session, segments, base + 7200000)).toBe(60000)
  })

  it('单段进行中：endAt 为 null 时用 now', () => {
    const session = { id: 's1', startAt: base, endAt: null }
    const segments = [{ startAt: base, endAt: null }]
    expect(computeSessionDurationMs(session, segments, base + 65000)).toBe(65000)
  })

  it('多段：已结束段用 endAt，进行中段用 now', () => {
    const session = { id: 's1', startAt: base, endAt: base + 120000 }
    const segments = [
      { startAt: base, endAt: base + 60000 },
      { startAt: base + 60000, endAt: null },
    ]
    const now = base + 60000 + 45000
    expect(computeSessionDurationMs(session, segments, now)).toBe(60000 + 45000)
  })

  it('删掉一个 segment 后总时长减少', () => {
    const session = { id: 's1', startAt: base, endAt: base + 180000 }
    const allSegments = [
      { startAt: base, endAt: base + 60000 },
      { startAt: base + 60000, endAt: base + 120000 },
      { startAt: base + 120000, endAt: base + 180000 },
    ]
    const withoutMiddle = [
      { startAt: base, endAt: base + 60000 },
      { startAt: base + 120000, endAt: base + 180000 },
    ]
    expect(computeSessionDurationMs(session, allSegments, base + 180000)).toBe(180000)
    expect(computeSessionDurationMs(session, withoutMiddle, base + 180000)).toBe(120000)
  })
})

describe('aggregateMsByDayFromSegments', () => {
  function dayStart(y, m, d) {
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
  }

  function dayEnd(y, m, d) {
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
  }

  it('单 session 单 segment 完全在某日内', () => {
    const y = 2025
    const m = 6
    const d = 15
    const sessions = [{ id: 's1', startAt: dayStart(y, m, d) + 3600000, endAt: dayStart(y, m, d) + 7200000 }]
    const map = new Map()
    map.set('s1', [
      { startAt: dayStart(y, m, d) + 3600000, endAt: dayStart(y, m, d) + 7200000 },
    ])
    const rangeStart = dayStart(y, m, d)
    const rangeEnd = dayEnd(y, m, d)
    const result = aggregateMsByDayFromSegments(sessions, map, rangeStart, rangeEnd, rangeEnd)
    expect(result['2025-06-15']).toBe(3600000)
  })

  it('segment 跨日：时长按自然日拆分', () => {
    const y = 2025
    const m = 6
    const d = 15
    const segStart = dayStart(y, m, d) + 22 * 3600000 // 22:00 当日
    const segEnd = dayStart(y, m, d + 1) + 2 * 3600000 // 02:00 次日
    const sessions = [{ id: 's1', startAt: segStart, endAt: segEnd }]
    const map = new Map()
    map.set('s1', [{ startAt: segStart, endAt: segEnd }])
    const rangeStart = dayStart(y, m, d)
    const rangeEnd = dayEnd(y, m, d + 1)
    const result = aggregateMsByDayFromSegments(sessions, map, rangeStart, rangeEnd, rangeEnd)
    // 当日 22:00～24:00 即 22:00～23:59:59.999 = 7199999ms
    expect(result['2025-06-15']).toBe(7199999)
    expect(result['2025-06-16']).toBe(2 * 3600000)
  })

  it('多 segment 同一天：时长为各 segment 之和', () => {
    const y = 2025
    const m = 6
    const d = 15
    const dayS = dayStart(y, m, d)
    const sessions = [{ id: 's1', startAt: dayS, endAt: dayEnd(y, m, d) }]
    const map = new Map()
    map.set('s1', [
      { startAt: dayS + 0, endAt: dayS + 3600000 },
      { startAt: dayS + 7200000, endAt: dayS + 10800000 },
    ])
    const rangeStart = dayStart(y, m, d)
    const rangeEnd = dayEnd(y, m, d)
    const result = aggregateMsByDayFromSegments(sessions, map, rangeStart, rangeEnd, rangeEnd)
    expect(result['2025-06-15']).toBe(3600000 + 3600000)
  })

  it('session 无 segment 时该 session 不贡献时长', () => {
    const y = 2025
    const m = 6
    const d = 15
    const sessions = [
      { id: 's1', startAt: dayStart(y, m, d), endAt: dayEnd(y, m, d) },
      { id: 's2', startAt: dayStart(y, m, d), endAt: dayEnd(y, m, d) },
    ]
    const map = new Map()
    map.set('s1', [{ startAt: dayStart(y, m, d) + 3600000, endAt: dayStart(y, m, d) + 7200000 }])
    map.set('s2', [])
    const rangeStart = dayStart(y, m, d)
    const rangeEnd = dayEnd(y, m, d)
    const result = aggregateMsByDayFromSegments(sessions, map, rangeStart, rangeEnd, rangeEnd)
    expect(result['2025-06-15']).toBe(3600000)
  })
})

describe('getMonthBounds / getRangeBounds', () => {
  it('getMonthBounds 返回当月首尾', () => {
    const { start, end } = getMonthBounds(2025, 5)
    expect(new Date(start).getMonth()).toBe(5)
    expect(new Date(start).getDate()).toBe(1)
    expect(new Date(end).getMonth()).toBe(5)
    expect(new Date(end).getDate()).toBe(30)
  })

  it('getRangeBounds 按 YYYY-MM-DD 解析', () => {
    const { start, end } = getRangeBounds('2025-06-15', '2025-06-17')
    const startD = new Date(start)
    const endD = new Date(end)
    expect(startD.getFullYear()).toBe(2025)
    expect(startD.getMonth()).toBe(5)
    expect(startD.getDate()).toBe(15)
    expect(endD.getFullYear()).toBe(2025)
    expect(endD.getMonth()).toBe(5)
    expect(endD.getDate()).toBe(17)
  })
})
