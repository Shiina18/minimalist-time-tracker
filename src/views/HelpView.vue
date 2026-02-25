<template>
  <div class="help">
    <h1 class="page-title">说明</h1>

    <section class="section">
      <h2 class="section-title">安装到手机主屏幕</h2>
      <p class="intro">
        推荐把本应用作为 PWA 安装到手机主屏幕, 像普通 App 一样使用。
      </p>

      <h3 class="sub-title">iPhone (Safari)</h3>
      <ol class="steps">
        <li>用 Safari 打开本应用。</li>
        <li>点底部的分享按钮 (向上箭头图标)。</li>
        <li>在菜单里选择 ｢添加到主屏幕｣。</li>
        <li>确认名称后点 ｢添加｣。</li>
      </ol>

      <h3 class="sub-title">安卓手机 (Chrome)</h3>
      <ol class="steps">
        <li>用 Chrome 打开本应用。</li>
        <li>等待地址栏出现 ｢安装应用｣, 或点右上角 ｢⋮｣ 菜单。</li>
        <li>选择 ｢安装应用｣ 或 ｢添加到主屏幕｣。</li>
        <li>确认后主屏幕会出现图标, 之后从图标进入即可全屏使用。</li>
      </ol>
    </section>

    <section class="section">
      <h2 class="section-title">清除数据</h2>
      <p class="tip">所有数据都只保存在你当前浏览器的本地存储里。</p>
      <ul class="list">
        <li>
          <strong>在浏览器里使用</strong>:
          打开浏览器设置 → 找到 ｢网站设置 / 隐私｣ → 选中当前站点 → 清除数据 / 存储。
        </li>
        <li>
          <strong>已安装到主屏幕</strong>:
          像删除普通 App 一样长按图标删除该应用; 之后重新打开网址时就是一份全新的数据。
        </li>
      </ul>
      <p class="warning">注意: 清除数据后无法恢复, 请在确认不再需要这些记录时再操作。</p>
    </section>

    <p class="version">v{{ version }}</p>
  </div>
</template>

<script setup>
const version = __APP_VERSION__
</script>

<style scoped>
.help {
  padding: 0.5rem 0;
}

.page-title {
  margin: 0 0 1rem;
  font-size: 1.35rem;
  font-weight: 600;
}

.section {
  margin-bottom: 1.5rem;
}

.section-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-muted);
}

.intro,
.tip,
.warning {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.sub-title {
  margin: 0.75rem 0 0.25rem;
  font-size: 0.9rem;
}

.steps {
  margin: 0 0 0.5rem 1.2rem;
  padding: 0;
  font-size: 0.9rem;
}

.steps li {
  margin-bottom: 0.25rem;
}

.list {
  margin: 0 0 0.5rem 1.2rem;
  padding: 0;
  font-size: 0.9rem;
}

.list li {
  margin-bottom: 0.25rem;
}

.version {
  margin: 2rem 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.warning {
  color: var(--danger);
}
</style>

