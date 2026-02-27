<template>
  <div class="projects">
    <h1 class="page-title">项目</h1>
    <div class="add-row">
      <input
        v-model="newName"
        type="text"
        placeholder="新建项目"
        class="add-input"
        @keydown.enter="addOne"
      />
      <button type="button" class="btn btn-primary" :disabled="!newName.trim()" @click="addOne">
        添加
      </button>
    </div>
    <div class="default-start-row">
      <label class="checkbox-label">
        <input v-model="newDefaultStart" type="checkbox" class="app-checkbox" />
        <span>设为默认起始项目</span>
      </label>
    </div>
    <section class="section">
      <h2 class="section-title">进行中</h2>
      <ul class="list">
        <li
          v-for="(p, index) in unarchived"
          :key="p.id"
          class="list-item"
          draggable="true"
          @dragstart="onDragStart(index, $event)"
          @dragend="onDragEnd"
          @dragover.prevent="onDragOver($event)"
          @drop="onDrop(index)"
        >
          <span class="drag-handle" aria-hidden="true">☰</span>
          <span class="item-name">{{ p.name }}</span>
          <div class="item-actions">
            <button type="button" class="btn-icon" title="编辑" @click="startEdit(p)">编辑</button>
            <button type="button" class="btn-icon" title="归档" @click="toggleArchive(p)">归档</button>
            <button type="button" class="btn-icon danger" title="删除" @click="remove(p)">删除</button>
          </div>
        </li>
        <li v-if="unarchived.length === 0" class="list-empty">暂无</li>
      </ul>
    </section>
    <section class="section">
      <h2 class="section-title" @click="archivedOpen = !archivedOpen">
        已归档
        <span class="section-toggle">{{ archivedOpen ? '▼' : '▶' }}</span>
      </h2>
      <ul v-show="archivedOpen" class="list">
        <li v-for="p in archived" :key="p.id" class="list-item">
          <span class="item-name">{{ p.name }}</span>
          <div class="item-actions">
            <button type="button" class="btn-icon" @click="toggleArchive(p)">取消归档</button>
            <button type="button" class="btn-icon danger" @click="remove(p)">删除</button>
          </div>
        </li>
        <li v-if="archived.length === 0" class="list-empty">暂无</li>
      </ul>
    </section>
    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal">
        <h3>重命名</h3>
        <input v-model="editName" type="text" class="add-input" @keydown.enter="saveEdit" />
        <label class="checkbox-label modal-checkbox">
          <input v-model="editDefaultStart" type="checkbox" class="app-checkbox" />
          <span>设为默认起始项目</span>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="editing = null">取消</button>
          <button type="button" class="btn btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getAllProjects,
  addProject,
  updateProject,
  deleteProject,
} from '../db/index.js'

const projects = ref([])
const newName = ref('')
const newDefaultStart = ref(false)
const archivedOpen = ref(false)
const editing = ref(null)
const editName = ref('')
const editDefaultStart = ref(false)
const draggingIndex = ref(null)

function sortByUpdatedDesc(list) {
  return [...list].sort((a, b) => {
    const aTs = a.updatedAt ?? a.createdAt ?? 0
    const bTs = b.updatedAt ?? b.createdAt ?? 0
    return bTs - aTs
  })
}

const unarchived = computed(() => {
  const items = projects.value.filter((p) => !p.archived)
  if (items.length === 0) return items
  const byTime = sortByUpdatedDesc(items)
  const indexById = new Map(byTime.map((p, idx) => [p.id, idx]))
  return [...items].sort((a, b) => {
    const aKey = a.manualOrder ?? indexById.get(a.id) ?? 0
    const bKey = b.manualOrder ?? indexById.get(b.id) ?? 0
    return aKey - bKey
  })
})

const archived = computed(() => {
  const items = projects.value.filter((p) => p.archived)
  return sortByUpdatedDesc(items)
})

async function load() {
  projects.value = await getAllProjects()
}

async function addOne() {
  const name = newName.value.trim()
  if (!name) return
  await addProject({ name, archived: false, defaultStart: newDefaultStart.value })
  newName.value = ''
  newDefaultStart.value = false
  await load()
}

function startEdit(p) {
  editing.value = p
  editName.value = p.name
  editDefaultStart.value = p.defaultStart === true
}

async function saveEdit() {
  if (!editing.value) return
  const name = editName.value.trim()
  if (!name) return
  await updateProject(editing.value.id, { name, defaultStart: editDefaultStart.value })
  editing.value = null
  await load()
}

async function toggleArchive(p) {
  await updateProject(p.id, { archived: !p.archived })
  await load()
}

async function remove(p) {
  if (!confirm(`删除「${p.name}」？历史记录中的总时长不受影响。`)) return
  await deleteProject(p.id)
  await load()
}

function onDragStart(index, event) {
  draggingIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragEnd() {
  draggingIndex.value = null
}

function onDragOver(event) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

async function onDrop(targetIndex) {
  const from = draggingIndex.value
  if (from == null || from === targetIndex) {
    draggingIndex.value = null
    return
  }
  const ordered = [...unarchived.value]
  const [moved] = ordered.splice(from, 1)
  ordered.splice(targetIndex, 0, moved)
  draggingIndex.value = null
  await Promise.all(
    ordered.map((p, idx) => updateProject(p.id, { manualOrder: idx + 1 })),
  )
  await load()
}

onMounted(load)
</script>

<style scoped>
.projects {
  padding: 0.5rem 0;
}

.page-title {
  margin: 0 0 1rem;
  font-size: var(--fs-page-title);
  font-weight: 600;
}

.add-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.default-start-row {
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-body-sm);
  color: var(--text-muted);
  cursor: pointer;
}

.modal-checkbox {
  margin-bottom: 1rem;
}

.add-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
}

.section {
  margin-bottom: 1.5rem;
}

.section-title {
  margin: 0 0 0.5rem;
  font-size: var(--fs-section-title);
  font-weight: 600;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-toggle {
  font-size: var(--fs-caption);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  gap: 0.5rem;
}

.list-item:last-child {
  border-bottom: none;
}

.item-name {
  flex: 1;
  min-width: 0;
}

.drag-handle {
  width: 1.25rem;
  text-align: center;
  color: var(--text-muted);
  cursor: grab;
  user-select: none;
}

.list-item:active .drag-handle {
  cursor: grabbing;
}

.item-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
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

.list-empty {
  padding: 1rem;
  color: var(--text-muted);
  font-size: var(--fs-body);
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

.modal .add-input {
  width: 100%;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
