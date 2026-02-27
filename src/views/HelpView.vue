<template>
  <div class="help">
    <h1 class="page-title">说明</h1>

    <section class="section">
      <h2 class="section-title">安装到手机主屏幕</h2>
      <p class="intro">
        极简时间记录: 原本为记录练琴时间开发, 只支持一个主项目, 可在计时中快速切换不同项目并统计各项目时长. 可以直接在浏览器中使用, 也支持安装为 PWA 离线使用, 数据仅存本地, 无需账号.
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
        <li>点右上角 ｢⋮｣ 菜单, 选择 ｢添加到主屏幕｣。</li>
        <li>在弹出的对话框中点 ｢安装｣，主屏幕会出现图标。</li>
        <li>部分 Chrome 版本也会在地址栏直接显示 ｢安装应用｣ 按钮, 点击后按提示安装即可。</li>
      </ol>
      <p class="tip">
        部分手机自带浏览器 (如小米浏览器) 仅支持添加书签快捷方式, 无法安装真正的独立应用; 建议使用 Chrome
        或支持 PWA 的浏览器进行安装。
      </p>
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

    <section class="section">
      <h2 class="section-title">备份与恢复</h2>
      <p class="tip">
        你可以将所有时间记录导出为 JSON 备份文件(目前仅部分浏览器支持导出), 保存到文件 App / 网盘或发给自己; 也可以从备份文件恢复数据。
      </p>
      <div class="backup-actions">
        <button type="button" class="btn" @click="onExport">
          导出数据
        </button>
        <button type="button" class="btn btn-secondary" @click="onImportClick">
          导入数据
        </button>
        <input
          ref="fileInputRef"
          class="file-input"
          type="file"
          accept=".json,application/json"
          @change="onFileChange"
        />
      </div>
      <p class="tip">
        导入会清空当前设备上本应用的所有记录, 并用备份文件内容完全替换; 此操作不可撤销, 请谨慎使用。
      </p>
    </section>

    <p class="version">v{{ version }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { exportViaShareOrDownload, importFromFile, hasActiveSession } from '../utils/backup.js'

const version = __APP_VERSION__

const fileInputRef = ref(null)

async function onExport() {
  const hasActive = await hasActiveSession()
  if (hasActive) {
    const ok = window.confirm('当前有未结束的记录, 本次导出不包含该记录, 是否继续?')
    if (!ok) return
  }
  try {
    await exportViaShareOrDownload()
    window.alert('已发起导出, 请在系统的分享或下载界面完成保存。')
  } catch (e) {
    window.alert('导出失败, 请稍后再试。')
  }
}

function onImportClick() {
  if (!fileInputRef.value) return
  fileInputRef.value.click()
}

async function onFileChange(event) {
  const input = event.target
  const [file] = input.files ?? []
  input.value = ''
  if (!file) return

  const ok = window.confirm(
    '导入会清空本地所有记录并用文件内容替换, 且无法恢复, 是否继续?',
  )
  if (!ok) return

  try {
    await importFromFile(file)
    window.alert('导入成功, 将重新加载页面。')
    window.location.reload()
  } catch (e) {
    const msg =
      e && typeof e.message === 'string'
        ? e.message
        : ''
    if (
      msg === 'INVALID_APP' ||
      msg === 'INVALID_VERSION' ||
      msg === 'INVALID_STRUCTURE' ||
      msg === 'INVALID_RELATIONS'
    ) {
      window.alert('导入失败: 备份文件格式不正确或已损坏, 请确认选择了正确的导出文件。')
    } else {
      window.alert('导入失败: 写入本地数据库时出现错误, 当前数据未被修改。')
    }
  }
}
</script>

<style scoped>
.help {
  padding: 0.5rem 0;
}

.page-title {
  margin: 0 0 1rem;
  font-size: var(--fs-page-title);
  font-weight: 700;
}

.section {
  margin-bottom: 1.5rem;
}

.section-title {
  margin: 0 0 0.5rem;
  font-size: var(--fs-section-title);
  font-weight: 700;
}

.intro,
.tip {
  margin: 0 0 0.5rem;
  font-size: var(--fs-body-sm);
}

.warning {
  margin: 0 0 0.5rem;
  font-size: var(--fs-body-sm);
  color: var(--danger);
}

.sub-title {
  margin: 0.75rem 0 0.25rem;
  font-size: var(--fs-body);
  font-weight: 600;
}

.steps {
  margin: 0 0 0.5rem 1.2rem;
  padding: 0;
  font-size: var(--fs-body-sm);
}

.steps li {
  margin-bottom: 0.25rem;
}

.list {
  margin: 0 0 0.5rem 1.2rem;
  padding: 0;
  font-size: var(--fs-body-sm);
}

.list li {
  margin-bottom: 0.25rem;
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius);
  font-size: var(--fs-body-sm);
  font-weight: 500;
  min-height: var(--touch-min);
  border: 1px solid var(--border);
  background: var(--accent);
  color: #fff;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.version {
  margin: 2rem 0 0;
  font-size: var(--fs-caption);
  color: var(--text-muted);
}
</style>

