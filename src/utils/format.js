export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 短格式：用于列表/统计。数字与单位间用细空格，如 "11 m"、"1.6 h"。
 * - 小于 1 分钟显示 0
 * - 1 分钟以上不足 1 小时显示 X m
 * - 1 小时及以上显示小数点小时，如 1.6 h
 */
export function formatDurationShort(ms) {
  if (ms < 60000) return '0'
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}\u2009m`
  const h = ms / 3600000
  return `${h.toFixed(1)}\u2009h`
}

/** 仅分钟数（四舍五入），用于柱状图等节约空间，不写单位，统一视为 min */
export function formatDurationMinutes(ms) {
  return Math.round(ms / 60000)
}

/** 日期 YYYY-MM-DD */
export function formatDate(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 日期时间 YYYY-MM-DD HH:MM */
export function formatDateTime(ts) {
  const d = new Date(ts)
  const date = formatDate(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${date} ${h}:${min}`
}
