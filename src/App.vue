<template>
  <div class="app">
    <div v-if="updateAvailable" class="update-banner">
      <span class="update-text">发现新版本, 点击更新以应用最新功能。</span>
      <div class="update-actions">
        <button type="button" class="update-btn" @click="refreshApp">
          立即更新
        </button>
        <button type="button" class="update-btn-secondary" @click="dismissUpdate">
          稍后
        </button>
      </div>
    </div>
    <main class="main">
      <RouterView />
    </main>
    <nav class="nav">
      <RouterLink to="/record" class="nav-link" active-class="active">计时</RouterLink>
      <RouterLink to="/sessions" class="nav-link" active-class="active">历史</RouterLink>
      <RouterLink to="/projects" class="nav-link" active-class="active">项目</RouterLink>
      <RouterLink to="/" class="nav-link" active-class="active">统计</RouterLink>
      <RouterLink to="/help" class="nav-link" active-class="active">说明</RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onPwaUpdateAvailable } from './pwa.js'

const updateAvailable = ref(false)
let updateSW = null
let stopListening = null

onMounted(() => {
  stopListening = onPwaUpdateAvailable((fn) => {
    updateSW = fn
    updateAvailable.value = true
  })
})

onUnmounted(() => {
  if (stopListening) {
    stopListening()
  }
})

async function refreshApp() {
  if (updateSW) {
    await updateSW(true)
  }
  window.location.reload()
}

function dismissUpdate() {
  updateAvailable.value = false
}
</script>

<style scoped>
.app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.main {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
  padding-bottom: calc(var(--touch-min) + 1rem + env(safe-area-inset-bottom, 0px));
}

.update-banner {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.update-text {
  font-size: var(--fs-body-sm);
}

.update-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.update-btn,
.update-btn-secondary {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: var(--fs-caption);
  min-height: 2rem;
}

.update-btn {
  background: var(--accent);
  color: #fff;
  border: none;
}

.update-btn-secondary {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: var(--touch-min);
  padding: 0.5rem;
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.nav-link {
  flex: 1;
  padding: 0.5rem 1rem;
  color: var(--text-muted);
  font-size: var(--fs-body);
  border-radius: var(--radius);
  min-height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-link.active {
  color: var(--accent);
}
</style>
