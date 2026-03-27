<template>
  <div class="trade-page">
    <div class="trade-container">
      <!-- 左侧：市场列表 -->
      <div class="market-list">
        <div class="market-header">
          <el-input 
            v-model="searchQuery" 
            placeholder="搜索币种"
            :prefix-icon="Search"
            size="small"
          />
        </div>
        <div class="pairs-list">
          <div 
            v-for="pair in filteredPairs" 
            :key="pair.id"
            class="pair-item"
            :class="{ active: currentPair?.id === pair.id }"
            @click="selectPair(pair)"
          >
            <span class="symbol">{{ pair.symbol }}</span>
            <span class="price" :class="pair.price_change_24h >= 0 ? 'up' : 'down'">
              {{ formatPrice(pair.price) }}
            </span>
            <span class="change" :class="pair.price_change_24h >= 0 ? 'up' : 'down'">
              {{ pair.price_change_24h > 0 ? '+' : '' }}{{ pair.price_change_24h }}%
            </span>
          </div>
        </div>
      </div>

      <!-- 中间：K线 + 交易 -->
      <div class="trade-main">
        <!-- K线区域 -->
        <div class="chart-area">
          <div class="pair-info" v-if="currentPair">
            <span class="symbol">{{ currentPair.symbol }}</span>
            <span class="price" :class="priceChange >= 0 ? 'up' : 'down'">
              {{ formatPrice(currentPrice) }}
            </span>
            <span class="change" :class="priceChange >= 0 ? 'up' : 'down'">
              {{ priceChange >= 0 ? '+' : '' }}{{ priceChange }}%
            </span>
          </div>
          <div ref="chartRef" class="chart-container"></div>
        </div>

        <!-- 深度图 + 订单簿 -->
        <div class="depth-section">
          <!-- 深度图 -->
          <div class="depth-chart-wrapper">
            <div class="depth-header">
              <span>深度图</span>
              <span class="depth-legend">
                <span class="bid-legend">买</span>
                <span class="ask-legend">卖</span>
              </span>
            </div>
            <DepthChart 
              :bids="bids" 
              :asks="asks" 
              :current-price="currentPrice"
            />
          </div>

          <!-- 订单簿 -->
          <div class="order-book">
            <div class="book-header">
              <span>价格</span>
              <span>数量</span>
              <span>累计</span>
            </div>
            <div class="asks">
              <div v-for="(ask, index) in asks" :key="'ask'+index" class="book-row">
                <span class="price down">{{ formatPrice(ask.price) }}</span>
                <span>{{ formatAmount(ask.amount) }}</span>
                <span class="total">{{ formatAmount(ask.amount * ask.price) }}</span>
                <div class="depth-bar ask-bar" :style="{ width: getDepthPercent(ask.amount, 'ask') + '%' }"></div>
              </div>
            </div>
            <div class="current-price" :class="priceChange >= 0 ? 'up' : 'down'">
              {{ formatPrice(currentPrice) }}
            </div>
            <div class="bids">
              <div v-for="(bid, index) in bids" :key="'bid'+index" class="book-row">
                <span class="price up">{{ formatPrice(bid.price) }}</span>
                <span>{{ formatAmount(bid.amount) }}</span>
                <span class="total">{{ formatAmount(bid.amount * bid.price) }}</span>
                <div class="depth-bar bid-bar" :style="{ width: getDepthPercent(bid.amount, 'bid') + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 交易表单 -->
        <div class="trade-form">
          <el-tabs v-model="tradeType">
            <el-tab-pane label="限价" name="limit">
              <div class="form-content">
                <div class="balance">
                  <span>可用 {{ quoteSymbol }}: {{ formatAmount(quoteBalance) }}</span>
                </div>
                <el-input v-model="buyPrice" placeholder="买入价格" class="price-input">
                  <template #append>{{ quoteSymbol }}</template>
                </el-input>
                <el-input v-model="buyAmount" placeholder="买入数量" class="amount-input">
                  <template #append>{{ baseSymbol }}</template>
                </el-input>
                <div class="total">预计成交额: {{ formatAmount(buyPrice * buyAmount) }} {{ quoteSymbol }}</div>
                <el-button type="success" class="trade-btn" @click="placeOrder('buy')">
                  买入 {{ baseSymbol }}
                </el-button>

                <div class="balance" style="margin-top: 16px;">
                  <span>可用 {{ baseSymbol }}: {{ formatAmount(baseBalance) }}</span>
                </div>
                <el-input v-model="sellPrice" placeholder="卖出价格" class="price-input">
                  <template #append>{{ quoteSymbol }}</template>
                </el-input>
                <el-input v-model="sellAmount" placeholder="卖出数量" class="amount-input">
                  <template #append>{{ baseSymbol }}</template>
                </el-input>
                <div class="total">预计成交额: {{ formatAmount(sellPrice * sellAmount) }} {{ quoteSymbol }}</div>
                <el-button type="danger" class="trade-btn" @click="placeOrder('sell')">
                  卖出 {{ baseSymbol }}
                </el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane label="市价" name="market">
              <div class="form-content">
                <div class="balance">
                  <span>可用 {{ quoteSymbol }}: {{ formatAmount(quoteBalance) }}</span>
                </div>
                <el-input v-model="marketBuyAmount" placeholder="买入金额" class="amount-input">
                  <template #append>{{ quoteSymbol }}</template>
                </el-input>
                <el-button type="success" class="trade-btn" @click="placeMarketOrder('buy')">
                  买入 {{ baseSymbol }}
                </el-button>

                <div class="balance" style="margin-top: 16px;">
                  <span>可用 {{ baseSymbol }}: {{ formatAmount(baseBalance) }}</span>
                </div>
                <el-input v-model="marketSellAmount" placeholder="卖出数量" class="amount-input">
                  <template #append>{{ baseSymbol }}</template>
                </el-input>
                <el-button type="danger" class="trade-btn" @click="placeMarketOrder('sell')">
                  卖出 {{ baseSymbol }}
                </el-button>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <!-- 右侧：当前委托 -->
      <div class="orders-panel">
        <h4>当前委托</h4>
        <div class="orders-list">
          <div v-for="order in activeOrders" :key="order.id" class="order-item">
            <div class="order-header">
              <span :class="order.side === 1 ? 'buy' : 'sell'">
                {{ order.side === 1 ? '买入' : '卖出' }} {{ order.type === 1 ? '限价' : '市价' }}
              </span>
              <span class="time">{{ formatTime(order.created_at) }}</span>
            </div>
            <div class="order-detail">
              <span>价格: {{ order.price || '市价' }}</span>
              <span>数量: {{ order.filled_amount }}/{{ order.amount }}</span>
            </div>
            <el-button 
              size="small" 
              type="danger" 
              plain
              @click="cancelOrder(order.id)"
            >
              撤单
            </el-button>
          </div>
          <el-empty v-if="activeOrders.length === 0" description="暂无委托" />
        </div>
      </div>
    </div>

    <!-- 底部：成交记录 + 实时滚动 -->
    <div class="trades-section">
      <div class="trades-header">
        <h4>最新成交</h4>
        <div class="trades-tabs">
          <span 
            :class="{ active: tradeViewMode === 'list' }" 
            @click="tradeViewMode = 'list'"
          >列表</span>
          <span 
            :class="{ active: tradeViewMode === 'scroll' }" 
            @click="tradeViewMode = 'scroll'"
          >实时</span>
        </div>
      </div>
      
      <!-- 列表模式 -->
      <div v-if="tradeViewMode === 'list'" class="trades-list">
        <div v-for="trade in recentTrades" :key="trade.id" class="trade-row">
          <span class="time">{{ formatTime(trade.created_at) }}</span>
          <span :class="trade.side === 1 ? 'buy' : 'sell'">
            {{ trade.side === 1 ? '买入' : '卖出' }}
          </span>
          <span>{{ formatPrice(trade.price) }}</span>
          <span>{{ formatAmount(trade.amount) }}</span>
        </div>
      </div>
      
      <!-- 实时滚动模式 -->
      <div v-else class="trades-scroll-container">
        <TradeScroll :trades="recentTrades" :max-count="20" />
        <div class="scroll-hint">
          <span>⟳ 实时更新中</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import io from 'socket.io-client'
import DepthChart from '@/components/DepthChart.vue'
import TradeScroll from '@/components/TradeScroll.vue'

const userStore = useUserStore()

// 市场数据
const pairs = ref([])
const currentPair = ref(null)
const searchQuery = ref('')
const currentPrice = ref(0)
const priceChange = ref(0)

// 订单簿
const asks = ref([])
const bids = ref([])

// 交易表单
const tradeType = ref('limit')
const buyPrice = ref('')
const buyAmount = ref('')
const sellPrice = ref('')
const sellAmount = ref('')
const marketBuyAmount = ref('')
const marketSellAmount = ref('')

// 订单和成交
const activeOrders = ref([])
const recentTrades = ref([])

// 成交显示模式
const tradeViewMode = ref('list')
const scrollTrades = ref([])
const tradesScrollRef = ref(null)

// 图表
const chartRef = ref(null)
const depthChartRef = ref(null)
let chart = null
let depthChart = null
let socket = null

// 最大深度用于计算百分比
const maxDepth = ref({ ask: 0, bid: 0 })

// 计算属性
const filteredPairs = computed(() => {
  if (!searchQuery.value) return pairs.value
  return pairs.value.filter(p => 
    p.symbol.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const baseSymbol = computed(() => {
  return currentPair.value?.symbol?.split('/')[0] || ''
})

const quoteSymbol = computed(() => {
  return currentPair.value?.symbol?.split('/')[1] || ''
})

const baseBalance = computed(() => {
  // 从 balances 中获取
  return 0 // 暂时返回0
})

const quoteBalance = computed(() => {
  return 0 // 暂时返回0
})

// 初始化
onMounted(async () => {
  await fetchPairs()
  initSocket()
  nextTick(() => {
    initDepthChart()
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
  if (chart) chart.dispose()
  if (depthChart) depthChart.dispose()
})

// 获取交易对列表
const fetchPairs = async () => {
  try {
    const res = await api.get('/market/pairs')
    if (res.data.code === 200) {
      pairs.value = res.data.data
      if (pairs.value.length > 0) {
        selectPair(pairs.value[0])
      }
    }
  } catch (err) {
    console.error('获取交易对失败:', err)
  }
}

// 选择交易对
const selectPair = (pair) => {
  currentPair.value = pair
  currentPrice.value = parseFloat(pair.price)
  priceChange.value = parseFloat(pair.price_change_24h)
  
  // 重置深度图
  scrollTrades.value = []
  nextTick(() => {
    updateDepthChart()
  })
  priceChange.value = parseFloat(pair.price_change_24h)
  
  // 设置默认价格
  buyPrice.value = pair.price
  sellPrice.value = pair.price
  
  // 订阅新交易对
  if (socket) {
    socket.emit('subscribe', { pairId: pair.id })
  }
  
  // 获取历史数据
  fetchKlineHistory(pair.id)
  fetchActiveOrders()
}

// 初始化WebSocket
const initSocket = () => {
  const wsUrl = import.meta.env.VITE_WS_URL || 'https://phemex-production.up.railway.app'
  socket = io(wsUrl)
  
  socket.on('connect', () => {
    console.log('WebSocket已连接')
    if (currentPair.value) {
      socket.emit('subscribe', { pairId: currentPair.value.id })
    }
  })
  
  socket.on('ticker', (data) => {
    if (currentPair.value && data.pairId === currentPair.value.id) {
      currentPrice.value = parseFloat(data.price)
      priceChange.value = parseFloat(data.change)
    }
  })
  
  socket.on('depth', (data) => {
    asks.value = data.asks || []
    bids.value = data.bids || []
    updateMaxDepth()
    updateDepthChart()
  })
  
  socket.on('trade', (data) => {
    recentTrades.value.unshift(data)
    if (recentTrades.value.length > 20) {
      recentTrades.value.pop()
    }
    // 添加到滚动成交
    addScrollTrade(data)
  })
  
  socket.on('kline', (data) => {
    // 更新K线图
    updateChart(data.data)
  })
}

// 获取K线历史
const fetchKlineHistory = async (pairId) => {
  try {
    const timestamp = Date.now()
    const res = await api.get(`/market/kline?pairId=${pairId}&period=1m&limit=100&_t=${timestamp}`)
    if (res.data.code === 200) {
      initChart(res.data.data)
    }
  } catch (err) {
    console.error('获取K线失败:', err)
  }
}

// 初始化图表
const initChart = (data) => {
  nextTick(() => {
    if (!chartRef.value) return
    
    if (chart) chart.dispose()
    
    chart = echarts.init(chartRef.value)
    
    const option = {
      backgroundColor: 'transparent',
      grid: { left: '10%', right: '10%', top: '10%', bottom: '10%' },
      xAxis: {
        type: 'category',
        data: data.map(d => {
          // 处理秒级或毫秒级时间戳
          const ts = d.timestamp > 1000000000000 ? d.timestamp : d.timestamp * 1000
          const date = new Date(ts)
          // 使用北京时间 (UTC+8)
          const beijingTime = new Date(date.getTime() + (date.getTimezoneOffset() + 480) * 60000)
          const hours = String(beijingTime.getHours()).padStart(2, '0')
          const minutes = String(beijingTime.getMinutes()).padStart(2, '0')
          return `${hours}:${minutes}`
        }),
        axisLine: { lineStyle: { color: '#30363d' } },
        axisLabel: { color: '#8b949e' }
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: '#21262d' } },
        axisLabel: { color: '#8b949e' }
      },
      series: [{
        type: 'candlestick',
        data: data.map(d => [d.open, d.close, d.low, d.high]),
        itemStyle: {
          color: '#00d4aa',
          color0: '#ff6b6b',
          borderColor: '#00d4aa',
          borderColor0: '#ff6b6b'
        }
      }]
    }
    
    chart.setOption(option)
  })
}

// 更新图表 - 实时K线数据
const updateChart = (kline) => {
  if (!chart) return
  
  const option = chart.getOption()
  const xData = option.xAxis[0].data
  const seriesData = option.series[0].data
  
  // 处理秒级或毫秒级时间戳
  const ts = kline.timestamp > 1000000000000 ? kline.timestamp : kline.timestamp * 1000
  const date = new Date(ts)
  // 使用北京时间 (UTC+8)
  const beijingTime = new Date(date.getTime() + (date.getTimezoneOffset() + 480) * 60000)
  const hours = String(beijingTime.getHours()).padStart(2, '0')
  const minutes = String(beijingTime.getMinutes()).padStart(2, '0')
  const timeStr = `${hours}:${minutes}`
  const klineData = [kline.open, kline.close, kline.low, kline.high]
  
  // 检查是否是当前最后一根K线的更新
  const lastIndex = xData.length - 1
  if (xData[lastIndex] === timeStr) {
    // 更新最后一根K线
    seriesData[lastIndex] = klineData
  } else {
    // 添加新K线
    xData.push(timeStr)
    seriesData.push(klineData)
    // 保持最多100根K线
    if (xData.length > 100) {
      xData.shift()
      seriesData.shift()
    }
  }
  
  chart.setOption({
    xAxis: { data: xData },
    series: [{ data: seriesData }]
  })
}

// 获取当前委托
const fetchActiveOrders = async () => {
  try {
    const res = await api.get('/trade/orders?status=0,1')
    if (res.data.code === 200) {
      activeOrders.value = res.data.data.list || []
    }
  } catch (err) {
    console.error('获取订单失败:', err)
  }
}

// 下单
const placeOrder = async (side) => {
  const price = side === 'buy' ? buyPrice.value : sellPrice.value
  const amount = side === 'buy' ? buyAmount.value : sellAmount.value
  
  if (!price || !amount) {
    ElMessage.warning('请填写价格和数量')
    return
  }
  
  try {
    const res = await api.post('/trade/order', {
      pairId: currentPair.value.id,
      type: 1, // 限价
      side: side === 'buy' ? 1 : 2,
      price: parseFloat(price),
      amount: parseFloat(amount)
    })
    
    if (res.data.code === 200) {
      ElMessage.success('下单成功')
      fetchActiveOrders()
      // 清空表单
      if (side === 'buy') {
        buyAmount.value = ''
      } else {
        sellAmount.value = ''
      }
    }
  } catch (err) {
    console.error('下单失败:', err)
  }
}

// 市价单
const placeMarketOrder = async (side) => {
  const amount = side === 'buy' ? marketBuyAmount.value : marketSellAmount.value
  
  if (!amount) {
    ElMessage.warning('请填写数量')
    return
  }
  
  try {
    const res = await api.post('/trade/order', {
      pairId: currentPair.value.id,
      type: 2, // 市价
      side: side === 'buy' ? 1 : 2,
      amount: parseFloat(amount)
    })
    
    if (res.data.code === 200) {
      ElMessage.success('下单成功')
      fetchActiveOrders()
      if (side === 'buy') marketBuyAmount.value = ''
      else marketSellAmount.value = ''
    }
  } catch (err) {
    console.error('下单失败:', err)
  }
}

// 撤单
const cancelOrder = async (orderId) => {
  try {
    const res = await api.post(`/trade/cancel/${orderId}`)
    if (res.data.code === 200) {
      ElMessage.success('撤单成功')
      fetchActiveOrders()
    }
  } catch (err) {
    console.error('撤单失败:', err)
  }
}

// 格式化
const formatPrice = (price) => {
  return parseFloat(price).toFixed(2)
}

const formatAmount = (amount) => {
  return parseFloat(amount).toFixed(6)
}

const formatTime = (time) => {
  return new Date(time).toLocaleTimeString()
}

// 计算深度百分比
const getDepthPercent = (amount, type) => {
  const max = type === 'ask' ? maxDepth.value.ask : maxDepth.value.bid
  if (!max) return 0
  return Math.min((parseFloat(amount) / max) * 100, 100)
}

// 更新最大深度
const updateMaxDepth = () => {
  if (asks.value.length > 0) {
    maxDepth.value.ask = Math.max(...asks.value.map(a => parseFloat(a.amount)))
  }
  if (bids.value.length > 0) {
    maxDepth.value.bid = Math.max(...bids.value.map(b => parseFloat(b.amount)))
  }
}

// 初始化深度图
const initDepthChart = () => {
  if (!depthChartRef.value) return
  
  depthChart = echarts.init(depthChartRef.value)
  updateDepthChart()
}

// 更新深度图
const updateDepthChart = () => {
  if (!depthChart) return
  
  // 买单深度（累计）
  let bidSum = 0
  const bidData = [...bids.value].reverse().map(bid => {
    bidSum += parseFloat(bid.amount)
    return [parseFloat(bid.price), bidSum]
  })
  
  // 卖单深度（累计）
  let askSum = 0
  const askData = asks.value.map(ask => {
    askSum += parseFloat(ask.amount)
    return [parseFloat(ask.price), askSum]
  })
  
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 10, right: 10, top: 10, bottom: 10 },
    xAxis: {
      type: 'value',
      show: false,
      min: currentPrice.value ? currentPrice.value * 0.998 : undefined,
      max: currentPrice.value ? currentPrice.value * 1.002 : undefined
    },
    yAxis: { type: 'value', show: false },
    series: [
      {
        name: '买单',
        type: 'line',
        data: bidData,
        smooth: true,
        lineStyle: { width: 0 },
        areaStyle: { color: 'rgba(0, 212, 170, 0.3)' },
        symbol: 'none'
      },
      {
        name: '卖单',
        type: 'line',
        data: askData,
        smooth: true,
        lineStyle: { width: 0 },
        areaStyle: { color: 'rgba(255, 107, 107, 0.3)' },
        symbol: 'none'
      }
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let result = `价格: ${params[0].value[0].toFixed(2)}<br/>`
        params.forEach(p => {
          result += `${p.seriesName}: ${p.value[1].toFixed(4)}<br/>`
        })
        return result
      }
    }
  }
  
  depthChart.setOption(option)
}

// 添加滚动成交
const addScrollTrade = (trade) => {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  scrollTrades.value.unshift({
    ...trade,
    time: timeStr,
    isNew: true
  })
  
  // 限制数量
  if (scrollTrades.value.length > 50) {
    scrollTrades.value.pop()
  }
  
  // 移除new标记
  setTimeout(() => {
    if (scrollTrades.value[0]) {
      scrollTrades.value[0].isNew = false
    }
  }, 1000)
}

watch(() => asks.value, updateMaxDepth, { deep: true })
watch(() => bids.value, updateMaxDepth, { deep: true })
</script>

<style scoped>
.trade-page {
  padding: 16px;
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.trade-container {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/* 市场列表 */
.market-list {
  width: 240px;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  display: flex;
  flex-direction: column;
}

.market-header {
  padding: 12px;
  border-bottom: 1px solid #30363d;
}

.pairs-list {
  flex: 1;
  overflow-y: auto;
}

.pair-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 1px solid #21262d;
}

.pair-item:hover,
.pair-item.active {
  background: #21262d;
}

.pair-item .symbol {
  color: #fff;
  font-weight: 500;
}

.pair-item .price {
  font-family: monospace;
}

.pair-item .change {
  font-size: 12px;
}

/* 主交易区 */
.trade-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 280px 300px;
  grid-template-rows: 1fr auto;
  gap: 16px;
  min-height: 0;
}

.chart-area {
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  display: flex;
  flex-direction: column;
}

.pair-info {
  padding: 12px 16px;
  border-bottom: 1px solid #30363d;
  display: flex;
  align-items: center;
  gap: 16px;
}

.pair-info .symbol {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.pair-info .price {
  font-size: 20px;
  font-family: monospace;
  font-weight: 600;
}

.pair-info .change {
  font-size: 14px;
}

.chart-container {
  flex: 1;
  min-height: 300px;
}

/* 深度图和订单簿区域 */
.depth-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.depth-chart {
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 12px;
  height: 150px;
}

.depth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #8b949e;
}

.depth-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
}

.bid-legend {
  color: #00d4aa;
}

.ask-legend {
  color: #ff6b6b;
}

.depth-chart-container {
  height: calc(100% - 24px);
}

/* 订单簿深度条 */
.book-row {
  position: relative;
  overflow: hidden;
}

.depth-bar {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  opacity: 0.15;
  transition: width 0.3s ease;
  z-index: 0;
}

.depth-bar.ask-bar {
  background: #ff6b6b;
}

.depth-bar.bid-bar {
  background: #00d4aa;
}

.book-row span {
  position: relative;
  z-index: 1;
}

/* 订单簿 */
.order-book {
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  display: flex;
  flex-direction: column;
}

.book-header {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 12px;
  color: #8b949e;
  border-bottom: 1px solid #30363d;
}

.book-header span {
  flex: 1;
  text-align: right;
}

.book-header span:first-child {
  text-align: left;
}

.asks,
.bids {
  flex: 1;
  overflow-y: auto;
  font-size: 12px;
}

.asks {
  display: flex;
  flex-direction: column-reverse;
}

.book-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px;
}

.book-row span {
  flex: 1;
  text-align: right;
  font-family: monospace;
}

.book-row span:first-child {
  text-align: left;
}

.current-price {
  text-align: center;
  padding: 8px;
  font-size: 18px;
  font-weight: bold;
  font-family: monospace;
  border-top: 1px solid #30363d;
  border-bottom: 1px solid #30363d;
}

/* 交易表单 */
.trade-form {
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 12px;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.balance {
  font-size: 12px;
  color: #8b949e;
}

.total {
  font-size: 12px;
  color: #8b949e;
}

.trade-btn {
  width: 100%;
}

/* 订单面板 */
.orders-panel {
  width: 280px;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.orders-panel h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #fff;
}

.orders-list {
  flex: 1;
  overflow-y: auto;
}

.order-item {
  padding: 10px;
  border-bottom: 1px solid #21262d;
  font-size: 12px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.order-detail {
  display: flex;
  justify-content: space-between;
  color: #8b949e;
  margin-bottom: 6px;
}

/* 成交记录 */
.trades-section {
  height: 200px;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 12px;
  margin-top: 16px;
}

.trades-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #fff;
}

.trades-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trade-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid #21262d;
}

.trade-row span {
  flex: 1;
  text-align: center;
  font-family: monospace;
}

/* 成交记录头部 */
.trades-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #30363d;
}

.trades-header h4 {
  margin: 0;
  font-size: 14px;
  color: #fff;
}

.trades-tabs {
  display: flex;
  gap: 16px;
}

.trades-tabs span {
  font-size: 12px;
  color: #8b949e;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.trades-tabs span:hover {
  color: #fff;
}

.trades-tabs span.active {
  color: #00d4aa;
  background: #00d4aa22;
}

/* 实时滚动成交 */
.trades-scroll-container {
  height: 200px;
  position: relative;
  overflow: hidden;
}

.trades-scroll {
  height: calc(100% - 24px);
  overflow-y: auto;
  padding: 8px 12px;
}

.trade-scroll-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  font-size: 12px;
  font-family: monospace;
  border-bottom: 1px solid #21262d;
  transition: all 0.3s;
}

.trade-scroll-item.new-trade {
  background: rgba(0, 212, 170, 0.1);
  animation: flashTrade 1s ease-out;
}

@keyframes flashTrade {
  0% {
    background: rgba(0, 212, 170, 0.3);
  }
  100% {
    background: transparent;
  }
}

.trade-time {
  color: #8b949e;
  width: 70px;
}

.trade-side {
  width: 30px;
  text-align: center;
  font-weight: bold;
}

.trade-price {
  flex: 1;
  text-align: right;
}

.trade-amount {
  flex: 1;
  text-align: right;
  color: #8b949e;
}

.trade-total {
  flex: 1;
  text-align: right;
  color: #606266;
}

.scroll-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  padding: 4px;
  background: linear-gradient(transparent, #161b22);
  font-size: 11px;
  color: #00d4aa;
}

.scroll-hint span {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 过渡动画 */
.trade-flash-enter-active,
.trade-flash-leave-active {
  transition: all 0.5s ease;
}

.trade-flash-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.trade-flash-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 颜色 */
.up {
  color: #00d4aa;
}

.down {
  color: #ff6b6b;
}

.buy {
  color: #00d4aa;
}

.sell {
  color: #ff6b6b;
}

:deep(.el-input__wrapper) {
  background: #0d1117;
  box-shadow: none;
  border: 1px solid #30363d;
}

:deep(.el-input__inner) {
  color: #fff;
}

:deep(.el-tabs__item) {
  color: #8b949e;
}

:deep(.el-tabs__item.is-active) {
  color: #00d4aa;
}

:deep(.el-tabs__active-bar) {
  background-color: #00d4aa;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .trade-page {
    padding: 8px;
    height: auto;
    overflow-x: hidden;
  }
  
  .trade-container {
    flex-direction: column;
    gap: 8px;
  }
  
  /* 市场列表简化为选择器 */
  .market-list {
    width: 100%;
    max-height: 120px;
    background: transparent;
    border: none;
  }
  
  .market-header {
    padding: 0 0 8px 0;
  }
  
  .pairs-list {
    display: flex;
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
    padding: 4px;
  }
  
  .pair-item {
    min-width: 120px;
    flex-shrink: 0;
    padding: 8px 12px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
  }
  
  .pair-item .symbol {
    font-size: 13px;
  }
  
  .pair-item .price {
    font-size: 14px;
  }
  
  .pair-item .change {
    font-size: 11px;
  }
  
  /* 主交易区 */
  .trade-main {
    display: flex !important;
    flex-direction: column !important;
    gap: 8px;
    grid-template-columns: none !important;
    grid-template-rows: none !important;
  }
  
  /* K线图区域 */
  .chart-area {
    height: 240px;
    order: 1;
  }
  
  .pair-info {
    padding: 8px 12px;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .pair-info .symbol {
    font-size: 16px;
    width: 100%;
  }
  
  .pair-info .price {
    font-size: 20px;
  }
  
  .chart-container {
    min-height: 180px;
    height: 180px;
  }
  
  /* 深度区域 - 隐藏深度图，只显示订单簿 */
  .depth-section {
    order: 2;
    gap: 8px;
  }
  
  .depth-chart-wrapper {
    display: none;
  }
  
  /* 订单簿 */
  .order-book {
    display: flex;
    flex-direction: row;
    height: 180px;
    font-size: 11px;
  }
  
  .book-header {
    padding: 6px 8px;
    font-size: 10px;
  }
  
  .book-row {
    padding: 3px 8px;
  }
  
  .current-price {
    font-size: 14px;
    padding: 6px;
    min-width: 50px;
  }
  
  /* 交易表单 */
  .trade-form {
    order: 3;
    width: 100%;
    padding: 12px;
  }
  
  .form-content {
    gap: 10px;
  }
  
  .balance {
    font-size: 11px;
  }
  
  .total {
    font-size: 11px;
  }
  
  .trade-btn {
    height: 40px;
    font-size: 14px;
  }
  
  /* 订单面板 */
  .orders-panel {
    width: 100%;
    order: 4;
    max-height: 250px;
  }
  
  .orders-tabs {
    font-size: 12px;
  }
  
  /* 成交记录 */
  .trades-section {
    max-height: 150px;
  }
  
  .trades-tabs {
    font-size: 12px;
  }
  
  .trades-list {
    font-size: 11px;
  }
  
  .trade-row {
    padding: 6px 8px;
  }
}
</style>