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
export async function getAllProjects() {
  const db = await getDB()
  return db.getAll('projects')
}

export async function getProjects(archived = false) {
  const all = await getAllProjects()
  return all.filter((p) => p.archived === archived)
}

export async function getProject(id) {
  const db = await getDB()
  return db.get('projects', id)
}

export async function addProject({ name, archived = false }) {
  const db = await getDB()
  const project = {
    id: genId(),
    name,
    createdAt: Date.now(),
    archived,
  }
  await db.add('projects', project)
  return project
}

export async function updateProject(id, patch) {
  const db = await getDB()
  const project = await db.get('projects', id)
  if (!project) return
  const updated = { ...project, ...patch }
  await db.put('projects', updated)
  return updated
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

export async function getSession(id) {
  const db = await getDB()
  return db.get('sessions', id)
}

/** @returns {Promise<import('./types.js').Session | undefined>} */
export async function getActiveSession() {
  const all = await getAllSessions()
  return all.find((s) => s.endAt == null)
}

export async function addSession({ startAt, endAt = null }) {
  const db = await getDB()
  const session = {
    id: genId(),
    startAt,
    endAt,
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
