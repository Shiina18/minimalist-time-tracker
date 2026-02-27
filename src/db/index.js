import { openDB } from 'idb'

const DB_NAME =
  import.meta.env.DEV ? 'minimalist-time-tracker-dev' : 'minimalist-time-tracker'
const DB_VERSION = 2

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('segments')) {
        db.createObjectStore('segments', { keyPath: 'id' })
      }
    },
  })
}

function genId() {
  return crypto.randomUUID()
}

// --- Projects ---
function sortProjectsByUpdatedDesc(list) {
  return [...list].sort((a, b) => {
    const aTs = a.updatedAt ?? a.createdAt ?? 0
    const bTs = b.updatedAt ?? b.createdAt ?? 0
    return bTs - aTs
  })
}

export async function getAllProjects() {
  const db = await getDB()
  const all = await db.getAll('projects')
  return sortProjectsByUpdatedDesc(all)
}

export async function getProjects(archived = false) {
  const all = await getAllProjects()
  const filtered = all.filter((p) => p.archived === archived)
  if (archived) return sortProjectsByUpdatedDesc(filtered)
  if (filtered.length === 0) return filtered
  const byTime = sortProjectsByUpdatedDesc(filtered)
  const indexById = new Map(byTime.map((p, idx) => [p.id, idx]))
  return [...filtered].sort((a, b) => {
    const aKey = a.manualOrder ?? indexById.get(a.id) ?? 0
    const bKey = b.manualOrder ?? indexById.get(b.id) ?? 0
    return aKey - bKey
  })
}

export async function getProject(id) {
  const db = await getDB()
  return db.get('projects', id)
}

export async function addProject({ name, archived = false, defaultStart = false }) {
  const db = await getDB()
  if (defaultStart) {
    const all = await db.getAll('projects')
    for (const p of all) {
      if (p.defaultStart) await updateProject(p.id, { defaultStart: false })
    }
  }
  const project = {
    id: genId(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    archived,
    defaultStart: defaultStart || false,
  }
  await db.add('projects', project)
  return project
}

export async function updateProject(id, patch) {
  const db = await getDB()
  const project = await db.get('projects', id)
  if (!project) return
  if (patch.defaultStart === true) {
    const all = await db.getAll('projects')
    for (const p of all) {
      if (p.id !== id && p.defaultStart) await updateProject(p.id, { defaultStart: false })
    }
  }
  const base = { ...project, ...patch }
  const keys = Object.keys(patch ?? {})
  const shouldTouchUpdatedAt = keys.some((k) => k !== 'archived' && k !== 'manualOrder')
  const updated = shouldTouchUpdatedAt ? { ...base, updatedAt: Date.now() } : base
  await db.put('projects', updated)
  return updated
}

/** @returns {Promise<import('./types.js').Project | undefined>} */
export async function getDefaultStartProject() {
  const all = await getAllProjects()
  return all.find((p) => p.defaultStart === true)
}

export async function deleteProject(id) {
  const db = await getDB()
  await db.delete('projects', id)
}

// --- Sessions ---
export async function getAllSessions() {
  const db = await getDB()
  return db.getAll('sessions')
}

export async function getSessionsByStartDesc() {
  const all = await getAllSessions()
  return all.sort((a, b) => b.startAt - a.startAt)
}

/** 与 [startAt, endAt] 重叠的 session（已结束用 [s.startAt, s.endAt]，进行中用 [s.startAt, now]）。excludeSessionId 排除不参与检查。 */
export async function getSessionsOverlapping(startAt, endAt, excludeSessionId = null) {
  const all = await getAllSessions()
  const now = Date.now()
  return all.filter((s) => {
    if (excludeSessionId != null && s.id === excludeSessionId) return false
    const sEnd = s.endAt != null ? s.endAt : now
    return startAt < sEnd && s.startAt < endAt
  })
}

export async function getSession(id) {
  const db = await getDB()
  return db.get('sessions', id)
}

/** @returns {Promise<import('./types.js').Session | undefined>} */
export async function getActiveSession() {
  const all = await getAllSessions()
  return all.find((s) => s.endAt == null)
}

export async function addSession({ startAt, endAt = null, note }) {
  const db = await getDB()
  const session = {
    id: genId(),
    startAt,
    endAt,
    note: note ?? '',
  }
  await db.add('sessions', session)
  return session
}

export async function updateSession(id, patch) {
  const db = await getDB()
  const session = await db.get('sessions', id)
  if (!session) return
  const updated = { ...session, ...patch }
  await db.put('sessions', updated)
  return updated
}

export async function setSessionEnd(id, endAt) {
  return updateSession(id, { endAt })
}

export async function deleteSession(id) {
  const db = await getDB()
  const segments = await getSegmentsBySessionId(id)
  const tx = db.transaction(['sessions', 'segments'], 'readwrite')
  const sessStore = tx.objectStore('sessions')
  const segStore = tx.objectStore('segments')
  for (const s of segments) {
    segStore.delete(s.id)
  }
  sessStore.delete(id)
  await tx.done
}

// --- Segments ---
export async function getAllSegments() {
  const db = await getDB()
  return db.getAll('segments')
}

export async function getSegmentsBySessionId(sessionId) {
  const db = await getDB()
  const all = await db.getAll('segments')
  return all.filter((s) => s.sessionId === sessionId).sort((a, b) => a.startAt - b.startAt)
}

export async function getSegment(id) {
  const db = await getDB()
  return db.get('segments', id)
}

export async function addSegment({ sessionId, projectId = null, startAt, endAt = null }) {
  const db = await getDB()
  const segment = {
    id: genId(),
    sessionId,
    projectId,
    startAt,
    endAt,
  }
  await db.add('segments', segment)
  return segment
}

export async function updateSegment(id, patch) {
  const db = await getDB()
  const segment = await db.get('segments', id)
  if (!segment) return
  const updated = { ...segment, ...patch }
  await db.put('segments', updated)
  return updated
}

export async function setSegmentEnd(id, endAt) {
  return updateSegment(id, { endAt })
}

export async function deleteSegment(id) {
  const db = await getDB()
  await db.delete('segments', id)
}
