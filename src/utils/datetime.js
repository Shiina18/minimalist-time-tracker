/**
 * 时间戳 -> 供 input type="date" 使用的 YYYY-MM-DD
 */
export function toDateInputValue(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 时间戳 -> 供 input type="time" 使用的 HH:mm
 */
export function toTimeInputValue(ts) {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

/**
 * 时间戳 -> 向下取整到分钟（表单 input 的时间精度）
 */
export function floorToMinute(ts) {
  return Math.floor(ts / 60000) * 60000
}

/**
 * date 字符串 (YYYY-MM-DD) + time 字符串 (HH:mm) -> 时间戳
 */
export function fromDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const [h, min] = timeStr.split(':').map(Number)
  const d = new Date(dateStr)
  d.setHours(h, min, 0, 0)
  return d.getTime()
}
