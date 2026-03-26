<template>
  <div class="trade-scroll">
    <div class="scroll-header">
      <span>时间</span>
      <span>方向</span>
      <span>价格</span>
      <span>数量</span>
    </div>
    <div class="scroll-body" ref="scrollBody">
      <transition-group name="trade">
        <div 
          v-for="trade in displayTrades" 
          :key="trade.id || trade.created_at"
          class="trade-row"
          :class="{ 'new': trade.isNew }"
        >
          <span class="time">{{ formatTime(trade.created_at) }}</span>
          <span class="side" :class="trade.side === 1 ? 'buy' : 'sell'">
            {{ trade.side === 1 ? '买入' : '卖出' }}
          </span>
          <span class="price" :class="trade.side === 1 ? 'up' : 'down'">
            {{ formatPrice(trade.price) }}
          </span>
          <span class="amount">{{ formatAmount(trade.amount) }}</span>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  trades: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 20 }
})

const scrollBody = ref(null)

// 标记新成交
const processedTrades = ref([])

watch(() => props.trades, (newTrades) => {
  if (newTrades.length === 0) return
  
  // 标记最新的成交
  const latest = newTrades.slice(0, 5).map((t, i) => ({
    ...t,
    id: t.id || `${t.created_at}-${i}`,
    isNew: i < 3 // 最新的3条标记动画
  }))
  
  processedTrades.value = latest
  
  // 移除动画标记
  setTimeout(() => {
    processedTrades.value.forEach(t => t.isNew = false)
  }, 1000)
}, { immediate: true, deep: true })

const displayTrades = computed(() => {
  return processedTrades.value.slice(0, props.maxCount)
})

const formatTime = (time) => {
  if (!time) return '--:--:--'
  const date = new Date(time)
  return date.toLocaleTimeString('zh-CN', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatPrice = (price) => {
  return parseFloat(price || 0).toFixed(2)
}

const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(4)
}
</script>

<style scoped>
.trade-scroll {
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  overflow: hidden;
}

.scroll-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 10px 12px;
  background: #0d1117;
  border-bottom: 1px solid #30363d;
  font-size: 11px;
  color: #8b949e;
}

.scroll-header span {
  text-align: center;
}

.scroll-header span:first-child {
  text-align: left;
}

.scroll-header span:last-child {
  text-align: right;
}

.scroll-body {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 0;
}

.trade-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-family: monospace;
  transition: background 0.3s;
}

.trade-row:hover {
  background: #21262d;
}

.trade-row span {
  text-align: center;
}

.trade-row .time {
  text-align: left;
  color: #8b949e;
}

.trade-row .amount {
  text-align: right;
}

.trade-row.new {
  animation: highlight 1s ease-out;
}

@keyframes highlight {
  0% {
    background: rgba(0, 212, 170, 0.3);
  }
  100% {
    background: transparent;
  }
}

.side {
  font-weight: 500;
}

.side.buy {
  color: #00d4aa;
}

.side.sell {
  color: #ff6b6b;
}

.price {
  font-weight: 600;
}

.up {
  color: #00d4aa;
}

.down {
  color: #ff6b6b;
}

/* 滚动动画 */
.trade-enter-active,
.trade-leave-active {
  transition: all 0.3s ease;
}

.trade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.trade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .scroll-body {
    max-height: 200px;
  }
  
  .trade-row {
    font-size: 11px;
    padding: 4px 8px;
  }
}
</style>
