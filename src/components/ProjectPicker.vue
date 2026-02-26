<template>
  <div v-if="open" class="picker-overlay" @click.self="emit('close')">
    <div class="picker">
      <h3 class="picker-title">选择项目</h3>
      <div class="picker-new">
        <input
          v-model="newName"
          type="text"
          placeholder="新建并开始"
          class="picker-input"
          @keydown.enter="createAndStart"
        />
        <button type="button" class="btn btn-primary" :disabled="!newName.trim()" @click="createAndStart">
          新建
        </button>
      </div>
      <label class="picker-default-start">
        <input v-model="newDefaultStart" type="checkbox" class="app-checkbox" />
        <span>设为默认起始项目</span>
      </label>
      <ul class="picker-list">
        <li v-for="p in projects" :key="p.id" class="picker-item">
          <button type="button" class="picker-item-btn" @click="emit('select', p)">
            {{ p.name }}
          </button>
        </li>
        <li v-if="projects.length === 0 && !newName" class="picker-empty">暂无项目</li>
      </ul>
      <button type="button" class="btn btn-ghost picker-close" @click="emit('close')">取消</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getProjects, addProject } from '../db/index.js'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'select'])

const projects = ref([])
const newName = ref('')
const newDefaultStart = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      load()
      newDefaultStart.value = false
    }
  },
)

async function load() {
  const all = await getProjects(false)
  projects.value = all
}

async function createAndStart() {
  const name = newName.value.trim()
  if (!name) return
  const project = await addProject({ name, archived: false, defaultStart: newDefaultStart.value })
  newName.value = ''
  newDefaultStart.value = false
  emit('select', project)
  /* 不 emit('close')：父组件 onSelectProject 会关选择器；若也 emit('close') 会触发 onClosePicker，把当前项目误置为未归类 */
}
</script>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 0;
}

.picker {
  background: var(--surface);
  border-radius: var(--radius) var(--radius) 0 0;
  width: 100%;
  max-width: 400px;
  max-height: 70vh;
  overflow: auto;
  padding: 1.25rem;
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
}

.picker-title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.picker-new {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.picker-default-start {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  cursor: pointer;
  margin-bottom: 1rem;
}

.picker-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
}

.picker-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.picker-item {
  border-bottom: 1px solid var(--border);
}

.picker-item-btn {
  width: 100%;
  padding: 1rem;
  text-align: left;
  color: var(--text);
  font-size: 1rem;
  min-height: var(--touch-min);
}

.picker-empty {
  padding: 1rem;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.picker-close {
  width: 100%;
  margin-top: 1rem;
  min-height: var(--touch-min);
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
