import { describe, it, expect } from 'vitest'
import { formatDuration, formatDurationShort } from './format.js'

describe('formatDuration', () => {
  it('不足 1 分钟显示 m:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(59000)).toBe('0:59')
    expect(formatDuration(30000)).toBe('0:30')
  })

  it('1 分钟以上不足 1 小时显示 m:ss', () => {
    expect(formatDuration(60000)).toBe('1:00')
    expect(formatDuration(125000)).toBe('2:05')
  })

  it('1 小时以上显示 h:mm:ss', () => {
    expect(formatDuration(3600000)).toBe('1:00:00')
    expect(formatDuration(3661000)).toBe('1:01:01')
  })
})

describe('formatDurationShort', () => {
  it('不足 1 分钟显示 0', () => {
    expect(formatDurationShort(0)).toBe('0')
    expect(formatDurationShort(45000)).toBe('0')
  })
  it('1 分钟以上不足 1 小时用分钟', () => {
    expect(formatDurationShort(60000)).toBe('1m')
    expect(formatDurationShort(30 * 60000)).toBe('30m')
  })
  it('1 小时及以上用小数点小时', () => {
    expect(formatDurationShort(3600000)).toBe('1.0 h')
    expect(formatDurationShort(3660000)).toBe('1.0 h')
    expect(formatDurationShort((6 * 60 + 42) * 60000)).toBe('6.7 h')
  })
})
