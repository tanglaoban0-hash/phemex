<template>
  <div class="option-trading-page">
    <div class="trading-container">
      <!-- 左侧：价格走势 -->
      <div class="chart-section">
        <div class="pair-header">
          <el-select v-model="selectedPair" @change="changePair">
            <el-option
              v-for="pair in pairs"
              :key="pair.id"
              :label="pair.symbol"
              :value="pair.id"
            />
          </el-select>
          <div class="current-price" :class="priceChange >= 0 ? 'up' : 'down'">
            {{ formatPrice(currentPrice) }}
            <span class="change">{{ priceChange >= 0 ? '+' : '' }}{{ priceChange }}%</span>
          </div>
        </div>
        <div ref="chartRef" class="chart"></div>
      </div>

      <!-- 右侧：交易面板 -->
      <div class="trading-panel">
        <h3>秒合约交易</h3>
        
        <!-- 合约类型选择 -->
        <div class="contract-types">
          <div
            v-for="contract in contracts"
            :key="contract.id"
            class="contract-item"
            :class="{ active: selectedContract?.id === contract.id }"
            @click="selectContract(contract)"
          >
            <div class="name">{{ contract.name }}</div>
            <div class="profit">+{{ (contract.profit_rate * 100).toFixed(0) }}%</div>
          </div>
        </div>

        <!-- 金额输入 -->
        <div class="amount-section">
          <label>投资金额 (USDT)</label>
          <el-input-number
            v-model="tradeAmount"
            :min="selectedContract?.min_amount || 10"
            :max="selectedContract?.max_amount || 10000"
            :step="10"
            controls-position="right"
            class="amount-input"
          />
          <div class="quick-amounts">
            <el-button
              v-for="amt in quickAmounts"
              :key="amt"
              size="small"
              @click="tradeAmount = amt"
            >
              {{ amt }}
            </el-button>
          </div>
        </div>

        <!-- 预测收益 -->
        <div class="profit-preview">
          <span>预计收益: </span>
          <span class="profit-value">+{{ calculateProfit }} USDT</span>
        </div>

        <!-- 涨跌按钮 -->
        <div class="direction-buttons">
          <el-button
            type="success"
            class="up-btn"
            :loading="loading"
            @click="confirmPlaceOrder(1)"
          >
            <el-icon><ArrowUp /></el-icon>
            看涨
          </el-button>
          <el-button
            type="danger"
            class="down-btn"
            :loading="loading"
            @click="confirmPlaceOrder(2)"
          >
            <el-icon><ArrowDown /></el-icon>
            看跌
          </el-button>
        </div>

        <!-- 当前持仓 -->
        <div class="active-orders" v-if="activeOrders.length > 0">
          <h4>进行中</h4>
          <div
            v-for="order in activeOrders"
            :key="order.id"
            class="order-item"
          >
            <div class="order-header">
              <span :class="order.direction === 1 ? 'up' : 'down'">
                {{ order.direction === 1 ? '看涨' : '看跌' }}
              </span>
              <span class="countdown">{{ formatCountdown(order.remainingSeconds) }}</span>
            </div>
            <div class="order-info">
              <span>{{ order.pair_symbol }}</span>
              <span>{{ order.amount }} USDT</span>
            </div>
            <div class="order-price">
              <span>开仓: {{ formatPrice(order.start_price) }}</span>
              <span>当前: {{ formatPrice(currentPrice) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="history-section">
      <h4>历史记录</h4>
      <el-table :data="historyOrders" style="width: 100%">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column label="交易对" prop="pair_symbol" />
        <el-table-column label="方向" width="80">
          <template #default="{ row }">
            <span :class="row.direction === 1 ? 'up' : 'down'">
              {{ row.direction === 1 ? '看涨' : '看跌' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="金额" prop="amount" />
        <el-table-column label="开始价格" prop="start_price" />
        <el-table-column label="结束价格" prop="end_price" />
        <el-table-column label="盈亏" prop="profit_amount">
          <template #default="{ row }">
            <span :class="row.profit_amount > 0 ? 'up' : row.profit_amount < 0 ? 'down' : ''">
              {{ row.profit_amount > 0 ? '+' : '' }}{{ row.profit_amount }} USDT
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" prop="created_at">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import io from 'socket.io-client'

const userStore = useUserStore()

// 数据
const pairs = ref([])
const contracts = ref([])
const selectedPair = ref(null)
const selectedContract = ref(null)
const currentPrice = ref(0)
const priceChange = ref(0)
const tradeAmount = ref(10)
const loading = ref(false)
const activeOrders = ref([])
const historyOrders = ref([])
const quickAmounts = [10, 50, 100, 500, 1000]

// 图表
const chartRef = ref(null)
let chart = null
let socket = null
let countdownTimer = null

// 计算属性
const calculateProfit = computed(() => {
  if (!selectedContract.value || !tradeAmount.value) return '0.00'
  return (tradeAmount.value * selectedContract.value.profit_rate).toFixed(2)
})

// 初始化
onMounted(async () => {
  await fetchPairs()
  await fetchContracts()
  initSocket()
  startCountdown()
  fetchHistory()
})

onUnmounted(() => {
  if (socket) socket.disconnect()
  if (chart) chart.dispose()
  if (countdownTimer) clearInterval(countdownTimer)
})

// 获取交易对列表
const fetchPairs = async () => {
  try {
    const res = await api.get('/market/pairs')
    if (res.data.code === 200) {
      pairs.value = res.data.data
      if (pairs.value.length > 0) {
        selectedPair.value = pairs.value[0].id
        currentPrice.value = parseFloat(pairs.value[0].price)
        priceChange.value = parseFloat(pairs.value[0].price_change_24h)
        fetchKline()
      }
    }
  } catch (err) {
    console.error('获取交易对失败:', err)
  }
}

// 获取合约类型
const fetchContracts = async () => {
  try {
    const res = await api.get('/option/contracts')
    if (res.data.code === 200) {
      contracts.value = res.data.data
      if (contracts.value.length > 0) {
        selectedContract.value = contracts.value[0]
      }
    }
  } catch (err) {
    console.error('获取合约类型失败:', err)
  }
}

// 获取K线数据
const fetchKline = async () => {
  if (!selectedPair.value) return
  try {
    const timestamp = Date.now()
    const res = await api.get(`/market/kline?pairId=${selectedPair.value}&period=1m&limit=100&_t=${timestamp}`)
    if (res.data.code === 200) {
      initChart(res.data.data)
    }
  } catch (err) {
    console.error('获取K线失败:', err)
  }
}

// 初始化K线图
const initChart = (data) => {
  nextTick(() => {
    if (!chartRef.value) return
    
    if (chart) chart.dispose()
    
    chart = echarts.init(chartRef.value)
    
    // 转换数据为K线格式 [open, close, low, high]
    const klineData = data.map(d => [d.open, d.close, d.low, d.high])
    // 转换时间戳为北京时间字符串
    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    }
    
    const times = data.map(d => formatTime(d.timestamp))
    
    const option = {
      backgroundColor: 'transparent',
      animation: true,
      grid: { left: '5%', right: '5%', top: '10%', bottom: '10%' },
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: '#30363d' } },
        axisLabel: { color: '#8b949e', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: '#21262d' } },
        axisLabel: { color: '#8b949e', fontSize: 10 }
      },
      series: [{
        type: 'candlestick',
        data: klineData,
        itemStyle: {
          color: '#00d4aa',      // 涨 - 绿色
          color0: '#ff6b6b',     // 跌 - 红色
          borderColor: '#00d4aa',
          borderColor0: '#ff6b6b'
        }
      }]
    }
    
    chart.setOption(option)
  })
}

// 动态更新图表数据
const updateChartRealtime = (newData) => {
  if (!chart) return
  
  const currentOption = chart.getOption()
  const times = currentOption.xAxis[0].data
  const klineData = currentOption.series[0].data
  
  // 添加新数据（处理秒级或毫秒级时间戳）
  const ts = newData.timestamp > 1000000000000 ? newData.timestamp : newData.timestamp * 1000
  const date = new Date(ts)
  // 使用北京时间 (UTC+8)
  const beijingTime = new Date(date.getTime() + (date.getTimezoneOffset() + 480) * 60000)
  const hours = String(beijingTime.getHours()).padStart(2, '0')
  const minutes = String(beijingTime.getMinutes()).padStart(2, '0')
  times.push(`${hours}:${minutes}`)
  klineData.push([newData.open, newData.close, newData.low, newData.high])
  
  // 保持最多100条数据，移除旧数据
  if (times.length > 100) {
    times.shift()
    klineData.shift()
  }
  
  chart.setOption({
    xAxis: { data: times },
    series: [{ data: klineData }]
  })
}

// WebSocket连接
const initSocket = () => {
  socket = io('http://localhost:3000')
  
  socket.on('connect', () => {
    console.log('WebSocket已连接')
  })
  
  socket.on('ticker', (data) => {
    if (data.pairId === selectedPair.value) {
      currentPrice.value = parseFloat(data.price)
      priceChange.value = parseFloat(data.change)
    }
  })
  
  // 实时接收K线数据更新
  socket.on('kline_update', (data) => {
    if (data.pairId === selectedPair.value) {
      updateChartRealtime(data)
    }
  })
  
  socket.on('option_settled', (data) => {
    ElMessage.success(`订单结算: ${data.profitAmount > 0 ? '盈利+' + data.profitAmount : '亏损' + data.profitAmount} USDT`)
    fetchActiveOrders()
    fetchHistory()
  })
}

// 切换交易对
const changePair = (pairId) => {
  const pair = pairs.value.find(p => p.id === pairId)
  if (pair) {
    currentPrice.value = parseFloat(pair.price)
    priceChange.value = parseFloat(pair.price_change_24h)
    fetchKline()
    fetchActiveOrders()
  }
}

// 选择合约
const selectContract = (contract) => {
  selectedContract.value = contract
  tradeAmount.value = contract.min_amount
}

// 确认下单
const confirmPlaceOrder = async (direction) => {
  if (!selectedContract.value) {
    ElMessage.warning('请选择合约类型')
    return
  }
  
  if (!tradeAmount.value || tradeAmount.value < selectedContract.value.min_amount) {
    ElMessage.warning(`最小金额为 ${selectedContract.value.min_amount} USDT`)
    return
  }
  
  const directionText = direction === 1 ? '看涨' : '看跌'
  const pairSymbol = pairs.value.find(p => p.id === selectedPair.value)?.symbol || ''
  
  try {
    await ElMessageBox.confirm(
      `<div style="text-align: center;">
        <p style="font-size: 18px; margin-bottom: 16px;"><strong>${directionText} ${pairSymbol}</strong></p>
        <p>投资金额: <span style="color: #00d4aa; font-weight: bold;">${tradeAmount.value} USDT</span></p>
        <p>预计收益: <span style="color: #00d4aa; font-weight: bold;">+${calculateProfit.value} USDT</span></p>
        <p style="color: #8b949e; font-size: 12px; margin-top: 8px;">确认后不可撤销，请谨慎操作</p>
      </div>`,
      '确认下单',
      {
        confirmButtonText: '确认下单',
        cancelButtonText: '取消',
        type: direction === 1 ? 'success' : 'danger',
        dangerouslyUseHTMLString: true,
        center: true
      }
    )
    
    // 用户确认，执行下单
    await placeOrder(direction)
  } catch (err) {
    // 用户取消，不做任何操作
    if (err !== 'cancel') {
      console.error('确认失败:', err)
    }
  }
}

// 下单
const placeOrder = async (direction) => {
  loading.value = true
  try {
    const res = await api.post('/option/order', {
      pairId: selectedPair.value,
      contractId: selectedContract.value.id,
      direction,
      amount: tradeAmount.value
    })
    
    if (res.data.code === 200) {
      ElMessage.success('下单成功')
      fetchActiveOrders()
    }
  } catch (err) {
    console.error('下单失败:', err)
  } finally {
    loading.value = false
  }
}

// 获取进行中的订单
const fetchActiveOrders = async () => {
  try {
    const res = await api.get('/option/active')
    if (res.data.code === 200) {
      activeOrders.value = res.data.data
    }
  } catch (err) {
    console.error('获取活跃订单失败:', err)
  }
}

// 获取历史记录
const fetchHistory = async () => {
  try {
    const res = await api.get('/option/history')
    if (res.data.code === 200) {
      historyOrders.value = res.data.data.list
    }
  } catch (err) {
    console.error('获取历史记录失败:', err)
  }
}

// 倒计时
const startCountdown = () => {
  countdownTimer = setInterval(() => {
    activeOrders.value.forEach(order => {
      if (order.remainingSeconds > 0) {
        order.remainingSeconds--
      }
    })
    fetchActiveOrders()
  }, 1000)
}

const formatCountdown = (seconds) => {
  if (seconds <= 0) return '结算中...'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 格式化
const formatPrice = (price) => {
  return parseFloat(price).toFixed(2)
}

const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}

const getStatusType = (status) => {
  const types = { 0: 'info', 1: 'success', 2: 'danger', 3: 'warning' }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = { 0: '进行中', 1: '盈利', 2: '亏损', 3: '平局' }
  return texts[status] || '未知'
}

// 监听选中交易对变化
watch(selectedPair, (newVal) => {
  if (newVal && socket) {
    socket.emit('subscribe', { pairId: newVal })
  }
})
</script>

<style scoped>
.option-trading-page {
  padding: 16px;
  min-height: calc(100vh - 64px);
  background: #0d1117;
}

.trading-container {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.chart-section {
  flex: 1;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 16px;
}

.pair-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.current-price {
  font-size: 24px;
  font-weight: bold;
  font-family: monospace;
}

.current-price .change {
  font-size: 14px;
  margin-left: 8px;
}

.chart {
  height: 400px;
}

.trading-panel {
  width: 360px;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 20px;
}

.trading-panel h3 {
  margin: 0 0 20px 0;
  color: #fff;
  font-size: 18px;
}

.contract-types {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.contract-item {
  flex: 1;
  padding: 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.contract-item:hover,
.contract-item.active {
  border-color: #00d4aa;
  background: rgba(0, 212, 170, 0.1);
}

.contract-item .name {
  font-size: 12px;
  color: #8b949e;
  margin-bottom: 4px;
}

.contract-item .profit {
  font-size: 16px;
  font-weight: bold;
  color: #00d4aa;
}

.amount-section {
  margin-bottom: 20px;
}

.amount-section label {
  display: block;
  color: #8b949e;
  font-size: 12px;
  margin-bottom: 8px;
}

.amount-input {
  width: 100%;
  margin-bottom: 12px;
}

.amount-input :deep(.el-input__inner) {
  background: #0d1117;
  border-color: #30363d;
  color: #fff;
}

.quick-amounts {
  display: flex;
  gap: 8px;
}

.quick-amounts .el-button {
  flex: 1;
  background: #0d1117;
  border-color: #30363d;
  color: #8b949e;
}

.quick-amounts .el-button:hover {
  border-color: #00d4aa;
  color: #00d4aa;
}

.profit-preview {
  text-align: center;
  padding: 16px;
  background: #0d1117;
  border-radius: 8px;
  margin-bottom: 20px;
}

.profit-preview span {
  color: #8b949e;
}

.profit-value {
  color: #00d4aa;
  font-size: 20px;
  font-weight: bold;
  margin-left: 8px;
}

.direction-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.direction-buttons .el-button {
  flex: 1;
  height: 60px;
  font-size: 18px;
  font-weight: bold;
}

.up-btn {
  background: linear-gradient(135deg, #00d4aa, #00a8e8);
  border: none;
}

.down-btn {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  border: none;
}

.active-orders {
  border-top: 1px solid #30363d;
  padding-top: 16px;
}

.active-orders h4 {
  margin: 0 0 12px 0;
  color: #fff;
  font-size: 14px;
}

.order-item {
  background: #0d1117;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.order-header span {
  font-weight: bold;
}

.countdown {
  color: #f59e0b;
  font-family: monospace;
}

.order-info,
.order-price {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #8b949e;
  margin-top: 4px;
}

.history-section {
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 16px;
}

.history-section h4 {
  margin: 0 0 16px 0;
  color: #fff;
}

.up {
  color: #00d4aa;
}

.down {
  color: #ff6b6b;
}

:deep(.el-table) {
  background: transparent;
}

:deep(.el-table th),
:deep(.el-table td) {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  color: #fff;
}

/* 修复选中行样式 */
:deep(.el-table__body tr.current-row > td) {
  background: #21262d !important;
  color: #fff !important;
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background: #21262d !important;
  color: #fff !important;
}

:deep(.el-table__body tr.highlight-row > td) {
  background: #00d4aa20 !important;
  color: #fff !important;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .option-trading-page {
    padding: 8px;
  }

  .trading-container {
    flex-direction: column;
    gap: 12px;
  }

  .chart-section {
    width: 100%;
    order: 1;
    padding: 12px;
  }

  .trading-panel {
    width: 100%;
    order: 2;
    padding: 16px;
    box-sizing: border-box;
  }

  .chart {
    height: 250px;
  }

  .pair-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .current-price {
    font-size: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .current-price .change {
    font-size: 14px;
  }

  .contract-types {
    overflow-x: auto;
    flex-wrap: nowrap;
    gap: 6px;
  }

  .contract-item {
    min-width: 70px;
    padding: 8px;
  }

  .quick-amounts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 12px;
    justify-items: stretch;
    align-items: center;
  }

  .quick-amounts .el-button {
    width: 100%;
    margin: 0;
    height: 48px;
    font-size: 18px;
    font-weight: 500;
    border-radius: 8px;
  }

  /* 让最后两个按钮居中排列 */
  .quick-amounts .el-button:nth-child(4) {
    grid-column: 1 / 2;
  }
  
  .quick-amounts .el-button:nth-child(5) {
    grid-column: 2 / 3;
  }

  .direction-buttons .el-button {
    height: 50px;
    font-size: 16px;
  }

  .history-section {
    overflow-x: auto;
  }

  .history-section .el-table {
    min-width: 700px;
  }
}
</style>