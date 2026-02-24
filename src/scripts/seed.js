/**
 * 往当前数据库写入随机数据：最近 6 个月，子项目 test-1 / test-2 / 归档 test-3。
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
  const projectIds = [null, p1.id, p2.id, p3.id]

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
      const durationMs = randomInt(10, 120) * 60 * 1000
      const endAt = startAt + durationMs
      if (endAt > rangeEnd) continue
      const session = await addSession({ startAt, endAt })
      sessionsAdded.push(session)

      const numSegs = randomInt(0, 3)
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

  console.log('Seed done. Sessions:', sessionsAdded.length, 'Projects: test-1, test-2, test-3(archived)')
  return sessionsAdded.length
}
