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
        <input v-model="newDefaultStart" type="checkbox" />
        <span>设为默认起始项目</span>
      </label>
    </div>
    <section class="section">
      <h2 class="section-title">进行中</h2>
      <ul class="list">
        <li v-for="p in unarchived" :key="p.id" class="list-item">
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
          <input v-model="editDefaultStart" type="checkbox" />
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

const unarchived = computed(() => projects.value.filter((p) => !p.archived))
const archived = computed(() => projects.value.filter((p) => p.archived))

async function load() {
  projects.value = await getAllProjects()
}

async function addOne() {
  const name = newName.value.trim()
  if (!name) return
  await addProject({ name, archived: false, defaultStart: newDefaultStart.value })
  newName.value = ''
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

onMounted(load)
</script>

<style scoped>
.projects {
  padding: 0.5rem 0;
}

.page-title {
  margin: 0 0 1rem;
  font-size: 1.35rem;
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
  font-size: 0.9rem;
  color: var(--text-muted);
  cursor: pointer;
}

.checkbox-label input {
  width: 1.1rem;
  height: 1.1rem;
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
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-toggle {
  font-size: 0.8rem;
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

.item-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-icon {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  color: var(--accent);
  min-height: var(--touch-min);
}

.btn-icon.danger {
  color: var(--danger);
}

.list-empty {
  padding: 1rem;
  color: var(--text-muted);
  font-size: 0.95rem;
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
  font-size: 1.1rem;
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
