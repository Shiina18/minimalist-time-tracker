<template>
  <div class="app">
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
  font-size: 0.95rem;
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
