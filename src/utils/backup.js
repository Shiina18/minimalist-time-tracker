import { getDB, getAllProjects, getAllSessions, getAllSegments } from '../db/index.js'

const APP_ID = 'minimalist-time-tracker'
export const EXPORT_FORMAT_VERSION = 1

function buildBackupFilename() {
  const d = new Date()
  const year = String(d.getFullYear()).padStart(4, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `minimalist-time-tracker-backup-${year}-${month}-${day}.json`
}

async function buildSnapshot() {
  const [projects, sessions, segments] = await Promise.all([
    getAllProjects(),
    getAllSessions(),
    getAllSegments(),
  ])

  const finishedSessions = sessions.filter((s) => s.endAt != null)
  const finishedIds = new Set(finishedSessions.map((s) => s.id))
  const relatedSegments = segments.filter((seg) => finishedIds.has(seg.sessionId))

  return {
    app: APP_ID,
    exportFormatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: Date.now(),
    projects,
    sessions: finishedSessions,
    segments: relatedSegments,
  }
}

async function createBackupBlob() {
  const snapshot = await buildSnapshot()
  const json = JSON.stringify(snapshot, null, 2)
  return new Blob([json], { type: 'application/json' })
}

export async function exportViaShareOrDownload() {
  const blob = await createBackupBlob()
  const filename = buildBackupFilename()

  const supportsShare =
    typeof navigator !== 'undefined' &&
    'share' in navigator &&
    'canShare' in navigator &&
    navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })

  if (supportsShare) {
    const file = new File([blob], filename, { type: 'application/json' })
    await navigator.share({
      files: [file],
      title: '极简时间记录备份',
      text: '备份自 minimalist-time-tracker',
    })
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 30_000)
}

export async function hasActiveSession() {
  const sessions = await getAllSessions()
  return sessions.some((s) => s.endAt == null)
}

export async function hasAnyData() {
  const [projects, sessions, segments] = await Promise.all([
    getAllProjects(),
    getAllSessions(),
    getAllSegments(),
  ])
  return projects.length > 0 || sessions.length > 0 || segments.length > 0
}

async function parseAndValidateBackupFile(file) {
  const text = await file.text()
  const data = JSON.parse(text)

  if (data.app !== APP_ID) {
    throw new Error('INVALID_APP')
  }
  if (data.exportFormatVersion !== EXPORT_FORMAT_VERSION) {
    throw new Error('INVALID_VERSION')
  }
  if (!Array.isArray(data.projects) || !Array.isArray(data.sessions) || !Array.isArray(data.segments)) {
    throw new Error('INVALID_STRUCTURE')
  }

  const sessionIds = new Set(data.sessions.map((s) => s.id))
  const projectIds = new Set(data.projects.map((p) => p.id))

  for (const seg of data.segments) {
    if (!sessionIds.has(seg.sessionId)) {
      throw new Error('INVALID_RELATIONS')
    }
    if (seg.projectId != null && !projectIds.has(seg.projectId)) {
      throw new Error('INVALID_RELATIONS')
    }
  }

  return {
    projects: data.projects,
    sessions: data.sessions,
    segments: data.segments,
  }
}

async function replaceAllData(snapshot) {
  const db = await getDB()
  const tx = db.transaction(['projects', 'sessions', 'segments'], 'readwrite')
  const projectStore = tx.objectStore('projects')
  const sessionStore = tx.objectStore('sessions')
  const segmentStore = tx.objectStore('segments')

  await Promise.all([
    segmentStore.clear(),
    sessionStore.clear(),
    projectStore.clear(),
  ])

  for (const p of snapshot.projects) {
    await projectStore.put(p)
  }
  for (const s of snapshot.sessions) {
    await sessionStore.put(s)
  }
  for (const seg of snapshot.segments) {
    await segmentStore.put(seg)
  }

  await tx.done
}

export async function importFromFile(file) {
  const snapshot = await parseAndValidateBackupFile(file)
  await replaceAllData(snapshot)
}

