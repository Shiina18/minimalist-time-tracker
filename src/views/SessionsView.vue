<template>
  <div class="sessions">
    <h1 class="page-title">记录列表</h1>
    <RouterLink to="/sessions/new" class="btn btn-primary add-btn">添加记录</RouterLink>
    <div v-if="loading" class="loading">加载中…</div>
    <template v-else>
      <div v-for="group in byDate" :key="group.date" class="date-group">
        <h2 class="date-group-title">{{ group.date }}</h2>
        <ul class="session-list">
          <li v-for="s in group.sessions" :key="s.id" class="session-item">
            <RouterLink :to="`/sessions/${s.id}`" class="session-link">
              <div class="session-link-row">
                <span class="session-time">{{ formatTimeRange(s.startAt, s.endAt) }}</span>
                <span class="session-duration">{{ formatDurationShort(sessionDuration(s)) }}</span>
              </div>
              <p v-if="noteSummary(s.note)" class="session-note-summary">{{ noteSummary(s.note) }}</p>
            </RouterLink>
          </li>
        </ul>
      </div>
      <p v-if="sessions.length === 0" class="empty">暂无记录</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getSessionsByStartDesc, getAllSegments } from '../db/index.js'
import { formatDate, formatDurationShort } from '../utils/format.js'
import { computeSessionDurationMs } from '../utils/stats.js'

const sessions = ref([])
const segmentsBySessionId = ref(new Map())
const loading = ref(true)

const byDate = computed(() => {
  const map = new Map()
  for (const s of sessions.value) {
    const date = formatDate(s.startAt)
    if (!map.has(date)) map.set(date, { date, sessions: [] })
    map.get(date).sessions.push(s)
  }
  return [...map.values()]
})

function sessionDuration(s) {
  const segs = segmentsBySessionId.value.get(s.id) ?? []
  return computeSessionDurationMs(s, segs, Date.now())
}

function formatTimeRange(start, end) {
  const d1 = new Date(start)
  const d2 = end ? new Date(end) : null
  const t1 = d1.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (!d2) return t1
  const t2 = d2.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return `${t1} – ${t2}`
}

function noteSummary(note, maxLen = 40) {
  if (!note || !note.trim()) return ''
  const firstLine = note.split('\n')[0].trim()
  return firstLine.length > maxLen ? firstLine.slice(0, maxLen) + '…' : firstLine
}

async function load() {
  loading.value = true
  const [sessList, allSegments] = await Promise.all([
    getSessionsByStartDesc(),
    getAllSegments(),
  ])
  sessions.value = sessList
  const bySession = new Map()
  for (const seg of allSegments) {
    if (!bySession.has(seg.sessionId)) bySession.set(seg.sessionId, [])
    bySession.get(seg.sessionId).push(seg)
  }
  for (const [, segs] of bySession) {
    segs.sort((a, b) => a.startAt - b.startAt)
  }
  segmentsBySessionId.value = bySession
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.sessions {
  padding: 0.5rem 0;
}

.page-title {
  margin: 0 0 1rem;
  font-size: var(--fs-page-title);
  font-weight: 600;
}

.add-btn {
  display: inline-block;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius);
  font-weight: 500;
  background: var(--accent);
  color: white;
}

.loading, .empty {
  color: var(--text-muted);
  margin: 1rem 0;
}

.date-group {
  margin-bottom: 1.5rem;
}

.date-group-title {
  margin: 0 0 0.5rem;
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--text-muted);
}

.session-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.session-item {
  border-bottom: 1px solid var(--border);
}

.session-item:last-child {
  border-bottom: none;
}

.session-link {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  padding: 1rem;
  color: var(--text);
  min-height: var(--touch-min);
}

.session-link-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-duration {
  color: var(--text-muted);
  font-size: var(--fs-body);
}

.session-note-summary {
  margin: 0;
  font-size: var(--fs-caption);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
