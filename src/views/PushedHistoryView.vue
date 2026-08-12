<script lang="ts">
export default {
  name: 'PushedHistoryView',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

const route = useRoute()
const loading = ref(true)
const storeList = ref<any[]>([])

// 从路径参数获取 token 和 id
const token = computed(() => (route.params.token as string) || '')
const msgId = computed(() => (route.params.id as string) || '')

function isFavorite(store: any) {
  return !!store.favoriteId
}

// 按 type + uniqId 聚合（同 HomeView 的 groupedStoreList）
const groupedStoreList = computed(() => {
  const groupMap = new Map<string, any>()
  const groups: any[] = []
  for (const store of storeList.value) {
    const key = `${store.type || ''}_${store.uniqId || String(store.promotionId || store.storeId || Math.random())}`
    let group = groupMap.get(key)
    if (!group) {
      group = {
        uniqId: key,
        primary: store,
        activities: [] as any[],
        hasAvailable: false,
      }
      groupMap.set(key, group)
      groups.push(group)
    }
    group.activities.push(store)
    if (store.leftNumber > 0) {
      group.hasAvailable = true
    }
  }
  return groups
})

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

function getStoreTypeName(storeType: string) {
  if (storeType === 'XC_MTSJ') return '小蚕赏金'
  if (storeType === 'XC_MANJIAN') return '小蚕满减'
  if (storeType === 'WM_MANJIAN') return '歪麦满减'
  if (storeType === 'WM_MTSJ') return '歪麦赏金'
  return storeType || ''
}

function copyStoreName(name: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(name).then(() => {
      ElMessage.success('门店名称已复制')
    }).catch(() => {
      fallbackCopy(name)
    })
  } else {
    fallbackCopy(name)
  }
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    ElMessage.success('门店名称已复制')
  } catch {
    ElMessage.error('复制失败')
  } finally {
    document.body.removeChild(textarea)
  }
}

async function handleFavoriteToggle(store: any) {
  const storeType = store.storeTypeEnum || 'XC_MANJIAN'

  if (store.favoriteId) {
    try {
      const response = await api.delete(`/api/favorite/${store.favoriteId}`)
      if (response.data.success) {
        ElMessage.success('已取消收藏')
        store.favoriteId = null
      } else {
        ElMessage.error(response.data.msg || '取消收藏失败')
      }
    } catch {
      ElMessage.error('网络错误，请稍后重试')
    }
  } else {
    try {
      const response = await api.post('/api/favorite/save', {
        locationId: store.locationId,
        uniqueId: store.uniqId,
        storeType,
        icon: store.icon,
        name: store.name,
        type: store.type,
        distance: store.distanceStr,
      })
      if (response.data.success) {
        ElMessage.success('收藏成功')
        store.favoriteId = response.data.data
      } else {
        ElMessage.error(response.data.msg || '收藏失败')
      }
    } catch {
      ElMessage.error('网络错误，请稍后重试')
    }
  }
}

async function fetchData() {
  if (!msgId.value) {
    ElMessage.error('缺少必要参数 id')
    loading.value = false
    return
  }

  // 设置 token 到 localStorage（供 api 拦截器使用）
  if (token.value) {
    localStorage.setItem('token', token.value)
  }

  loading.value = true
  try {
    const response = await api.get('/api/notify-history/pushed-history', {
      msgId: msgId.value,
    })
    if (response.data.success) {
      storeList.value = response.data.data || []
    } else {
      ElMessage.error(response.data.msg || '查询失败')
    }
  } catch {
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="pushed-history-page">
    <!-- Content area -->
    <div class="content">
      <!-- Loading state -->
      <div v-if="loading" class="loading-container">
        <div class="loading-skeleton" v-for="n in 3" :key="n">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-info">
            <div class="skeleton-line w60"></div>
            <div class="skeleton-line w40"></div>
            <div class="skeleton-line w80"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="storeList.length === 0" class="empty-state">
        <div class="empty-illustration">
          <svg viewBox="0 0 120 120" fill="none" width="100" height="100">
            <circle cx="60" cy="60" r="50" fill="#f0f2f5"/>
            <rect x="35" y="45" width="50" height="35" rx="4" fill="#d9dce1"/>
            <rect x="40" y="38" width="40" height="8" rx="3" fill="#c4c7cc"/>
            <circle cx="50" cy="58" r="4" fill="#a0a3a8"/>
            <circle cx="70" cy="58" r="4" fill="#a0a3a8"/>
            <path d="M48 68 q12 8 24 0" stroke="#a0a3a8" stroke-width="2" fill="none"/>
          </svg>
        </div>
        <h3 class="empty-title">暂无门店信息</h3>
        <p class="empty-desc">该消息关联的门店列表为空</p>
      </div>

      <!-- Store list -->
      <div v-else class="store-list">
        <div
          v-for="group in groupedStoreList"
          :key="group.uniqId"
          class="store-card"
          :class="{ 'sold-out': !group.hasAvailable }"
        >
          <!-- Card header -->
          <div class="card-main">
            <div class="store-avatar">
              <img v-if="group.primary.icon" :src="group.primary.icon" :alt="group.primary.name" />
              <span v-else class="avatar-letter">{{ group.primary.name?.charAt(0) || '?' }}</span>
            </div>
            <div class="store-body">
              <div class="store-name-row">
                <span class="store-name">{{ group.primary.name }}</span>
                <span class="copy-btn" @click.stop="copyStoreName(group.primary.name)" title="复制门店名称">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </span>
                <span class="favorite-btn" :class="{ active: isFavorite(group.primary) }" @click.stop="handleFavoriteToggle(group.primary)" title="收藏">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path v-if="isFavorite(group.primary)" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    <path v-else d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" fill="none" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                </span>
              </div>
              <div class="store-meta-row">
                <div class="store-meta-left">
                  <span class="distance-tag">{{ group.primary.distanceStr }}</span>
                  <span :class="getPlatformClass(group.primary.type)" class="badge">{{ getPlatformName(group.primary.type) }}</span>
                  <span v-if="group.primary.storeTypeEnum" class="badge store-type-badge">{{ getStoreTypeName(group.primary.storeTypeEnum) }}</span>
                </div>
                <span v-if="group.primary.locationName" class="location-name" :title="group.primary.locationName">{{ group.primary.locationName }}</span>
              </div>
            </div>
          </div>

          <!-- Activity list -->
          <div class="activity-list" :class="{ 'single-activity': group.activities.length === 1 }">
            <div
              v-for="activity in group.activities"
              :key="activity.promotionId"
              class="activity-row"
            >
              <div class="activity-info">
                <span v-if="activity.storeTypeEnum === 'XC_MANJIAN' || activity.storeTypeEnum === 'WM_MANJIAN'" class="price-tag">
                  满<em>{{ activity.price }}</em>返<em class="rebate">{{ activity.rebatePrice }}</em>
                </span>
                <span v-else class="price-tag">
                  返<em class="rebate">{{ activity.rebateRatio }}%</em>&nbsp;最高<em>{{ activity.rebateMax }}</em>元
                </span>
                <div class="activity-tags">
                  <span class="info-chip">{{ activity.startTime }}-{{ activity.endTime }}</span>
                  <span v-if="activity.rebateConditionStr" class="info-chip">{{ activity.rebateConditionStr }}</span>
                  <span
                    class="info-chip"
                    :class="{ 'chip-danger': activity.leftNumber <= 0, 'chip-success': activity.leftNumber > 0 }"
                  >
                    {{ activity.leftNumber > 0 ? '剩余 ' + activity.leftNumber : '已售罄' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pagination-info">共 {{ groupedStoreList.length }} 家门店，{{ storeList.length }} 个活动</div>
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
.pushed-history-page {
  padding-bottom: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  overflow-x: hidden;
  max-width: 100%;
}

// ============================================
// Content area
// ============================================
.content {
  min-height: 50vh;
  overflow-x: hidden;
  max-width: 100%;
}

// ============================================
// Loading skeleton
// ============================================
.loading-container {
  display: grid;
  grid-template-columns: 1fr;
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
  width: 64px;
  height: 64px;
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
// Store card
// ============================================
.store-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.store-card {
  background: $card-bg;
  border-radius: $radius-md;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s;
  overflow: hidden;
  max-width: 100%;

  &.sold-out {
    .card-main {
      opacity: 0.55;
    }
    .activity-list .info-chip:not(.chip-danger) {
      opacity: 0.55;
    }
  }
}

.card-main {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.store-avatar {
  width: 64px;
  height: 64px;
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
    font-size: 20px;
    font-weight: 600;
  }
}

.store-body {
  flex: 1;
  min-width: 0;
}

.store-name-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
}

.store-name {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
  line-height: 1.35;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border-radius: 4px;
  color: $text-hint;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    color: $primary;
    background: $primary-light;
  }

  &:active {
    transform: scale(0.9);
  }
}

.favorite-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: #f3f4f6;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
  margin-top: 2px;
  flex-shrink: 0;

  &:hover {
    background: #fef3c7;
    color: #f59e0b;
  }

  &:active {
    transform: scale(0.96);
  }

  &.active {
    color: #f59e0b;
    background: #fef3c7;
  }
}

.store-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  color: $text-hint;
}

.store-meta-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
  max-width: 100%;
}

.location-name {
  font-size: 12px;
  color: $text-hint;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  margin-left: 6px;
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

.store-type-badge {
  background: #f3e8ff;
  color: #7c3aed;
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

.distance-tag {
  font-size: 12px;
  color: $text-hint;
  flex-shrink: 0;
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

// ============================================
// Activity list
// ============================================
.activity-list {
  margin-top: 10px;
  border-top: 1px solid #f3f4f6;

  &.single-activity {
    .activity-row {
      padding: 10px 0 0;
    }
  }
}

.activity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f7f8fa;

  &:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.activity-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.activity-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.info-chip {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: $radius-full;
  background: #f3f4f6;
  color: $text-secondary;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;

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

.pagination-info {
  text-align: center;
  color: $text-hint;
  font-size: 12px;
  margin-top: 16px;
  padding: 12px 0;
}

// ============================================
// Responsive
// ============================================
@media screen and (min-width: 769px) {
  .store-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .loading-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .store-card {
    padding: 18px;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }
  }
}

@media screen and (min-width: 1200px) {
  .store-list {
    grid-template-columns: repeat(3, 1fr);
  }

  .loading-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .store-card {
    border-radius: $radius-md;
    padding: 16px;
  }

  .loading-container {
    grid-template-columns: 1fr;
  }
}
</style>
