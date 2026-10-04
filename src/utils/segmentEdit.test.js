import { describe, it, expect } from 'vitest'
import { validateSegmentForm } from './segmentEdit.js'
import { toDateInputValue, toTimeInputValue, fromDateAndTime } from './datetime.js'

// 计时器写入的时间戳带秒/毫秒
const sessionStartAt = new Date(2026, 9, 4, 9, 14, 23, 456).getTime()
const sessionEndAt = new Date(2026, 9, 4, 11, 2, 37, 891).getTime()
const session = { startAt: sessionStartAt, endAt: sessionEndAt }

// 模拟表单 round-trip：时间戳 -> input 显示（HH:mm）-> 解析回分钟精度
function formTimes(ts) {
  return fromDateAndTime(toDateInputValue(ts), toTimeInputValue(ts))
}

describe('validateSegmentForm', () => {
  it('仅改项目（时间未动）：通过并保留原始时间戳', () => {
    const seg = { startAt: sessionStartAt, endAt: sessionEndAt }
    const result = validateSegmentForm({
      formStartAt: formTimes(seg.startAt),
      formEndAt: formTimes(seg.endAt),
      session,
      originalSegment: seg,
      otherSegments: [],
    })
    expect(result.error).toBeNull()
    expect(result.startAt).toBe(sessionStartAt)
    expect(result.endAt).toBe(sessionEndAt)
  })

  it('多段计时，后一段仅改项目：不误报重叠，保留原始边界', () => {
    const splitAt = new Date(2026, 9, 4, 10, 0, 30, 123).getTime()
    const segA = { startAt: sessionStartAt, endAt: splitAt }
    const segB = { startAt: splitAt, endAt: sessionEndAt }
    const result = validateSegmentForm({
      formStartAt: formTimes(segB.startAt),
      formEndAt: formTimes(segB.endAt),
      session,
      originalSegment: segB,
      otherSegments: [segA],
    })
    expect(result.error).toBeNull()
    expect(result.startAt).toBe(splitAt)
    expect(result.endAt).toBe(sessionEndAt)
  })

  it('用户显式改动开始时间：按表单的分钟值保存，未动的结束保留原值', () => {
    const seg = { startAt: sessionStartAt, endAt: sessionEndAt }
    const newStart = fromDateAndTime('2026-10-04', '09:30')
    const result = validateSegmentForm({
      formStartAt: newStart,
      formEndAt: formTimes(seg.endAt),
      session,
      originalSegment: seg,
      otherSegments: [],
    })
    expect(result.error).toBeNull()
    expect(result.startAt).toBe(newStart)
    expect(result.endAt).toBe(sessionEndAt)
  })

  it('开始时间等于记录开始显示的分钟（真实开始带秒）：接受', () => {
    const seg = { startAt: sessionStartAt, endAt: sessionEndAt }
    const result = validateSegmentForm({
      formStartAt: fromDateAndTime('2026-10-04', '09:14'),
      formEndAt: formTimes(seg.endAt),
      session,
      originalSegment: seg,
      otherSegments: [],
    })
    expect(result.error).toBeNull()
  })

  it('开始时间早于记录开始：拒绝', () => {
    const seg = { startAt: sessionStartAt, endAt: sessionEndAt }
    const result = validateSegmentForm({
      formStartAt: fromDateAndTime('2026-10-04', '09:13'),
      formEndAt: formTimes(seg.endAt),
      session,
      originalSegment: seg,
      otherSegments: [],
    })
    expect(result.error).toBe('须在记录时间范围内')
  })

  it('结束时间晚于记录结束：拒绝', () => {
    const seg = { startAt: sessionStartAt, endAt: sessionEndAt }
    const result = validateSegmentForm({
      formStartAt: formTimes(seg.startAt),
      formEndAt: fromDateAndTime('2026-10-04', '11:03'),
      session,
      originalSegment: seg,
      otherSegments: [],
    })
    expect(result.error).toBe('须在记录时间范围内')
  })

  it('结束早于开始：拒绝', () => {
    const seg = { startAt: sessionStartAt, endAt: sessionEndAt }
    const result = validateSegmentForm({
      formStartAt: fromDateAndTime('2026-10-04', '10:30'),
      formEndAt: fromDateAndTime('2026-10-04', '10:00'),
      session,
      originalSegment: seg,
      otherSegments: [],
    })
    expect(result.error).toBe('结束须晚于开始')
  })

  it('与其他段真实重叠：拒绝', () => {
    const splitAt = new Date(2026, 9, 4, 10, 0, 30, 123).getTime()
    const segA = { startAt: sessionStartAt, endAt: splitAt }
    const segB = { startAt: splitAt, endAt: sessionEndAt }
    const result = validateSegmentForm({
      formStartAt: fromDateAndTime('2026-10-04', '09:50'),
      formEndAt: formTimes(segB.endAt),
      session,
      originalSegment: segB,
      otherSegments: [segA],
    })
    expect(result.error).toBe('与同条记录内其他段重叠')
  })

  it('进行中记录（endAt null）：开始保留原值，结束可显式设置', () => {
    const openSession = { startAt: sessionStartAt, endAt: null }
    const seg = { startAt: sessionStartAt, endAt: null }
    const result = validateSegmentForm({
      formStartAt: formTimes(seg.startAt),
      formEndAt: fromDateAndTime('2026-10-04', '10:00'),
      session: openSession,
      originalSegment: seg,
      otherSegments: [],
    })
    expect(result.error).toBeNull()
    expect(result.startAt).toBe(sessionStartAt)
    expect(result.endAt).toBe(fromDateAndTime('2026-10-04', '10:00'))
  })

  it('进行中段未设置结束（表单结束=开始）：要求补结束时间', () => {
    const openSession = { startAt: sessionStartAt, endAt: null }
    const seg = { startAt: sessionStartAt, endAt: null }
    const result = validateSegmentForm({
      formStartAt: formTimes(seg.startAt),
      formEndAt: formTimes(seg.startAt),
      session: openSession,
      originalSegment: seg,
      otherSegments: [],
    })
    expect(result.error).toBe('结束须晚于开始')
  })

  it('新增段（无原始段）：按表单值校验', () => {
    const result = validateSegmentForm({
      formStartAt: fromDateAndTime('2026-10-04', '09:14'),
      formEndAt: fromDateAndTime('2026-10-04', '10:00'),
      session,
      originalSegment: null,
      otherSegments: [],
    })
    expect(result.error).toBeNull()
    expect(result.startAt).toBe(fromDateAndTime('2026-10-04', '09:14'))
    expect(result.endAt).toBe(fromDateAndTime('2026-10-04', '10:00'))
  })

  it('表单时间不完整：返回 startAt null，不报错', () => {
    const result = validateSegmentForm({
      formStartAt: null,
      formEndAt: null,
      session,
      originalSegment: null,
      otherSegments: [],
    })
    expect(result.error).toBeNull()
    expect(result.startAt).toBeNull()
  })
})
