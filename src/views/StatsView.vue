<template>
  <div class="stats">
    <h1 class="page-title">统计</h1>
    <div class="stats-tabs">
      <button
        type="button"
        class="tab"
        :class="{ active: tab === 'week' }"
        @click="tab = 'week'"
      >
        周度
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: tab === 'month' }"
        @click="tab = 'month'"
      >
        月度
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: tab === 'year' }"
        @click="tab = 'year'"
      >
        年度
      </button>
    </div>

    <template v-if="tab === 'week'">
      <div class="week-range">
        <label class="range-label">
          <span class="range-label-text">开始日期</span>
          <input
            v-model="weekStartStr"
            type="date"
            class="range-input"
            :max="todayStr"
          />
        </label>
        <label class="range-label">
          <span class="range-label-text">结束日期</span>
          <input
            v-model="weekEndStr"
            type="date"
            class="range-input"
            :max="todayStr"
          />
        </label>
      </div>
      <p class="week-label">{{ weekRangeLabel }}</p>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ weekRecordDays }}</span>
          <span class="stat-label"> 记录天数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formatDurationShort(weekAvgPerDayMs) }}</span>
          <span class="stat-label"> 平均每天</span>
        </div>
        <div class="stat-item stat-item-total">
          <span class="stat-value">{{ formatDurationShort(weekTotalMs) }}</span>
          <span class="stat-label"> 总时长</span>
        </div>
      </div>
      <section class="week-chart-section heatmap-section">
        <div v-if="weekChartLegendItems.length > 0" class="week-chart-legend">
          <span
            v-for="item in weekChartLegendItems"
            :key="item.projectId"
            class="week-legend-item"
          >
            <span
              class="week-legend-swatch"
              :style="{ background: item.color }"
            />
            <span class="week-legend-name">{{ item.name }}</span>
          </span>
        </div>
        <div class="week-chart">
          <div
            v-for="day in weekDayCells"
            :key="day.key"
            class="week-chart-day"
          >
            <div class="week-chart-bar-cell">
              <div
                class="week-chart-bar-wrap"
                :style="{
                  height: weekBarHeight(day) + 'px',
                }"
              >
                <div
                  v-for="p in weekChartSegments(day)"
                  :key="p.projectId"
                  class="week-chart-bar-seg"
                  :style="{
                    height: day.ms ? (p.ms / day.ms) * 100 + '%' : 0,
                    minHeight: p.ms > 0 ? weekSegMinHeight(day, weekChartSegments(day).length) + 'px' : undefined,
                    background: weekProjectColors[weekChartColorIndex(p.projectId)] ?? weekProjectColors[0],
                  }"
                  :title="p.ms > 0 ? formatDurationMinutes(p.ms) + ' ' + p.name : undefined"
                >
                  <span v-if="p.ms > 0 && weekSegMinHeight(day, weekChartSegments(day).length) >= 10" class="week-chart-seg-text">{{ formatDurationMinutes(p.ms) }}</span>
                </div>
              </div>
              <span v-if="day.ms > 0" class="week-chart-duration">{{ formatDurationMinutes(day.ms) }}</span>
            </div>
            <span class="week-chart-label">{{ day.label }}</span>
          </div>
        </div>
        <div v-if="weekProjectTotals.length > 0" class="week-project-totals">
          <h2 class="section-title">各项目总时长</h2>
          <div class="week-project-bars">
            <div
              v-for="item in weekProjectTotalsWithPercent"
              :key="item.projectId"
              class="week-project-row"
            >
              <div class="week-project-info">
                <span class="week-project-name">{{ item.name }}</span>
                <span class="week-project-meta">
                  <span class="week-project-duration">{{ formatDuration(item.ms) }}</span>
                  <span v-if="item.percent != null" class="week-project-percent">{{ item.percent }}%</span>
                </span>
              </div>
              <div class="week-project-bar-wrap">
                <div
                  class="week-project-bar"
                  :style="{
                    width: weekTotalMs ? (item.ms / weekTotalMs) * 100 + '%' : 0,
                    background: weekProjectColors[weekProjectColorIndex(item.projectId)] ?? weekProjectColors[0],
                  }"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-if="weekNotesEntries.length > 0" class="week-notes">
          <h2 class="section-title">备注</h2>
          <div class="week-notes-list">
            <template v-for="entry in weekNotesEntries" :key="entry.sessionId">
              <div class="week-notes-date">{{ entry.date }}</div>
              <div class="week-notes-text">{{ entry.note }}</div>
            </template>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="tab === 'month'">
      <div class="month-header">
        <button
          type="button"
          class="nav-btn"
          :disabled="!canPrevMonth"
          :aria-disabled="!canPrevMonth"
          @click="goPrevMonth"
        >
          上一月
        </button>
        <p class="month-label">{{ monthLabel }}</p>
        <button
          type="button"
          class="nav-btn"
          :disabled="!canNextMonth"
          :aria-disabled="!canNextMonth"
          @click="goNextMonth"
        >
          下一月
        </button>
      </div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ recordDays }}</span>
          <span class="stat-label"> 记录天数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formatDurationShort(monthAvgPerDayMs) }}</span>
          <span class="stat-label"> 平均每天</span>
        </div>
        <div class="stat-item stat-item-total">
          <span class="stat-value">{{ formatDurationShort(totalMs) }}</span>
          <span class="stat-label"> 总时长</span>
        </div>
      </div>
      <section class="month-heatmap heatmap-section">
        <div class="calendar-grid">
          <div v-for="w in weekdays" :key="w" class="calendar-cell calendar-head">{{ w }}</div>
          <template v-for="(cell, i) in monthCalendarCells" :key="i">
            <div
              v-if="cell.empty"
              class="calendar-cell calendar-empty"
            />
            <div
              v-else
              class="calendar-cell calendar-day"
              :class="heatClass(cell.ms)"
            >
              <span class="cell-day">{{ cell.day }}</span>
              <span v-if="cell.ms > 0" class="cell-duration">{{ formatDurationShort(cell.ms) }}</span>
            </div>
          </template>
        </div>
      </section>
      <section v-if="byProject.length > 0" class="by-project">
        <h2 class="section-title">按项目</h2>
        <div class="project-bars">
          <div
            v-for="item in byProject"
            :key="item.projectId"
            class="project-row"
          >
            <div class="project-info">
              <span class="project-name">{{ item.name }}</span>
              <span class="project-duration">{{ formatDuration(item.ms) }}</span>
            </div>
            <div class="project-bar-wrap">
              <div
                class="project-bar"
                :style="{ width: totalMs ? (item.ms / totalMs) * 100 + '%' : 0 }"
              />
            </div>
          </div>
        </div>
      </section>
      <p v-else class="empty">暂无项目分布</p>
    </template>

    <template v-else>
      <div class="year-header year-header-nav">
        <button
          type="button"
          class="nav-btn"
          :disabled="!canPrevYear"
          :aria-disabled="!canPrevYear"
          @click="goPrevYear"
        >
          上一年
        </button>
        <p class="year-label">{{ selectedYear }} 年</p>
        <button
          type="button"
          class="nav-btn"
          :disabled="!canNextYear"
          :aria-disabled="!canNextYear"
          @click="goNextYear"
        >
          下一年
        </button>
      </div>
      <div class="stats-row year-stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ yearRecordDays }}</span>
          <span class="stat-label"> 记录天数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formatDurationShort(yearAvgPerWeekMs) }}</span>
          <span class="stat-label"> 平均每周</span>
        </div>
        <div class="stat-item stat-item-total">
          <span class="stat-value">{{ formatDurationShort(yearTotalMs) }}</span>
          <span class="stat-label"> 总时长</span>
        </div>
      </div>
      <section class="year-heatmap heatmap-section">
        <div class="year-grid">
          <div v-for="row in yearRows" :key="row.month" class="year-row">
            <span class="year-month-label">{{ row.month }} 月</span>
            <div class="year-days">
              <div
                v-for="(cell, di) in row.days"
                :key="di"
                class="year-cell"
                :class="[heatClass(cell.ms), { empty: cell.empty }]"
              />
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAllSessions, getSegmentsBySessionId, getAllProjects } from '../db/index.js'
import { formatDate, formatDuration, formatDurationShort, formatDurationMinutes } from '../utils/format.js'
import {
  aggregateMsByDayFromSegments,
  getMonthBounds,
  getYearBounds,
  getLast7DaysBounds,
  getRangeBounds,
} from '../utils/stats.js'
import { toDateInputValue } from '../utils/datetime.js'

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

const tab = ref('week')

const weekStartStr = ref('')
const weekEndStr = ref('')

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth())

const sessions = ref([])
const projects = ref([])
const sessionSegments = ref(new Map())

const now = computed(() => new Date())
const currentYear = computed(() => now.value.getFullYear())
const currentMonth = computed(() => now.value.getMonth())

const todayStr = computed(() => toDateInputValue(Date.now()))

const weekBounds = computed(() => {
  const s = weekStartStr.value
  const e = weekEndStr.value
  if (s && e && s <= e) {
    return getRangeBounds(s, e)
  }
  return getLast7DaysBounds()
})

const dailyByWeek = computed(() => {
  const { start, end } = weekBounds.value
  return aggregateMsByDayFromSegments(
    sessions.value,
    sessionSegments.value,
    start,
    end,
    Date.now(),
  )
})

const weekRecordDays = computed(() =>
  Object.values(dailyByWeek.value).filter((ms) => ms > 0).length,
)
const weekTotalMs = computed(() =>
  Object.values(dailyByWeek.value).reduce((a, b) => a + b, 0),
)

const weekRangeDays = computed(() => weekDayCells.value.length)

const weekAvgPerDayMs = computed(() => {
  const n = weekRangeDays.value
  return n > 0 ? Math.round(weekTotalMs.value / n) : 0
})

function aggregateByProjectInRange(rangeStart, rangeEnd, nowTs) {
  const projectIds = new Set(projects.value.map((p) => p.id))
  const map = new Map()
  const add = (id, name, ms) => {
    if (!map.has(id)) map.set(id, { projectId: id, name, ms: 0 })
    map.get(id).ms += ms
  }
  for (const s of sessions.value) {
    const segments = sessionSegments.value.get(s.id) ?? []
    for (const seg of segments) {
      if (seg.projectId && projectIds.has(seg.projectId)) {
        const segStart = Math.max(seg.startAt, rangeStart)
        const segEnd =
          seg.endAt != null
            ? Math.min(seg.endAt, rangeEnd)
            : Math.min(rangeEnd, nowTs)
        if (segEnd > segStart) {
          const name =
            projects.value.find((p) => p.id === seg.projectId)?.name ?? seg.projectId
          add(seg.projectId, name, segEnd - segStart)
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.ms - a.ms)
}

const weekProjectColors = [
  'rgba(124, 110, 246, 0.85)', // 紫
  'rgba(34, 197, 94, 0.75)', // 绿
  'rgba(234, 179, 8, 0.75)', // 黄
  'rgba(236, 72, 153, 0.75)', // 粉
  'rgba(20, 184, 166, 0.75)', // 青
  'rgba(59, 130, 246, 0.8)', // 蓝
  'rgba(244, 114, 182, 0.8)', // 亮粉
  'rgba(248, 113, 113, 0.8)', // 红
  'rgba(139, 92, 246, 0.8)', // 靛
  'rgba(34, 197, 178, 0.8)', // 蓝绿
  'rgba(251, 146, 60, 0.8)', // 橙
  'rgba(163, 163, 163, 0.9)', // 灰（其他）
]

/** 柱内最多显示的项目数，其余合并为「其他」；3–6 段为常见最佳实践 */
const WEEK_CHART_TOP_N = 6

const weekDayCells = computed(() => {
  const { start, end } = weekBounds.value
  const daily = dailyByWeek.value
  const nowTs = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const cells = []
  for (let t = start; t <= end; t += dayMs) {
    const d = new Date(t)
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate())
    const dayStart = t
    const dayEnd = t + dayMs - 1
    let byProject = aggregateByProjectInRange(dayStart, dayEnd, nowTs)
    const ms = daily[key] ?? 0
    const sumByProject = byProject.reduce((a, p) => a + p.ms, 0)
    if (ms > sumByProject && ms > 0) {
      byProject = [...byProject, { projectId: '__uncategorized', name: '未归类', ms: ms - sumByProject }]
    }
    const label = `${d.getMonth() + 1} 月 ${d.getDate()} 日`
    cells.push({ key, label, ms, byProject })
  }
  return cells
})

const weekMaxMs = computed(() => {
  const cells = weekDayCells.value
  return cells.length ? Math.max(...cells.map((c) => c.ms), 1) : 1
})

/** 单柱高度：只按当天时长相对 weekMaxMs 比例，所有天同一 scale（基准 80px） */
function weekBarHeight(day) {
  if (!weekMaxMs.value || !day.ms) return 0
  return Math.round((day.ms / weekMaxMs.value) * 80)
}

/** 单段最小高度：在该柱高度内能容纳 n 段；最多 14px，多项目时按 barHeight/n 缩小，保证不溢出 */
function weekSegMinHeight(day, segmentCount) {
  const barH = weekBarHeight(day)
  const n = segmentCount ?? day.byProject?.length ?? 0
  if (n === 0) return 0
  const fit = barH / n
  return Math.min(14, Math.max(2, Math.floor(fit)))
}

const weekProjectOrder = computed(() => {
  const order = []
  const seen = new Set()
  for (const cell of weekDayCells.value) {
    for (const p of cell.byProject) {
      if (!seen.has(p.projectId)) {
        seen.add(p.projectId)
        order.push(p.projectId)
      }
    }
  }
  return order
})

function weekProjectColorIndex(projectId) {
  const idx = weekProjectOrder.value.indexOf(projectId)
  return idx >= 0 ? idx % weekProjectColors.length : 0
}

/** 柱状图内 segment 颜色：与 weekChartLegendItems 顺序一致 */
function weekChartColorIndex(projectId) {
  const idx = weekChartLegendItems.value.findIndex((item) => item.projectId === projectId)
  return idx >= 0 ? idx % weekProjectColors.length : 0
}

const weekLegendItems = computed(() => {
  return weekProjectOrder.value.map((projectId) => {
    const cell = weekDayCells.value.find((c) =>
      c.byProject.some((p) => p.projectId === projectId),
    )
    const p = cell?.byProject.find((x) => x.projectId === projectId)
    return {
      projectId,
      name: p?.name ?? projectId,
      color: weekProjectColors[weekProjectColorIndex(projectId)] ?? weekProjectColors[0],
    }
  })
})

const weekProjectTotals = computed(() => {
  const map = new Map()
  for (const cell of weekDayCells.value) {
    for (const p of cell.byProject) {
      const cur = map.get(p.projectId)
      const name = cur?.name ?? p.name
      map.set(p.projectId, { projectId: p.projectId, name, ms: (cur?.ms ?? 0) + p.ms })
    }
  }
  return [...map.values()].sort((a, b) => b.ms - a.ms)
})

/** 周内按总时长排序的 Top N 项目 id，柱状图与图例只显示这些 + 其他 */
const weekTopProjectIds = computed(() =>
  weekProjectTotals.value.slice(0, WEEK_CHART_TOP_N).map((p) => p.projectId),
)

/** 柱状图图例：Top N + 其他（仅当本周有「其他」时显示） */
const weekChartLegendItems = computed(() => {
  const top = weekTopProjectIds.value.map((id) => {
    const t = weekProjectTotals.value.find((p) => p.projectId === id)
    return {
      projectId: id,
      name: t?.name ?? id,
      color: weekProjectColors[weekProjectColorIndex(id)] ?? weekProjectColors[0],
    }
  })
  const hasOther = weekDayCells.value.some((day) => {
    const topMs = weekTopProjectIds.value.reduce(
      (sum, id) => sum + (day.byProject.find((p) => p.projectId === id)?.ms ?? 0),
      0,
    )
    return day.ms > topMs
  })
  if (!hasOther) return top
  return [
    ...top,
    { projectId: '__other', name: '其他', color: weekProjectColors[weekProjectColors.length - 1] },
  ]
})

/** 单日柱内显示的 segment：Top N（按周总时长顺序，仅含当日有时长的）+ 其他。保证每柱最多 N+1 段。 */
function weekChartSegments(day) {
  const topIds = weekTopProjectIds.value
  const segments = topIds
    .map((id) => day.byProject.find((p) => p.projectId === id))
    .filter((p) => p && p.ms > 0)
  const topMs = segments.reduce((a, p) => a + p.ms, 0)
  const otherMs = day.ms - topMs
  if (otherMs > 0) {
    segments.push({ projectId: '__other', name: '其他', ms: otherMs })
  }
  return segments
}

const weekProjectTotalsWithPercent = computed(() => {
  const total = weekTotalMs.value
  return weekProjectTotals.value.map((item) => ({
    ...item,
    percent: total > 0 ? Math.round((item.ms / total) * 100) : null,
  }))
})

/** 周范围内有备注的 session，按 startAt 时间顺序 */
const weekNotesEntries = computed(() => {
  const { start, end } = weekBounds.value
  return sessions.value
    .filter((s) => s.startAt >= start && s.startAt <= end && (s.note?.trim() ?? '').length > 0)
    .sort((a, b) => a.startAt - b.startAt)
    .map((s) => ({ sessionId: s.id, date: formatDate(s.startAt), note: (s.note ?? '').trim() }))
})

const weekRangeLabel = computed(() => {
  const { start, end } = weekBounds.value
  const a = new Date(start)
  const b = new Date(end)
  return `${a.getFullYear()} 年 ${a.getMonth() + 1} 月 ${a.getDate()} 日 — ${b.getMonth() + 1} 月 ${b.getDate()} 日`
})

const monthBounds = computed(() =>
  getMonthBounds(selectedYear.value, selectedMonth.value),
)
const yearBounds = computed(() => {
  const y = selectedYear.value
  const endDay =
    y === currentYear.value
      ? now.value.getTime()
      : new Date(y, 11, 31, 23, 59, 59, 999).getTime()
  return getYearBounds(y, endDay)
})

const dailyByMonth = computed(() => {
  const { start, end } = monthBounds.value
  return aggregateMsByDayFromSegments(
    sessions.value,
    sessionSegments.value,
    start,
    end,
    Date.now(),
  )
})

const dailyByYear = computed(() => {
  const { start, end } = yearBounds.value
  return aggregateMsByDayFromSegments(
    sessions.value,
    sessionSegments.value,
    start,
    end,
    Date.now(),
  )
})

const totalMs = computed(() => {
  return Object.values(dailyByMonth.value).reduce((a, b) => a + b, 0)
})

const recordDays = computed(() => {
  return Object.values(dailyByMonth.value).filter((ms) => ms > 0).length
})

/** 该月第一次有记录的日期（YYYY-MM-DD），无记录为 null */
const monthFirstRecordDateKey = computed(() => {
  const daily = dailyByMonth.value
  const keys = Object.entries(daily)
    .filter(([, ms]) => ms > 0)
    .map(([k]) => k)
  return keys.length ? keys.sort()[0] : null
})

/** 平均每天的分母：从该月第一次有记录日期到今日的天数（至少 1） */
const monthAvgPerDayDenom = computed(() => {
  const firstKey = monthFirstRecordDateKey.value
  if (!firstKey) return 0
  const [y, m, d] = firstKey.split('-').map(Number)
  const start = new Date(y, m - 1, d).getTime()
  const end = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate(), 23, 59, 59, 999).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  return Math.max(1, Math.ceil((end - start) / dayMs))
})

const monthAvgPerDayMs = computed(() => {
  const n = monthAvgPerDayDenom.value
  return n > 0 ? Math.round(totalMs.value / n) : 0
})

const yearTotalMs = computed(() => {
  return Object.values(dailyByYear.value).reduce((a, b) => a + b, 0)
})

const yearRecordDays = computed(() => {
  return Object.values(dailyByYear.value).filter((ms) => ms > 0).length
})

const monthLabel = computed(() => {
  const m = selectedMonth.value + 1
  return `${selectedYear.value} 年 ${m} 月`
})

const earliestRecord = computed(() => {
  const list = sessions.value
  if (!list.length) return null
  const minTs = Math.min(...list.map((s) => s.startAt))
  const d = new Date(minTs)
  return { year: d.getFullYear(), month: d.getMonth() }
})

const canPrevMonth = computed(() => {
  const e = earliestRecord.value
  if (!e) return false
  const y = selectedYear.value
  const m = selectedMonth.value
  return y > e.year || (y === e.year && m > e.month)
})

const canNextMonth = computed(() => {
  const y = selectedYear.value
  const m = selectedMonth.value
  return y < currentYear.value || (y === currentYear.value && m < currentMonth.value)
})

function goPrevMonth() {
  if (!canPrevMonth.value) return
  if (selectedMonth.value === 0) {
    selectedMonth.value = 11
    selectedYear.value -= 1
  } else {
    selectedMonth.value -= 1
  }
}

function goNextMonth() {
  if (!canNextMonth.value) return
  if (selectedMonth.value === 11) {
    selectedMonth.value = 0
    selectedYear.value += 1
  } else {
    selectedMonth.value += 1
  }
}

const canPrevYear = computed(() => {
  const e = earliestRecord.value
  if (!e) return false
  return selectedYear.value > e.year
})

const canNextYear = computed(() => {
  return selectedYear.value < currentYear.value
})

function goPrevYear() {
  if (!canPrevYear.value) return
  selectedYear.value -= 1
}

function goNextYear() {
  if (!canNextYear.value) return
  selectedYear.value += 1
}

/** 当年有记录的天数所在的「周」数（周一为一周起点，周 key 为该周周一日期 YYYY-MM-DD） */
const yearWeeksWithRecords = computed(() => {
  const daily = dailyByYear.value
  const weeks = new Set()
  for (const [key, ms] of Object.entries(daily)) {
    if (ms <= 0) continue
    const [y, m, d] = key.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const dayOfWeek = (date.getDay() + 6) % 7
    const monday = new Date(date)
    monday.setDate(date.getDate() - dayOfWeek)
    const weekKey = dateKey(monday.getFullYear(), monday.getMonth(), monday.getDate())
    weeks.add(weekKey)
  }
  return weeks.size
})

const yearAvgPerWeekMs = computed(() => {
  const n = yearWeeksWithRecords.value
  return n > 0 ? Math.round(yearTotalMs.value / n) : 0
})

function dateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

const monthCalendarCells = computed(() => {
  const year = selectedYear.value
  const month = selectedMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  const startWeekday = (firstDay.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ empty: true })
  }
  for (let day = 1; day <= lastDate; day++) {
    const key = dateKey(year, month, day)
    cells.push({
      empty: false,
      day,
      ms: dailyByMonth.value[key] ?? 0,
    })
  }
  return cells
})

const yearRows = computed(() => {
  const rows = []
  const y = selectedYear.value
  for (let month = 0; month < 12; month++) {
    const lastDate = new Date(y, month + 1, 0).getDate()
    const days = []
    for (let day = 1; day <= 31; day++) {
      if (day <= lastDate) {
        const key = dateKey(y, month, day)
        days.push({ ms: dailyByYear.value[key] ?? 0 })
      } else {
        days.push({ ms: 0, empty: true })
      }
    }
    rows.push({
      month: month + 1,
      days,
    })
  }
  return rows
})

const byProject = computed(() => {
  const { start: rangeStart, end: rangeEnd } = monthBounds.value
  const nowTs = Date.now()
  const projectIds = new Set(projects.value.map((p) => p.id))
  const map = new Map()
  const add = (id, name, ms) => {
    if (!map.has(id)) map.set(id, { projectId: id, name, ms: 0 })
    map.get(id).ms += ms
  }
  for (const s of sessions.value) {
    const segments = sessionSegments.value.get(s.id) ?? []
    for (const seg of segments) {
      if (seg.projectId && projectIds.has(seg.projectId)) {
        const segStart = Math.max(seg.startAt, rangeStart)
        const segEnd =
          seg.endAt != null
            ? Math.min(seg.endAt, rangeEnd)
            : Math.min(rangeEnd, nowTs)
        if (segEnd > segStart) {
          const name =
            projects.value.find((p) => p.id === seg.projectId)?.name ?? seg.projectId
          add(seg.projectId, name, segEnd - segStart)
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.ms - a.ms)
})

function heatClass(ms) {
  if (ms <= 0) return 'heat-0'
  const min = ms / 60000
  if (min < 30) return 'heat-1'
  if (min < 60) return 'heat-2'
  if (min < 120) return 'heat-3'
  return 'heat-4'
}

async function load() {
  sessions.value = await getAllSessions()
  projects.value = await getAllProjects()
  const map = new Map()
  for (const s of sessions.value) {
    map.set(s.id, await getSegmentsBySessionId(s.id))
  }
  sessionSegments.value = map
}

onMounted(() => {
  const { start, end } = getLast7DaysBounds()
  weekStartStr.value = toDateInputValue(start)
  weekEndStr.value = toDateInputValue(end)
  load()
})
</script>

<style scoped>
.stats {
  padding: 0.5rem 0;
}

.page-title {
  margin: 0 0 0.25rem;
  font-size: 1.35rem;
  font-weight: 600;
}

.stats-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab {
  padding: 0.5rem 1rem;
  font-size: 0.95rem;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-height: var(--touch-min);
}

.tab.active {
  color: var(--accent);
  font-weight: 600;
  border-color: var(--accent);
}

.week-range {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.range-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.range-label-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.range-input {
  padding: 0.5rem;
  font-size: 0.95rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  min-height: var(--touch-min);
}

.week-label {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: var(--text-muted);
}

.week-chart-section {
  margin-bottom: 1.5rem;
}

.week-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.week-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.week-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.week-legend-name {
  white-space: nowrap;
}

.week-chart {
  display: flex;
  gap: 6px;
  align-items: flex-end;
  padding-top: 0.25rem;
}

.week-chart-day {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.week-chart-bar-cell {
  width: 100%;
  min-height: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
}

.week-chart-bar-wrap {
  width: 100%;
  max-width: 28px;
  min-height: 4px;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 4px 4px 0 0;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.week-chart-bar-seg {
  min-height: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.week-chart-seg-text {
  font-size: 0.55rem;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  text-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  transform: rotate(-90deg);
  max-width: 999px;
}

.week-chart-duration {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.week-chart-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.2;
  margin-top: 0.35rem;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-project-totals {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.week-project-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.week-project-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.week-project-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
}

.week-project-name {
  font-weight: 500;
}

.week-project-duration {
  display: inline-block;
  min-width: 7ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.week-project-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.week-project-percent {
  display: inline-block;
  min-width: 4ch;
  text-align: right;
  font-size: 0.85em;
  color: var(--text-muted);
}

.week-project-bar-wrap {
  height: 8px;
  background: var(--surface);
  border-radius: 4px;
  overflow: hidden;
}

.week-project-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.week-notes {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.week-notes-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.week-notes-date {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.week-notes-text {
  font-size: 0.95rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.month-header .month-label {
  margin: 0;
  flex: 1;
  text-align: center;
}

.nav-btn {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  color: var(--accent);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-height: var(--touch-min);
}

.nav-btn:disabled {
  color: var(--text-muted);
  opacity: 0.6;
  cursor: not-allowed;
}

.month-label {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: var(--text-muted);
}

.year-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.year-header-nav .year-label {
  flex: 1;
  text-align: center;
  margin: 0;
}

.year-label {
  margin: 0;
  font-size: 1rem;
  color: var(--text-muted);
}

.year-stats-row {
  margin-bottom: 1.5rem;
}

.stats-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.section-title {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
}

.heatmap-section {
  margin-bottom: 1.5rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 0.75rem;
  min-height: 0;
}

.calendar-head {
  color: var(--text-muted);
  font-size: 0.7rem;
  aspect-ratio: auto;
  min-height: 24px;
}

.calendar-empty {
  background: transparent;
}

.calendar-day {
  background: var(--surface);
  border: 1px solid var(--border);
}

.calendar-day.heat-0 {
  background: var(--surface);
}

.calendar-day.heat-1 {
  background: rgba(124, 110, 246, 0.2);
}

.calendar-day.heat-2 {
  background: rgba(124, 110, 246, 0.45);
}

.calendar-day.heat-3 {
  background: rgba(124, 110, 246, 0.7);
}

.calendar-day.heat-4 {
  background: var(--accent);
}

.cell-day {
  font-weight: 600;
}

.cell-duration {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 年度热力图：31 列等分铺满右侧；行高用容器查询 100cqw 算出与列宽一致，格子填满即正方形且每行高一致。
 * 原因：用 aspect-ratio:1 时行高由子项“内容”决定，不同行在 sub-pixel 舍入下可能得到略不同的行高，
 * 月份文字按行居中后就会上下错位；改为由 grid 显式设行高 = (容器宽 - 30*gap)/31，不依赖子项，对齐稳定。 */
.year-heatmap {
  --year-gap: 2px;
}

.year-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.year-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.year-month-label {
  width: 28px;
  font-size: 0.7rem;
  line-height: 1;
  color: var(--text-muted);
  flex-shrink: 0;
  text-align: right;
}

.year-days {
  flex: 1;
  min-width: 0;
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(31, minmax(0, 1fr));
  grid-template-rows: calc((100cqw - 30 * var(--year-gap)) / 31);
  gap: var(--year-gap);
}

.year-cell {
  width: 100%;
  height: 100%;
  min-width: 0;
  border-radius: 2px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-sizing: border-box;
}

.year-cell.empty {
  visibility: hidden;
}

.year-cell.heat-0 {
  background: rgba(0, 0, 0, 0.04);
  border-color: var(--border);
}

.year-cell.heat-1 {
  background: rgba(124, 110, 246, 0.2);
  border-color: var(--border);
}

.year-cell.heat-2 {
  background: rgba(124, 110, 246, 0.45);
  border-color: var(--border);
}

.year-cell.heat-3 {
  background: rgba(124, 110, 246, 0.7);
  border-color: var(--border);
}

.year-cell.heat-4 {
  background: var(--accent);
  border-color: var(--accent);
}

.by-project {
  margin-bottom: 1rem;
}

.project-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.project-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
}

.project-name {
  font-weight: 500;
}

.project-duration {
  color: var(--text-muted);
}

.project-bar-wrap {
  height: 8px;
  background: var(--surface);
  border-radius: 4px;
  overflow: hidden;
}

.project-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.empty {
  color: var(--text-muted);
  margin: 1rem 0;
}
</style>
