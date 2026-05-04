<template>
  <div class="home" :class="{ 'home--start': !activeSession, 'home--running': activeSession }">
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
          <p class="timer-value" :class="{ 'timer-value--paused': pausedAt }">
            {{ formatDuration(elapsedMs) }}
          </p>
        </div>
        <div class="current-project" v-if="currentProjectName">
          <span class="current-project-label">当前：</span>
          <span class="current-project-name">{{ currentProjectName }}</span>
        </div>
        <div class="note-block">
          <div
            v-if="!noteEditing"
            ref="noteDisplayRef"
            class="note-display"
            @click="startEditNote"
          >
            {{ (activeSession.note || '').trim() || '添加备注' }}
          </div>
          <textarea
            v-else
            ref="noteInputRef"
            v-model="noteValue"
            class="note-textarea"
            :maxlength="NOTE_MAX_LENGTH"
            rows="3"
            placeholder="添加备注"
            @blur="onNoteBlur"
            @keydown.enter="onNoteEnter"
          />
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
              {{ currentProjectName ? '切换项目' : '选择项目' }}
            </button>
            <button
              v-if="currentProjectName"
              type="button"
              class="btn btn-secondary btn-end-project"
              @click="endCurrentProject"
            >
              结束当前项目
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
    <div v-if="toastMessage" class="toast">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  getActiveSession,
  getSegmentsBySessionId,
  addSession,
  addSegment,
  setSessionEnd,
  setSegmentEnd,
  getProject,
  getDefaultStartProject,
  deleteSession,
  deleteSegment,
  updateSession,
  updateSegment,
} from '../db/index.js'

const MIN_DURATION_MS = 3 * 60 * 1000
const MIN_UNCLASSIFIED_MS = MIN_DURATION_MS
import { NOTE_MAX_LENGTH } from '../constants.js'
import { formatDuration } from '../utils/format.js'
import { computeElapsedMs } from '../utils/timer.js'
import ProjectPicker from '../components/ProjectPicker.vue'

const activeSession = ref(null)
const segments = ref([])
const showPicker = ref(false)
const pausedAt = ref(null)
const pausedProjectId = ref(null)
let tickInterval = null

const currentSegment = computed(() =>
  segments.value.find((s) => s.endAt == null),
)
const projectMap = ref({})
const currentProjectName = computed(() => {
  const seg = currentSegment.value
  const projectId =
    pausedAt.value && pausedProjectId.value != null
      ? pausedProjectId.value
      : seg?.projectId ?? null
  if (!projectId) return ''
  const p = projectMap.value[projectId]
  return p ? p.name : ''
})

const noteEditing = ref(false)
const noteValue = ref('')
const noteInputRef = ref(null)
const noteDisplayRef = ref(null)

const elapsedMs = ref(0)
const toastMessage = ref('')
let toastTimer = null
// 超过 6 行通常意味着单屏展示不下，才允许外层滚动，避免误触导致页面漂移。
const NOTE_SCROLL_UNLOCK_LINES = 6

function syncMainScrollLock() {
  if (typeof document === 'undefined') return
  const mainEl = document.querySelector('.main')
  if (!mainEl) return
  const shouldLock = !activeSession.value || !shouldAllowTimerScroll()
  mainEl.classList.toggle('main--lock-scroll', shouldLock)
}

function getRenderedLineCount(el) {
  if (!el || typeof window === 'undefined') return 0
  const style = window.getComputedStyle(el)
  let lineHeight = Number.parseFloat(style.lineHeight)
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    const fontSize = Number.parseFloat(style.fontSize) || 16
    lineHeight = fontSize * 1.5
  }
  return Math.round(el.scrollHeight / lineHeight)
}

function shouldAllowTimerScroll() {
  if (!activeSession.value) return false

  // 编辑态优先看 textarea 的实时高度，保证输入过程中滚动策略即时生效。
  if (noteEditing.value && noteInputRef.value) {
    return getRenderedLineCount(noteInputRef.value) > NOTE_SCROLL_UNLOCK_LINES
  }

  const noteText = (activeSession.value.note || '').trim()
  if (!noteText || !noteDisplayRef.value) return false
  return getRenderedLineCount(noteDisplayRef.value) > NOTE_SCROLL_UNLOCK_LINES
}

function queueSyncMainScrollLock() {
  // 等 DOM 完成渲染后再读高度，避免拿到旧布局导致滚动锁误判。
  nextTick(() => {
    syncMainScrollLock()
  })
}

function showToast(message) {
  toastMessage.value = message
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
    toastTimer = null
  }, 3000)
}

async function closeSegmentWithThreeMinuteRule(seg, endAt, { emitToast = true } = {}) {
  if (!seg) return
  await setSegmentEnd(seg.id, endAt)
  const dur = endAt - seg.startAt
  const unclassified = seg.projectId == null || dur < MIN_DURATION_MS
  if (unclassified && dur < MIN_UNCLASSIFIED_MS) {
    await deleteSegment(seg.id)
    if (emitToast) {
      showToast('已丢弃不足三分钟的片段')
    }
  } else if (dur < MIN_DURATION_MS) {
    await updateSegment(seg.id, { projectId: null })
    if (emitToast) {
      showToast('已丢弃不足三分钟的片段')
    }
  }
}

function computeElapsed() {
  if (!activeSession.value) return 0
  return computeElapsedMs(segments.value, pausedAt.value, Date.now())
}

function openPicker() {
  showPicker.value = true
}

async function togglePause() {
  if (showPicker.value) return
  const session = activeSession.value
  if (!session) return

  if (!pausedAt.value) {
    const seg = currentSegment.value
    const now = Date.now()
    const projectId = seg?.projectId ?? null
    if (seg) {
      await closeSegmentWithThreeMinuteRule(seg, now, { emitToast: true })
    }
    pausedAt.value = now
    pausedProjectId.value = projectId
    segments.value = await getSegmentsBySessionId(session.id)
  } else {
    const projectId = pausedProjectId.value
    await addSegment({
      sessionId: session.id,
      projectId,
      startAt: Date.now(),
      endAt: null,
    })
    pausedAt.value = null
    pausedProjectId.value = null
    segments.value = await getSegmentsBySessionId(session.id)
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

function startEditNote() {
  const existing = (activeSession.value?.note ?? '').trim()
  if (!existing && currentProjectName.value) {
    noteValue.value = `[${currentProjectName.value}] `
  } else {
    noteValue.value = existing
  }
  noteEditing.value = true
  nextTick(() => noteInputRef.value?.focus())
}

async function onNoteBlur() {
  noteEditing.value = false
  const trimmed = (noteValue.value || '').trim()
  const current = (activeSession.value?.note ?? '').trim()
  if (trimmed !== current) {
    await updateSession(activeSession.value.id, { note: trimmed || '' })
    activeSession.value = { ...activeSession.value, note: trimmed || '' }
  }
}

function onNoteEnter(e) {
  if (e.key !== 'Enter') return
  e.preventDefault()
  const ta = e.target
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const insert = currentProjectName.value ? `\n[${currentProjectName.value}] ` : '\n'
  const val = noteValue.value
  const newVal = val.slice(0, start) + insert + val.slice(end)
  noteValue.value = newVal
  nextTick(() => {
    ta.selectionStart = ta.selectionEnd = start + insert.length
  })
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
  const defaultProject = await getDefaultStartProject()
  await addSegment({
    sessionId: session.id,
    projectId: defaultProject?.id ?? null,
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
    await closeSegmentWithThreeMinuteRule(seg, now, { emitToast: true })
  }
  const session = activeSession.value
  if (!session) return
  const sessionDur = now - session.startAt
  if (sessionDur < MIN_DURATION_MS) {
    await deleteSession(session.id)
    showToast('已丢弃不足三分钟的记录')
  } else {
    await setSessionEnd(session.id, now)
  }
  await loadActive()
}

async function endCurrentProject() {
  const seg = currentSegment.value
  if (!seg) return
  const now = Date.now()
  await closeSegmentWithThreeMinuteRule(seg, now, { emitToast: true })
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
    await closeSegmentWithThreeMinuteRule(seg, endAt, { emitToast: true })
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
  showPicker.value = false
}

onMounted(async () => {
  await loadActive()
  queueSyncMainScrollLock()
  if (activeSession.value) startTick()
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    const mainEl = document.querySelector('.main')
    mainEl?.classList.remove('main--lock-scroll')
  }
  stopTick()
})

watch(activeSession, () => {
  queueSyncMainScrollLock()
})

watch(noteEditing, () => {
  queueSyncMainScrollLock()
})

watch(noteValue, () => {
  if (!activeSession.value) return
  queueSyncMainScrollLock()
})

watch(
  () => activeSession.value?.note,
  () => {
    if (!activeSession.value) return
    queueSyncMainScrollLock()
  },
)
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
  margin-bottom: calc(-1rem - var(--touch-min) - env(safe-area-inset-bottom, 0px));
  width: calc(100% + 2rem);
  background:
    radial-gradient(140% 100% at 0% 0%, #fff8ea 0%, transparent 45%),
    radial-gradient(120% 120% at 100% 0%, #f0e8dc 0%, transparent 40%),
    var(--bg);
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
  background: rgba(var(--accent-rgb), 0.08);
}

.hero:focus {
  outline: none;
}

.hero:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.hero-label {
  font-size: var(--fs-hero);
  font-family: var(--font-ui);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--accent);
  text-align: center;
  text-shadow: 0 10px 20px rgba(var(--accent-rgb), 0.1);
}

.hero-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--fs-body-sm);
}

/* 有 session 时计时界面：默认锁滚动，是否允许滚动由 main--lock-scroll 控制 */
.home--running {
  min-height: 100%;
}

.timer-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  gap: 0.6rem;
}

.timer-section {
  text-align: center;
  margin-bottom: 1rem;
}

.timer-value {
  margin: 0;
  font-size: var(--fs-timer);
  font-family: var(--font-ui);
  font-weight: 700;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

.timer-value--paused {
  color: var(--text-muted);
}

.current-project {
  width: 100%;
  max-width: 360px;
  margin: 0 auto 0.75rem;
  padding: 0.65rem 1rem;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  font-size: var(--fs-body);
}

.current-project-label {
  color: var(--text-muted);
}

.current-project-name {
  word-break: break-word;
}

.note-block {
  width: 100%;
  max-width: 360px;
  margin: 0 auto 0.75rem;
}

.note-display {
  white-space: pre-wrap;
  min-height: 2.5rem;
  padding: 0.5rem 1rem;
  background: var(--surface);
  border-radius: var(--radius);
  font-size: var(--fs-body);
  color: var(--text);
  cursor: text;
  border: 1px solid var(--border);
}

.note-display:hover {
  border-color: var(--accent);
}

.note-textarea {
  width: 100%;
  padding: 0.5rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font: inherit;
  resize: vertical;
  min-height: 4em;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
}

.btn-end {
  width: 100%;
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  font-size: var(--fs-body);
  font-weight: 700;
  background: var(--danger);
  color: white;
  border-radius: var(--radius);
  border-color: var(--danger);
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
  background: color-mix(in srgb, var(--surface) 82%, var(--surface-soft) 18%);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.btn-ghost {
  color: var(--text-muted);
  min-height: var(--touch-min);
  padding: 0.5rem;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--touch-min) + 1.25rem + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  background: rgba(47, 38, 25, 0.9);
  color: #fff8ec;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  font-size: var(--fs-caption);
  z-index: 200;
  max-width: 90%;
  text-align: center;
}
</style>
