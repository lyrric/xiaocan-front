<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, inject } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const authState = inject<{
  isAuthenticated: { value: boolean }
  setAuthenticated: () => void
  waitForAuth: () => Promise<void>
}>('authState')!

const loading = ref(false)
const searchForm = reactive({
  notifyConfigId: null as number | null,
  pageNum: 1,
  pageSize: 20,
})
const pagination = reactive({
  currentPage: 1,
  hasNextPage: true,
  isLoadingMore: false,
})

let scrollObserver: IntersectionObserver | null = null
const loadMoreTrigger = ref<HTMLElement | null>(null)
const historyList = ref<any[]>([])

async function handleSearch(resetPage = true) {
  if (resetPage) {
    searchForm.pageNum = 1
    pagination.currentPage = 1
    pagination.hasNextPage = true
  }

  loading.value = resetPage

  try {
    const response = await api.post('/api/notify-history/page', searchForm)
    if (response.data.success) {
      const pageData = response.data.data
      const newData = pageData?.records || []
      if (resetPage) {
        historyList.value = newData
      } else {
        historyList.value = [...historyList.value, ...newData]
      }
      pagination.hasNextPage = newData.length >= searchForm.pageSize
    } else {
      ElMessage.error(response.data.msg || '查询失败')
      if (!resetPage) {
        pagination.currentPage--
        searchForm.pageNum = pagination.currentPage
      }
    }
  } catch {
    ElMessage.error('网络错误，请稍后重试')
    if (!resetPage) {
      pagination.currentPage--
      searchForm.pageNum = pagination.currentPage
    }
  } finally {
    loading.value = false
    pagination.isLoadingMore = false
    nextTick(() => {
      reinitScrollObserver()
    })
  }
}

function initScrollObserver() {
  nextTick(() => {
    if (loadMoreTrigger.value) {
      scrollObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              entry.isIntersecting &&
              pagination.hasNextPage &&
              !pagination.isLoadingMore &&
              !loading.value
            ) {
              loadNextPage()
            }
          })
        },
        { rootMargin: '300px', threshold: 0.1 },
      )
      scrollObserver.observe(loadMoreTrigger.value)
    }
  })
}

function reinitScrollObserver() {
  if (scrollObserver) {
    scrollObserver.disconnect()
  }
  initScrollObserver()
}

async function loadNextPage() {
  if (!pagination.hasNextPage || pagination.isLoadingMore || loading.value) {
    return
  }
  pagination.isLoadingMore = true
  pagination.currentPage++
  searchForm.pageNum = pagination.currentPage
  await handleSearch(false)
}

function getPlatformName(type: number) {
  const platforms: Record<number, string> = { 1: '美团', 2: '饿了么', 3: '京东' }
  return platforms[type] || '未知'
}

function getPlatformClass(type: number) {
  const classes: Record<number, string> = {
    1: 'platform-tag platform-meituan',
    2: 'platform-tag platform-eleme',
    3: 'platform-tag platform-jd',
  }
  return classes[type] || ''
}

function getRebateConditionText(condition: number) {
  const conditions: Record<number, string> = { 99: '无需评价', 2: '图文评价' }
  return conditions[condition] || '其他'
}

function getNotifyTypeName(notifyType: string) {
  const types: Record<string, string> = {
    STORE_ACTIVITY: '指定门店',
    MINIMUM_PAY: '最小实付',
  }
  return types[notifyType] || '未知'
}

function getNotifyTypeClass(notifyType: string) {
  const classes: Record<string, string> = {
    STORE_ACTIVITY: 'type-tag type-store',
    MINIMUM_PAY: 'type-tag type-pay',
  }
  return classes[notifyType] || 'type-tag'
}

function formatDistance(distance: number) {
  if (!distance) return ''
  if (distance < 1000) {
    return distance + 'm'
  } else {
    return (distance / 1000).toFixed(1) + 'km'
  }
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  const timeStr =
    date.getHours().toString().padStart(2, '0') +
    ':' +
    date.getMinutes().toString().padStart(2, '0')

  if (isToday) return '今天 ' + timeStr
  if (isYesterday) return '昨天 ' + timeStr

  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return month + '-' + day + ' ' + timeStr
}

onMounted(async () => {
  await authState?.waitForAuth()
  handleSearch()
  initScrollObserver()
})

onBeforeUnmount(() => {
  if (scrollObserver) {
    scrollObserver.disconnect()
  }
})
</script>

<template>
  <div class="history-page">
    <!-- Content area -->
    <div class="content">
      <!-- Loading state -->
      <div v-if="loading" class="loading-container">
        <div class="loading-skeleton" v-for="n in 4" :key="n">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-info">
            <div class="skeleton-line w60"></div>
            <div class="skeleton-line w40"></div>
            <div class="skeleton-line w80"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="historyList.length === 0" class="empty-state">
        <div class="empty-illustration">
          <svg viewBox="0 0 120 120" fill="none" width="100" height="100">
            <circle cx="60" cy="60" r="50" fill="#f0f2f5" />
            <path d="M60 30 L60 65" stroke="#d9dce1" stroke-width="4" stroke-linecap="round" />
            <circle cx="60" cy="75" r="3" fill="#d9dce1" />
            <circle cx="60" cy="60" r="35" stroke="#d9dce1" stroke-width="3" fill="none" />
          </svg>
        </div>
        <h3 class="empty-title">暂无通知记录</h3>
        <p class="empty-desc">配置监控后，通知记录将在此展示</p>
      </div>

      <!-- History list -->
      <div v-else class="history-list">
        <div
          v-for="(item, index) in historyList"
          :key="index"
          class="history-card"
        >
          <!-- Time label -->
          <div class="card-time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{{ formatTime(item.createTime) }}</span>
          </div>

          <!-- Card main content -->
          <div class="card-main">
            <div class="store-avatar">
              <img v-if="item.icon" :src="item.icon" :alt="item.name" />
              <span v-else class="avatar-letter">{{ item.name?.charAt(0) || '?' }}</span>
            </div>
            <div class="store-body">
              <div class="store-name-row">
                <span class="store-name">{{ item.name }}</span>
                <span v-if="item.ifNew" class="badge badge-new">新店</span>
                <span :class="getPlatformClass(item.type)" class="badge">{{ getPlatformName(item.type) }}</span>
              </div>
              <div class="store-price-row">
                <span class="price-tag">
                  满<em>{{ item.price }}</em>返<em class="rebate">{{ item.rebatePrice }}</em>
                </span>
                <span v-if="item.distance" class="distance-tag">{{ formatDistance(item.distance) }}</span>
              </div>
            </div>
          </div>

          <!-- Card detail chips -->
          <div class="card-tags">
            <span :class="getNotifyTypeClass(item.notifyType)" class="info-chip">
              {{ getNotifyTypeName(item.notifyType) }}
            </span>
            <span class="info-chip">{{ item.startTime }}-{{ item.endTime }}</span>
            <span class="info-chip">{{ getRebateConditionText(item.rebateCondition) }}</span>
            <span v-if="item.openHours" class="info-chip">{{ item.openHours }}</span>
            <span
              class="info-chip"
              :class="{ 'chip-danger': item.leftNumber <= 0, 'chip-success': item.leftNumber > 0 }"
            >
              {{ item.leftNumber > 0 ? '剩余 ' + item.leftNumber : '已售罄' }}
            </span>
          </div>
        </div>

        <!-- Scroll load more indicator -->
        <div class="scroll-loading-container" v-if="historyList.length > 0">
          <div v-if="pagination.isLoadingMore" class="loading-more">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <span>加载中</span>
          </div>

          <div v-else-if="!pagination.hasNextPage" class="no-more-data">
            <span class="divider-line"></span>
            <span>没有更多了</span>
            <span class="divider-line"></span>
          </div>

          <div v-else class="load-more-trigger" ref="loadMoreTrigger">
            &nbsp;
          </div>

          <div class="pagination-info">共 {{ historyList.length }} 条</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// ============================================
// Variables
// ============================================
$primary: #4f6ef7;
$primary-light: #eef2ff;
$success: #22c55e;
$danger: #ef4444;
$text-primary: #1a1a2e;
$text-secondary: #6b7280;
$text-hint: #9ca3af;
$bg: #f5f6fa;
$card-bg: #ffffff;
$border: #e5e7eb;
$radius-sm: 8px;
$radius-md: 12px;
$radius-lg: 16px;
$radius-full: 999px;

// ============================================
// Page layout
// ============================================
.history-page {
  padding-bottom: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

// ============================================
// Header
// ============================================
.header {
  position: sticky;
  top: -1px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-radius: $radius-lg;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: $text-primary;
}

.title-icon {
  width: 22px;
  height: 22px;
  color: $primary;
}

// ============================================
// Content area
// ============================================
.content {
  min-height: 50vh;
}

// ============================================
// Loading skeleton
// ============================================
.loading-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-skeleton {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: $card-bg;
  border-radius: $radius-md;
}

.skeleton-avatar {
  width: 56px;
  height: 56px;
  border-radius: $radius-sm;
  background: linear-gradient(110deg, #f0f0f0 8%, #e0e0e0 18%, #f0f0f0 33%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(110deg, #f0f0f0 8%, #e0e0e0 18%, #f0f0f0 33%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;

  &.w60 { width: 60%; }
  &.w40 { width: 40%; }
  &.w80 { width: 80%; }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ============================================
// Empty state
// ============================================
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-illustration {
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 14px;
  color: $text-hint;
}

// ============================================
// History list
// ============================================
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-card {
  background: $card-bg;
  border-radius: $radius-md;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s;
}

// ============================================
// Card time
// ============================================
.card-time {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: $text-hint;
  margin-bottom: 10px;
}

// ============================================
// Card main
// ============================================
.card-main {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.store-avatar {
  width: 56px;
  height: 56px;
  border-radius: $radius-sm;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-letter {
    color: #fff;
    font-size: 18px;
    font-weight: 600;
  }
}

.store-body {
  flex: 1;
  min-width: 0;
}

.store-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.store-name {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 55%;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: $radius-full;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.badge-new {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #fff;
}

.platform-tag {
  &.platform-meituan {
    background: #fff3cd;
    color: #856404;
  }
  &.platform-eleme {
    background: #cce5ff;
    color: #004085;
  }
  &.platform-jd {
    background: #f8d7da;
    color: #721c24;
  }
}

.store-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price-tag {
  font-size: 13px;
  color: $text-secondary;

  em {
    font-style: normal;
    font-weight: 600;
    color: $text-primary;
  }

  .rebate {
    color: #ef4444;
    font-size: 18px;
    font-weight: 700;
  }
}

.distance-tag {
  font-size: 12px;
  color: $text-hint;
  flex-shrink: 0;
}

// ============================================
// Card tags
// ============================================
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f3f4f6;
}

.info-chip {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: $radius-full;
  background: #f3f4f6;
  color: $text-secondary;
  white-space: nowrap;

  &.chip-success {
    background: #dcfce7;
    color: #166534;
    font-weight: 500;
  }

  &.chip-danger {
    background: #fee2e2;
    color: #991b1b;
    font-weight: 500;
  }
}

.type-tag {
  &.type-store {
    background: $primary-light;
    color: $primary;
    font-weight: 500;
  }
  &.type-pay {
    background: #fef3c7;
    color: #92400e;
    font-weight: 500;
  }
}

// ============================================
// Scroll loading
// ============================================
.scroll-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 16px 0;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: 8px;
  color: $text-hint;
  font-size: 13px;
}

.loading-dots {
  display: flex;
  gap: 4px;

  span {
    width: 6px;
    height: 6px;
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

.no-more-data {
  display: flex;
  align-items: center;
  gap: 12px;
  color: $text-hint;
  font-size: 12px;
}

.divider-line {
  display: inline-block;
  width: 40px;
  height: 1px;
  background: $border;
}

.load-more-trigger {
  min-height: 1px;
  width: 100%;
}

.pagination-info {
  color: $text-hint;
  font-size: 12px;
}

// ============================================
// Responsive: larger screens
// ============================================
@media screen and (min-width: 769px) {
  .header {
    border-radius: $radius-lg;
    margin: 0 0 16px;
    padding: 16px 20px;
  }

  .history-list {
    gap: 12px;
  }

  .history-card {
    padding: 18px;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }
  }
}

// ============================================
// Responsive: mobile
// ============================================
@media screen and (max-width: 768px) {
  .header {
    margin-bottom: 10px;
    padding: 12px;
  }
}
</style>
