/**
 * 按自然日聚合 session 时长。
 * @param {Array<{ startAt: number, endAt: number | null }>} sessions
 * @param {number} rangeStart - 范围开始时间戳（含）
 * @param {number} rangeEnd - 范围结束时间戳（含）
 * @param {number} now - 当前时间戳（进行中 session 的结束端用此值）
 * @returns {{ [key: string]: number }} key 为 'YYYY-MM-DD'，值为该日时长毫秒
 */
export function aggregateMsByDay(sessions, rangeStart, rangeEnd, now) {
  const out = Object.create(null)
  const startD = new Date(rangeStart)
  const endD = new Date(rangeEnd)
  const dayMs = 24 * 60 * 60 * 1000
  for (
    let d = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
    d.getTime() <= endD.getTime();
    d.setDate(d.getDate() + 1)
  ) {
    const dayStart = d.getTime()
    const dayEnd = dayStart + dayMs - 1
    const key = formatDateKey(dayStart)
    let ms = 0
    for (const s of sessions) {
      const segEnd = s.endAt != null ? s.endAt : now
      const start = Math.max(s.startAt, dayStart)
      const end = Math.min(segEnd, dayEnd)
      if (end > start) ms += end - start
    }
    out[key] = ms
  }
  return out
}

/**
 * Session 总时长 = 该 session 下所有 segment 时长之和；endAt==null 的段用 now 作为结束。
 * @param {{ startAt: number, endAt: number | null }} session
 * @param {Array<{ startAt: number, endAt: number | null }>} segments
 * @param {number} now
 * @returns {number} 毫秒
 */
export function computeSessionDurationMs(session, segments, now) {
  let ms = 0
  for (const seg of segments) {
    const end = seg.endAt != null ? seg.endAt : now
    if (end > seg.startAt) ms += end - seg.startAt
  }
  return ms
}

/**
 * 按自然日聚合时长，基于 segments（总时长 = segment 总和）。
 * @param {Array<{ id: string, startAt: number, endAt: number | null }>} sessions
 * @param {Map<string, Array<{ startAt: number, endAt: number | null }>>} sessionSegmentsMap - sessionId -> segments
 * @param {number} rangeStart
 * @param {number} rangeEnd
 * @param {number} now
 * @returns {{ [key: string]: number }}
 */
export function aggregateMsByDayFromSegments(sessions, sessionSegmentsMap, rangeStart, rangeEnd, now) {
  const out = Object.create(null)
  const startD = new Date(rangeStart)
  const endD = new Date(rangeEnd)
  const dayMs = 24 * 60 * 60 * 1000
  for (
    let d = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
    d.getTime() <= endD.getTime();
    d.setDate(d.getDate() + 1)
  ) {
    const dayStart = d.getTime()
    const dayEnd = dayStart + dayMs - 1
    const key = formatDateKey(dayStart)
    let ms = 0
    for (const s of sessions) {
      const segments = sessionSegmentsMap.get(s.id) ?? []
      for (const seg of segments) {
        const segEnd = seg.endAt != null ? seg.endAt : now
        const start = Math.max(seg.startAt, dayStart)
        const end = Math.min(segEnd, dayEnd)
        if (end > start) ms += end - start
      }
    }
    out[key] = ms
  }
  return out
}

function formatDateKey(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 当月 1 号 0 点到当月最后一天 23:59:59 的时间范围。
 */
export function getMonthBounds(year, month) {
  const start = new Date(year, month, 1).getTime()
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
  return { start, end }
}

/**
 * 当年 1 月 1 日 0 点到 endDay 23:59:59。endDay 为 Date 或时间戳，通常为「今天」。
 */
export function getYearBounds(year, endDay) {
  const start = new Date(year, 0, 1).getTime()
  const d = endDay instanceof Date ? endDay : new Date(endDay)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime()
  return { start, end }
}

/**
 * 最近 7 天：从「今天-6」0:00 到「今天」23:59:59。
 */
export function getLast7DaysBounds() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 0, 0, 0, 0).getTime()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime()
  return { start, end }
}

/**
 * 自定义日期区间。dateStartStr/dateEndStr 为 'YYYY-MM-DD'；start 当日 0:00，end 当日 23:59:59。
 */
export function getRangeBounds(dateStartStr, dateEndStr) {
  const [y1, m1, d1] = dateStartStr.split('-').map(Number)
  const [y2, m2, d2] = dateEndStr.split('-').map(Number)
  const start = new Date(y1, m1 - 1, d1, 0, 0, 0, 0).getTime()
  const end = new Date(y2, m2 - 1, d2, 23, 59, 59, 999).getTime()
  return { start, end }
}
