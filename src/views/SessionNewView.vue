<template>
  <div class="session-new">
    <h1 class="page-title">添加记录</h1>
    <div class="form-section">
      <div class="meta-row">
        <label>开始时间</label>
        <input v-model="startAtLocal" type="datetime-local" class="input" />
      </div>
      <div class="meta-row">
        <label>结束时间</label>
        <input v-model="endAtLocal" type="datetime-local" class="input" />
      </div>
    </div>
    <h2 class="section-title">时间段（可选）</h2>
    <p class="hint">不填则整段记为未归类；可添加多段并指定子项目。</p>
    <ul class="segments-edit">
      <li v-for="(seg, i) in segmentRows" :key="i" class="segment-row">
        <select v-model="seg.projectId" class="input select">
          <option :value="null">（无）</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <input v-model="seg.startLocal" type="datetime-local" class="input" />
        <input v-model="seg.endLocal" type="datetime-local" class="input" />
        <button type="button" class="btn-icon danger" @click="segmentRows.splice(i, 1)">删除</button>
      </li>
    </ul>
    <button type="button" class="btn add-segment-btn" @click="addSegmentRow">+ 添加时间段</button>
    <div class="form-actions">
      <RouterLink to="/sessions" class="btn btn-ghost">取消</RouterLink>
      <button type="button" class="btn btn-primary" :disabled="!canSave" @click="save">保存</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { addSession, addSegment, getProjects } from '../db/index.js'

const router = useRouter()
const projects = ref([])
const startAtLocal = ref('')
const endAtLocal = ref('')
const segmentRows = ref([])

const canSave = computed(() => {
  const start = toTs(startAtLocal.value)
  const end = toTs(endAtLocal.value)
  return start != null && end != null && start < end
})

function toTs(local) {
  if (!local) return null
  return new Date(local).getTime()
}

function addSegmentRow() {
  segmentRows.value.push({ projectId: null, startLocal: startAtLocal.value, endLocal: endAtLocal.value })
}

async function save() {
  const startAt = toTs(startAtLocal.value)
  const endAt = toTs(endAtLocal.value)
  if (startAt == null || endAt == null || startAt >= endAt) return
  if (segmentRows.value.length > 0) {
    for (const row of segmentRows.value) {
      const segStart = toTs(row.startLocal)
      const segEnd = toTs(row.endLocal)
      if (segStart == null || segEnd == null) continue
      if (segStart > segEnd) {
        alert('时间段的开始须早于或等于结束')
        return
      }
      if (segStart < startAt || segEnd > endAt) {
        alert('时间段须在记录的开始与结束时间范围内')
        return
      }
    }
  }
  const session = await addSession({ startAt, endAt })
  if (segmentRows.value.length === 0) {
    await addSegment({ sessionId: session.id, projectId: null, startAt, endAt })
  } else {
    for (const row of segmentRows.value) {
      const segStart = toTs(row.startLocal)
      const segEnd = toTs(row.endLocal)
      if (segStart != null && segEnd != null && segStart <= segEnd) {
        await addSegment({
          sessionId: session.id,
          projectId: row.projectId || null,
          startAt: segStart,
          endAt: segEnd,
        })
      }
    }
  }
  router.push('/sessions')
}

onMounted(async () => {
  projects.value = await getProjects(false)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  endAtLocal.value = `${today}T${time}`
  const start = new Date(now.getTime() - 30 * 60 * 1000)
  startAtLocal.value = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`
})
</script>

<style scoped>
.session-new {
  padding: 0.5rem 0;
}

.page-title {
  margin: 0 0 1rem;
  font-size: 1.35rem;
  font-weight: 600;
}

.form-section {
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
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.input {
  width: 100%;
  padding: 0.6rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
}

.select {
  max-width: 140px;
}

.section-title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
}

.hint {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.segments-edit {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
}

.segment-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.segment-row .input {
  flex: 1;
  min-width: 0;
}

.segment-row .select {
  flex: 0 0 100px;
}

.btn-icon.danger {
  color: var(--danger);
  padding: 0.5rem;
}

.add-segment-btn {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  width: 100%;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--accent);
  border: 2px solid var(--accent);
  background: rgba(124, 110, 246, 0.12);
}

.add-segment-btn:hover {
  background: rgba(124, 110, 246, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  color: var(--text-muted);
}
</style>
