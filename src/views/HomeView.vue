<template>
  <div class="home" :class="{ 'home--start': !activeSession }">
    <template v-if="!activeSession">
      <div
        class="hero"
        role="button"
        tabindex="0"
        @click="startSession"
        @keydown.enter.prevent="startSession"
        @keydown.space.prevent="startSession"
      >
        <span class="hero-label">开始</span>
      </div>
    </template>
    <template v-else>
      <div class="timer-block">
        <div class="timer-section">
          <p class="timer-value">{{ formatDuration(elapsedMs) }}</p>
          <p class="timer-paused" v-if="pausedAt">已暂停</p>
        </div>
        <div class="current-project" v-if="currentProjectName">
          <span class="current-project-label">当前：</span>
          <span class="current-project-name">{{ currentProjectName }}</span>
        </div>
      <div class="actions">
        <button type="button" class="btn btn-end" @click="endSession">结束</button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="togglePause"
        >
          {{ pausedAt ? '继续' : '暂停' }}
        </button>
        <div class="project-actions">
          <button type="button" class="btn btn-secondary" @click="openPicker">
            {{ currentProjectName ? '切换子项目' : '选择子项目' }}
          </button>
          <button
            v-if="currentProjectName"
            type="button"
            class="btn btn-secondary btn-end-project"
            @click="endCurrentProject"
          >
            结束当前子项目
          </button>
        </div>
      </div>
      </div>
      <ProjectPicker
        :open="showPicker"
        @close="onClosePicker"
        @select="onSelectProject"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getActiveSession,
  getSegmentsBySessionId,
  addSession,
  addSegment,
  setSessionEnd,
  setSegmentEnd,
  getProject,
  deleteSegment,
  deleteSession,
} from '../db/index.js'

const MIN_DURATION_MS = 3 * 60 * 1000
import { formatDuration } from '../utils/format.js'
import { computeElapsedMs } from '../utils/timer.js'
import ProjectPicker from '../components/ProjectPicker.vue'

const activeSession = ref(null)
const segments = ref([])
const showPicker = ref(false)
const pausedAt = ref(null)
let tickInterval = null

const currentSegment = computed(() =>
  segments.value.find((s) => s.endAt == null),
)
const currentProjectName = computed(() => {
  const seg = currentSegment.value
  if (!seg || !seg.projectId) return ''
  const p = projectMap.value[seg.projectId]
  return p ? p.name : ''
})
const projectMap = ref({})

const elapsedMs = ref(0)

function computeElapsed() {
  if (!activeSession.value) return 0
  return computeElapsedMs(segments.value, pausedAt.value, Date.now())
}

function openPicker() {
  pausedAt.value = Date.now()
  showPicker.value = true
}

async function togglePause() {
  if (pausedAt.value && !showPicker.value) {
    const seg = currentSegment.value
    const endAt = pausedAt.value
    const projectId = seg?.projectId ?? null
    if (seg) await setSegmentEnd(seg.id, endAt)
    await addSegment({
      sessionId: activeSession.value.id,
      projectId,
      startAt: Date.now(),
      endAt: null,
    })
    pausedAt.value = null
    segments.value = await getSegmentsBySessionId(activeSession.value.id)
  } else if (!pausedAt.value && !showPicker.value) {
    pausedAt.value = Date.now()
  }
}

async function loadActive() {
  const session = await getActiveSession()
  if (!session) {
    activeSession.value = null
    segments.value = []
    elapsedMs.value = 0
    return
  }
  activeSession.value = session
  segments.value = await getSegmentsBySessionId(session.id)
  const projectIds = [...new Set(segments.value.map((s) => s.projectId).filter(Boolean))]
  const projects = await Promise.all(projectIds.map((id) => getProject(id)))
  projectMap.value = Object.fromEntries(projects.filter(Boolean).map((p) => [p.id, p]))
  elapsedMs.value = computeElapsed()
}

function startTick() {
  tickInterval = setInterval(() => {
    elapsedMs.value = computeElapsed()
  }, 1000)
}

function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}

async function startSession() {
  const session = await addSession({ startAt: Date.now(), endAt: null })
  await addSegment({
    sessionId: session.id,
    projectId: null,
    startAt: session.startAt,
    endAt: null,
  })
  await loadActive()
  startTick()
}

async function endSession() {
  stopTick()
  const now = Date.now()
  const seg = currentSegment.value
  if (seg) {
    const dur = now - seg.startAt
    if (dur >= MIN_DURATION_MS) await setSegmentEnd(seg.id, now)
    else await deleteSegment(seg.id)
  }
  const session = activeSession.value
  if (!session) return
  const sessionDur = now - session.startAt
  if (sessionDur < MIN_DURATION_MS) {
    await deleteSession(session.id)
  } else {
    await setSessionEnd(session.id, now)
  }
  await loadActive()
}

async function endCurrentProject() {
  const seg = currentSegment.value
  if (!seg) return
  const now = Date.now()
  const dur = now - seg.startAt
  if (dur >= MIN_DURATION_MS) await setSegmentEnd(seg.id, now)
  else await deleteSegment(seg.id)
  await addSegment({
    sessionId: activeSession.value.id,
    projectId: null,
    startAt: now,
    endAt: null,
  })
  segments.value = await getSegmentsBySessionId(activeSession.value.id)
}

async function onSelectProject(project) {
  const now = Date.now()
  const seg = currentSegment.value
  const endAt = pausedAt.value ?? now
  if (seg) {
    const dur = endAt - seg.startAt
    if (dur >= MIN_DURATION_MS) await setSegmentEnd(seg.id, endAt)
    else await deleteSegment(seg.id)
  }
  await addSegment({
    sessionId: activeSession.value.id,
    projectId: project.id,
    startAt: now,
    endAt: null,
  })
  pausedAt.value = null
  showPicker.value = false
  if (project.id && !projectMap.value[project.id]) projectMap.value[project.id] = project
  segments.value = await getSegmentsBySessionId(activeSession.value.id)
}

async function onClosePicker() {
  const now = Date.now()
  const seg = currentSegment.value
  const endAt = pausedAt.value ?? now
  if (seg) {
    const dur = endAt - seg.startAt
    if (dur >= MIN_DURATION_MS) await setSegmentEnd(seg.id, endAt)
    else await deleteSegment(seg.id)
  }
  await addSegment({
    sessionId: activeSession.value.id,
    projectId: null,
    startAt: now,
    endAt: null,
  })
  pausedAt.value = null
  showPicker.value = false
  segments.value = await getSegmentsBySessionId(activeSession.value.id)
}

onMounted(async () => {
  await loadActive()
  if (activeSession.value) startTick()
})

onUnmounted(() => {
  stopTick()
})
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* 无 session 时起始区占满视口（除底栏），避免 min-height:100% 父链无高度导致只占一小条 */
/* 负 margin 吃掉 .main 的 padding，使整块区域都可点击，不再出现「周围一圈点不到」 */
.home--start {
  min-height: calc(100dvh - var(--touch-min) - env(safe-area-inset-bottom, 0px) - 2rem);
  margin: -1rem;
  margin-bottom: calc(-1rem - env(safe-area-inset-bottom, 0px));
  width: calc(100% + 2rem);
}

.hero {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.hero:hover {
  background: rgba(124, 110, 246, 0.06);
}

.hero:focus {
  outline: none;
}

.hero:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.hero-label {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--accent);
}

.hero-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 1rem;
}

.timer-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.timer-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.timer-value {
  margin: 0;
  font-size: 5.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.timer-paused {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.current-project {
  width: 100%;
  max-width: 320px;
  margin: 0 auto 0.75rem;
  padding: 0.5rem 1rem;
  background: var(--surface);
  border-radius: var(--radius);
  font-size: 0.95rem;
}

.current-project-label {
  color: var(--text-muted);
}

.current-project-name {
  word-break: break-word;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

.btn-end {
  width: 100%;
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  background: var(--danger);
  color: white;
  border-radius: var(--radius);
}

.project-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.btn-secondary {
  width: 100%;
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.btn-ghost {
  color: var(--text-muted);
  min-height: var(--touch-min);
  padding: 0.5rem;
}
</style>
