import { floorToMinute } from './datetime.js'

/**
 * 校验并规整「编辑/添加时间段」表单的保存值。
 *
 * 表单里的时间只有分钟精度，而计时器写入的时间戳带秒/毫秒。因此：
 * - 表单时间等于原值的分钟截断时视为「未改动」，保留原始时间戳，
 *   避免只改项目时静默截断时段；
 * - 开始时间与记录开始比较时按分钟对齐（界面显示的就是分钟），
 *   避免截断后的开始时间被误判为早于记录开始。
 *
 * @param {{
 *   formStartAt: number | null,
 *   formEndAt: number | null,
 *   session: { startAt: number, endAt: number | null },
 *   originalSegment?: { startAt: number, endAt: number | null } | null,
 *   otherSegments?: Array<{ startAt: number, endAt: number | null }>,
 * }} params
 * @returns {{ error: string | null, startAt: number | null, endAt: number | null }}
 *   error 为 null 且 startAt 非 null 时可保存；startAt 为 null 表示表单时间不完整。
 */
export function validateSegmentForm({
  formStartAt,
  formEndAt,
  session,
  originalSegment = null,
  otherSegments = [],
}) {
  if (formStartAt == null) return { error: null, startAt: null, endAt: null }
  let startAt = formStartAt
  let endAt = formEndAt ?? formStartAt
  if (originalSegment) {
    if (startAt === floorToMinute(originalSegment.startAt)) startAt = originalSegment.startAt
    if (originalSegment.endAt != null && endAt === floorToMinute(originalSegment.endAt)) {
      endAt = originalSegment.endAt
    }
  }
  if (endAt <= startAt) {
    return { error: '结束须晚于开始', startAt, endAt }
  }
  const rangeEnd = session.endAt ?? Infinity
  if (startAt < floorToMinute(session.startAt) || endAt > rangeEnd) {
    return { error: '须在记录时间范围内', startAt, endAt }
  }
  for (const seg of otherSegments) {
    const otherEnd = seg.endAt != null ? seg.endAt : rangeEnd
    if (startAt < otherEnd && seg.startAt < endAt) {
      return { error: '与同条记录内其他段重叠', startAt, endAt }
    }
  }
  return { error: null, startAt, endAt }
}
