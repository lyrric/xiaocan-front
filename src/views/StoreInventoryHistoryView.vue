<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import api from '../api'

const route = useRoute()
const router = useRouter()

const uniqueId = computed(() => route.query.uniqueId as string || '')
const storeName = computed(() => route.query.name as string || '门店')

const loading = ref(true)
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

async function fetchData() {
  loading.value = true
  try {
    const response = await api.get(`/api/store-inventory-history/${uniqueId.value}`)
    if (response.data.success) {
      const data = response.data.data || []
      renderChart(data)
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function renderChart(data: any[]) {
  if (!chartRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const times = data.map((item: any) => item.createTime)
  const inventories = data.map((item: any) => item.inventory)

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        return `${p.axisValue}<br/>库存：${p.value}`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: times,
      boundaryGap: false,
      axisLabel: {
        rotate: data.length > 10 ? 45 : 0,
        fontSize: 12,
        color: '#6b7280',
      },
      axisLine: {
        lineStyle: { color: '#e5e7eb' },
      },
    },
    yAxis: {
      type: 'value',
      name: '库存',
      minInterval: 1,
      axisLabel: {
        fontSize: 12,
        color: '#6b7280',
      },
      splitLine: {
        lineStyle: { color: '#f3f4f6' },
      },
    },
    series: [
      {
        data: inventories,
        type: 'line',
        smooth: true,
        symbol: data.length > 20 ? 'none' : 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#4f6ef7',
          width: 2,
        },
        itemStyle: {
          color: '#4f6ef7',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(79, 110, 247, 0.25)' },
            { offset: 1, color: 'rgba(79, 110, 247, 0.02)' },
          ]),
        },
      },
    ],
  })
}

function goBack() {
  router.back()
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(async () => {
  await fetchData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<template>
  <div class="inventory-page">
    <!-- Header -->
    <div class="page-header">
      <div class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </div>
      <div class="header-title">
        <span class="title-text">{{ storeName }}</span>
        <span class="title-sub">库存记录</span>
      </div>
    </div>

    <!-- Chart area -->
    <div class="chart-container">
      <div v-if="loading" class="chart-loading">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <span>加载中</span>
      </div>
      <div v-else ref="chartRef" class="chart"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$primary: #4f6ef7;
$text-primary: #1a1a2e;
$text-secondary: #6b7280;
$text-hint: #9ca3af;
$bg: #f5f6fa;
$card-bg: #ffffff;
$radius-md: 12px;
$radius-lg: 16px;

.inventory-page {
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

// ============================================
// Header
// ============================================
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: $card-bg;
  border-radius: $radius-lg;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f3f4f6;
  color: $text-secondary;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: #e5e7eb;
    transform: scale(0.95);
  }
}

.header-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-sub {
  font-size: 12px;
  color: $text-hint;
}

// ============================================
// Chart
// ============================================
.chart-container {
  background: $card-bg;
  border-radius: $radius-lg;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  min-height: 400px;
}

.chart {
  width: 100%;
  height: 400px;
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 400px;
  color: $text-hint;
  font-size: 14px;
}

.loading-dots {
  display: flex;
  gap: 5px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $primary;
    animation: dot-bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
}

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

// ============================================
// Responsive
// ============================================
@media screen and (min-width: 769px) {
  .chart {
    height: 500px;
  }
  .chart-container {
    padding: 24px;
  }
}
</style>