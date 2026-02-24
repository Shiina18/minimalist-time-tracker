/**
 * 计算本次已计时长（毫秒）。
 * @param {Array<{ id: string, startAt: number, endAt: number | null }>} segments - 当前 session 的 segments，按 startAt 顺序
 * @param {number | null} pausedAt - 暂停时刻戳，null 表示未暂停
 * @param {number} now - 当前时刻戳
 * @returns {number} 总毫秒数
 */
export function computeElapsedMs(segments, pausedAt, now) {
  const effectiveNow = pausedAt ?? now
  const current = segments.find((s) => s.endAt == null)
  let total = 0
  for (const s of segments) {
    const end = s.endAt ?? (current?.id === s.id ? effectiveNow : s.startAt)
    total += end - s.startAt
  }
  return total
}
