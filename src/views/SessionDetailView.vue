<template>
  <div class="session-detail">
    <div v-if="loading" class="loading">加载中…</div>
    <template v-else-if="session">
      <div class="header-actions">
        <button type="button" class="btn btn-ghost danger" @click="removeSession">删除整条记录</button>
      </div>
      <div class="session-meta">
        <div class="meta-row">
          <label>开始</label>
          <div class="date-time-row">
            <input
              type="date"
              :value="startDate"
              @change="onStartDateChange"
            />
            <input
              type="time"
              :value="startTime"
              @change="onStartTimeChange"
            />
          </div>
        </div>
        <div class="meta-row">
          <label>结束</label>
          <div class="date-time-row">
            <input
              type="date"
              :value="endDate"
              @change="onEndDateChange"
            />
            <input
              type="time"
              :value="endTime"
              @change="onEndTimeChange"
            />
          </div>
        </div>
        <div class="meta-row">
          <label>备注</label>
          <div class="note-block">
            <div
              v-if="!editingNote"
              class="note-display"
              @click="startEditNote"
            >
              {{ (session.note || '').trim() || '无' }}
            </div>
            <textarea
              v-else
              ref="noteInputRef"
              v-model="noteEditValue"
              class="note-textarea"
              :maxlength="NOTE_MAX_LENGTH"
              rows="3"
              @blur="onNoteBlur"
            />
          </div>
        </div>
        <p class="duration">总时长 {{ formatDuration(sessionDuration) }}</p>
      </div>
      <h2 class="segments-title">时间段</h2>
      <ul class="segments-list">
        <li v-for="seg in segments" :key="seg.id" class="segment-item">
          <div class="segment-main">
            <span class="segment-project">{{ projectName(seg.projectId) }}</span>
            <span class="segment-time">{{ formatSegmentTime(seg) }}</span>
          </div>
          <div class="segment-actions">
            <button type="button" class="btn-icon" @click="startEditSegment(seg)">编辑</button>
            <button type="button" class="btn-icon danger" @click="doDeleteSegment(seg)">删除</button>
          </div>
        </li>
      </ul>
      <button type="button" class="btn btn-secondary add-segment-btn" @click="startAddSegment">+ 添加时间段</button>
      <div v-if="editingSegment || addingSegment" class="modal-overlay" @click.self="closeSegmentModal">
        <div class="modal">
          <h3>{{ addingSegment ? '添加时间段' : '编辑时间段' }}</h3>
          <div class="meta-row">
            <label>项目</label>
            <select v-model="editSegmentForm.projectId" class="select">
              <option :value="null">（无）</option>
              <option v-for="p in allProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="meta-row">
            <label>开始</label>
            <div class="date-time-row">
              <input type="date" v-model="editSegmentForm.startDate" />
              <input type="time" v-model="editSegmentForm.startTime" />
            </div>
          </div>
          <div class="meta-row">
            <label>结束</label>
            <div class="date-time-row">
              <input type="date" v-model="editSegmentForm.endDate" />
              <input type="time" v-model="editSegmentForm.endTime" />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="closeSegmentModal">取消</button>
            <button type="button" class="btn btn-primary" @click="saveSegmentModal">保存</button>
          </div>
        </div>
      </div>
      <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
    </template>
    <p v-else class="empty">记录不存在</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getSession,
  getSegmentsBySessionId,
  getAllProjects,
  updateSession,
  updateSegment,
  addSegment,
  deleteSegment,
  deleteSession,
  getSessionsOverlapping,
} from '../db/index.js'
import { formatDuration, formatDurationShort } from '../utils/format.js'
import { computeSessionDurationMs } from '../utils/stats.js'
import { toDateInputValue, toTimeInputValue, fromDateAndTime } from '../utils/datetime.js'
import { NOTE_MAX_LENGTH } from '../constants.js'

const route = useRoute()
const router = useRouter()
const session = ref(null)
const segments = ref([])
const allProjects = ref([])
const loading = ref(true)
const toastMessage = ref('')
let toastTimer = null
const editingNote = ref(false)
const noteEditValue = ref('')
const noteInputRef = ref(null)
const editingSegment = ref(null)
const addingSegment = ref(false)
const editSegmentForm = ref({
  projectId: null,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
})

const startDate = ref('')
const startTime = ref('')
const endDate = ref('')
const endTime = ref('')

const sessionId = computed(() => route.params.id)

const sessionDuration = computed(() => {
  if (!session.value) return 0
  return computeSessionDurationMs(session.value, segments.value, Date.now())
})

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

function projectName(projectId) {
  if (!projectId) return '（未归类）'
  const p = allProjects.value.find((x) => x.id === projectId)
  return p ? p.name : '（已删除）'
}

function formatSegmentTime(seg) {
  const start = new Date(seg.startAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const endStr = seg.endAt
    ? new Date(seg.endAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '—'
  let text = `${start} – ${endStr}`
  if (seg.endAt && seg.endAt > seg.startAt) {
    const dur = seg.endAt - seg.startAt
    text += ` · ${formatDurationShort(dur)}`
  }
  return text
}

async function load() {
  if (!sessionId.value) return
  const isInitial = session.value == null
  if (isInitial) loading.value = true
  session.value = await getSession(sessionId.value)
  segments.value = session.value ? await getSegmentsBySessionId(sessionId.value) : []
  allProjects.value = await getAllProjects()
  if (session.value) {
    startDate.value = toDateInputValue(session.value.startAt)
    startTime.value = toTimeInputValue(session.value.startAt)
    const endTs = session.value.endAt ?? session.value.startAt
    endDate.value = toDateInputValue(endTs)
    endTime.value = toTimeInputValue(endTs)
  }
  loading.value = false
}

async function onNoteBlur() {
  const trimmed = (noteEditValue.value || '').trim()
  const current = (session.value?.note ?? '').trim()
  if (trimmed !== current) {
    await updateSession(session.value.id, { note: trimmed || '' })
    await load()
  }
  editingNote.value = false
}

watch(sessionId, load, { immediate: true })

function startEditNote() {
  noteEditValue.value = (session.value?.note ?? '').trim()
  editingNote.value = true
  nextTick(() => noteInputRef.value?.focus())
}

function sessionEndAtValue() {
  return fromDateAndTime(endDate.value, endTime.value) ?? session.value?.endAt ?? null
}

function onStartDateChange(e) {
  const v = fromDateAndTime(e.target.value, startTime.value)
  if (v == null || !session.value) return
  const endAt = sessionEndAtValue()
  if (endAt != null && v >= endAt) {
    showToast('结束须晚于开始')
    return
  }
  const rangeEnd = endAt ?? Date.now()
  getSessionsOverlapping(v, rangeEnd, session.value.id).then((overlapping) => {
    if (overlapping.length > 0) {
      showToast('与已有记录重叠')
      return
    }
    updateSession(session.value.id, { startAt: v }).then(load)
  })
}

function onStartTimeChange(e) {
  const v = fromDateAndTime(startDate.value, e.target.value)
  if (v == null || !session.value) return
  const endAt = sessionEndAtValue()
  if (endAt != null && v >= endAt) {
    showToast('结束须晚于开始')
    return
  }
  const rangeEnd = endAt ?? Date.now()
  getSessionsOverlapping(v, rangeEnd, session.value.id).then((overlapping) => {
    if (overlapping.length > 0) {
      showToast('与已有记录重叠')
      return
    }
    updateSession(session.value.id, { startAt: v }).then(load)
  })
}

function onEndDateChange(e) {
  const v = fromDateAndTime(e.target.value, endTime.value)
  if (!session.value) return
  if (v != null && session.value.startAt >= v) {
    showToast('结束须晚于开始')
    return
  }
  const startAt = fromDateAndTime(startDate.value, startTime.value) ?? session.value.startAt
  const rangeEnd = v ?? Date.now()
  getSessionsOverlapping(startAt, rangeEnd, session.value.id).then((overlapping) => {
    if (overlapping.length > 0) {
      showToast('与已有记录重叠')
      return
    }
    updateSession(session.value.id, { endAt: v || null }).then(load)
  })
}

function onEndTimeChange(e) {
  const v = fromDateAndTime(endDate.value, e.target.value)
  if (!session.value) return
  if (v != null && session.value.startAt >= v) {
    showToast('结束须晚于开始')
    return
  }
  const startAt = fromDateAndTime(startDate.value, startTime.value) ?? session.value.startAt
  const rangeEnd = v ?? Date.now()
  getSessionsOverlapping(startAt, rangeEnd, session.value.id).then((overlapping) => {
    if (overlapping.length > 0) {
      showToast('与已有记录重叠')
      return
    }
    updateSession(session.value.id, { endAt: v || null }).then(load)
  })
}

function startEditSegment(seg) {
  addingSegment.value = false
  editingSegment.value = seg
  editSegmentForm.value = {
    projectId: seg.projectId,
    startDate: toDateInputValue(seg.startAt),
    startTime: toTimeInputValue(seg.startAt),
    endDate: seg.endAt ? toDateInputValue(seg.endAt) : toDateInputValue(seg.startAt),
    endTime: seg.endAt ? toTimeInputValue(seg.endAt) : toTimeInputValue(seg.startAt),
  }
}

function startAddSegment() {
  editingSegment.value = null
  addingSegment.value = true
  const s = session.value
  const endTs = s?.endAt ?? s?.startAt ?? Date.now()
  editSegmentForm.value = {
    projectId: null,
    startDate: s ? toDateInputValue(s.startAt) : toDateInputValue(Date.now()),
    startTime: s ? toTimeInputValue(s.startAt) : toTimeInputValue(Date.now()),
    endDate: toDateInputValue(endTs),
    endTime: toTimeInputValue(endTs),
  }
}

function closeSegmentModal() {
  editingSegment.value = null
  addingSegment.value = false
}

function segmentsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

async function saveSegmentModal() {
  const form = editSegmentForm.value
  const startAt = fromDateAndTime(form.startDate, form.startTime)
  const endAt = fromDateAndTime(form.endDate, form.endTime)
  if (startAt == null) return
  const segEnd = endAt ?? startAt
  if (segEnd <= startAt) {
    showToast('结束须晚于开始')
    return
  }
  const sessionStart = session.value.startAt
  const sessionEnd = session.value.endAt ?? Infinity
  if (startAt < sessionStart || segEnd > sessionEnd) {
    showToast('须在记录时间范围内')
    return
  }
  const others = segments.value.filter((seg) => seg.id !== (editingSegment.value?.id ?? null))
  for (const seg of others) {
    const otherEnd = seg.endAt != null ? seg.endAt : sessionEnd
    if (segmentsOverlap(startAt, segEnd, seg.startAt, otherEnd)) {
      showToast('与同条记录内其他段重叠')
      return
    }
  }
  if (addingSegment.value && session.value) {
    await addSegment({
      sessionId: session.value.id,
      projectId: form.projectId || null,
      startAt,
      endAt: segEnd,
    })
    closeSegmentModal()
    await load()
    return
  }
  const seg = editingSegment.value
  if (!seg) return
  await updateSegment(seg.id, {
    projectId: form.projectId || null,
    startAt,
    endAt: segEnd,
  })
  closeSegmentModal()
  await load()
}

async function doDeleteSegment(seg) {
  if (!confirm('删除此时间段？')) return
  await deleteSegment(seg.id)
  await load()
  if (segments.value.length === 0 && session.value) {
    await deleteSession(session.value.id)
    router.push('/sessions')
  }
}

async function removeSession() {
  if (!confirm('删除整条记录？')) return
  await deleteSession(session.value.id)
  router.push('/sessions')
}
</script>

<style scoped>
.session-detail {
  padding: 0.5rem 0;
}

.header-actions {
  margin-bottom: 1rem;
}

.btn-ghost.danger {
  color: var(--danger);
}

.loading, .empty {
  color: var(--text-muted);
  margin: 1rem 0;
}

.session-meta {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.meta-row {
  margin-bottom: 0.75rem;
}

.meta-row label {
  display: block;
  font-size: var(--fs-caption);
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.meta-row input,
.select,
.modal input,
.modal .select {
  width: 100%;
  padding: 0.5rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: var(--fs-body);
}

.date-time-row {
  display: flex;
  gap: 0.5rem;
}

.date-time-row input {
  flex: 1;
}

.add-segment-btn {
  margin-top: 0.5rem;
  width: 100%;
  font-size: var(--fs-section-title);
  font-weight: 600;
  color: var(--accent);
  border: 2px solid var(--accent);
  background: rgba(124, 110, 246, 0.12);
}

.add-segment-btn:hover {
  background: rgba(124, 110, 246, 0.2);
}

.duration {
  margin: 0.75rem 0 0;
  font-size: var(--fs-body);
  color: var(--text-muted);
}

.note-block {
  width: 100%;
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

.segments-title {
  margin: 0 0 0.5rem;
  font-size: var(--fs-section-title);
  font-weight: 600;
  color: var(--text-muted);
}

.segments-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.segment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.5rem;
}

.segment-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.segment-project {
  font-weight: 500;
}

.segment-time {
  font-size: var(--fs-body-sm);
  color: var(--text-muted);
}

.segment-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  padding: 0.4rem 0.6rem;
  font-size: var(--fs-caption);
  color: var(--accent);
  min-height: var(--touch-min);
}

.btn-icon.danger {
  color: var(--danger);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1.25rem;
  width: 100%;
  max-width: 320px;
}

.modal h3 {
  margin: 0 0 1rem;
  font-size: var(--fs-section-title);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius);
  font-weight: 500;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-ghost {
  color: var(--text-muted);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--touch-min) + 1.25rem + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: var(--text);
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  font-size: var(--fs-caption);
  z-index: 200;
  max-width: 90%;
  text-align: center;
}
</style>
