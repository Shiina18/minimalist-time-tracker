/**
 * 往当前数据库写入随机数据：最近 6 个月，项目 test-1 / test-2 / 归档 test-3。
 * 开发环境在浏览器控制台执行：__seed()
 */
import { addProject, addSession, addSegment, getAllProjects } from '../db/index.js'

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function ts(y, month, d, h, min) {
  return new Date(y, month - 1, d, h, min, 0, 0).getTime()
}

export async function seed() {
  const now = new Date()
  const rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
  const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const rangeStart = startDate.getTime()

  let projs = await getAllProjects()
  const byName = Object.fromEntries(projs.map((p) => [p.name, p]))
  const ensureProject = async (name, archived = false) => {
    if (byName[name]) return byName[name]
    const p = await addProject({ name, archived })
    byName[name] = p
    return p
  }

  const p1 = await ensureProject('test-1')
  const p2 = await ensureProject('test-2')
  const p3 = await ensureProject('test-3', true)
  await ensureProject('test-4')
  await ensureProject('test-5')
  const projsForSegs = await getAllProjects()
  const projectIds = [null, ...projsForSegs.filter((p) => !p.archived).map((p) => p.id)]

  const sampleNotes = [
    '上午专注开发\n[test-1] 完成 API 联调\n[test-2] 文档补充',
    '[test-1] 需求评审与排期',
    '未归类时段\n[test-2] 修复若干 bug',
  ]

  const sessionsAdded = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
    const y = d.getFullYear()
    const month = d.getMonth() + 1
    const daysInMonth = new Date(y, month, 0).getDate()
    const sessionsThisMonth = randomInt(4, 14)
    for (let j = 0; j < sessionsThisMonth; j++) {
      const day = randomInt(1, daysInMonth)
      const startH = randomInt(8, 20)
      const startMin = randomInt(0, 59)
      const startAt = ts(y, month, day, startH, startMin)
      if (startAt < rangeStart || startAt > rangeEnd) continue

      const isLongMultiProject = j === 0 && i >= 4
      const durationMs = isLongMultiProject
        ? randomInt(110, 130) * 60 * 1000
        : randomInt(10, 120) * 60 * 1000
      const endAt = startAt + durationMs
      if (endAt > rangeEnd) continue
      const note = randomInt(0, 2) === 0 ? sampleNotes[randomInt(0, sampleNotes.length - 1)] : ''
      const session = await addSession({ startAt, endAt, note })
      sessionsAdded.push(session)

      const numSegs = isLongMultiProject
        ? randomInt(8, 14)
        : randomInt(0, 3)
      if (numSegs === 0) {
        await addSegment({ sessionId: session.id, projectId: null, startAt, endAt })
      } else {
        const step = Math.floor(durationMs / numSegs)
        for (let s = 0; s < numSegs; s++) {
          const segStart = startAt + s * step
          const segEnd = s === numSegs - 1 ? endAt : startAt + (s + 1) * step
          const projectId = projectIds[randomInt(0, projectIds.length - 1)]
          await addSegment({
            sessionId: session.id,
            projectId,
            startAt: segStart,
            endAt: segEnd,
          })
        }
      }
    }
  }

  console.log('Seed done. Sessions:', sessionsAdded.length, 'Projects: test-1..5 (test-3 archived); some ~2h multi-segment sessions in recent months')
  return sessionsAdded.length
}
