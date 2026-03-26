<template>
  <div class="market-page">
    <h2>行情</h2>
    
    <!-- 热门行情 -->
    <section class="market-section">
      <div class="section-header">
        <h3 class="section-title">热门行情</h3>
        <div class="live-indicator">
          <span class="live-dot"></span>
          <span class="live-text">实时动态</span>
        </div>
      </div>
      <div class="market-table">
        <div class="market-header">
          <div class="col-pair">币种 / 成交额</div>
          <div class="col-price">最新价 ▾</div>
          <div class="col-change">涨跌幅 ▾</div>
        </div>
        <div class="market-list">
          <div v-for="(item, index) in marketData" :key="index" class="market-item" @click="goToTrade(item)">
            <div class="col-pair">
              <div class="coin-info">
                <div class="coin-icon" :style="{ background: item.iconBg }">
                  <span>{{ item.symbol[0] }}</span>
                </div>
                <div class="coin-detail">
                  <div class="coin-name">{{ item.pair }}</div>
                  <div class="coin-volume">{{ item.name }} {{ item.volume }}</div>
                </div>
              </div>
            </div>
            <div class="col-price">
              <div class="price-usd" :class="item.flash">{{ item.price }}</div>
              <div class="price-cny">≈ {{ item.priceCny }}</div>
            </div>
            <div class="col-change">
              <div class="change-badge" :class="item.change >= 0 ? 'up' : 'down'">
                {{ item.change >= 0 ? '+' : '' }}{{ item.change }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 热门行情数据
const marketData = ref([
  { pair: 'BTC/USDT', symbol: 'BTC', name: '比特币', price: '71,280.08', priceCny: '¥491,143.40', change: -0.2, volume: '8.59亿', iconBg: '#f7931a', flash: '' },
  { pair: 'ETH/USDT', symbol: 'ETH', name: '以太坊', price: '2,167.57', priceCny: '¥14,965.66', change: 0.36, volume: '4.16亿', iconBg: '#627eea', flash: '' },
  { pair: 'SOL/USDT', symbol: 'SOL', name: 'Solana', price: '92.27', priceCny: '¥637.54', change: 0.87, volume: '5950万', iconBg: '#00ffa3', flash: '' },
  { pair: 'DOGE/USDT', symbol: 'DOGE', name: '狗狗币', price: '0.1695', priceCny: '¥1.17', change: 5.23, volume: '3.2亿', iconBg: '#c2a633', flash: 'flash-up' },
  { pair: 'XRP/USDT', symbol: 'XRP', name: '瑞波币', price: '0.6234', priceCny: '¥4.30', change: -1.15, volume: '1.8亿', iconBg: '#23292f', flash: 'flash-down' },
  { pair: 'ADA/USDT', symbol: 'ADA', name: '艾达币', price: '0.4521', priceCny: '¥3.12', change: 0.45, volume: '8900万', iconBg: '#0033ad', flash: '' },
  { pair: 'DOT/USDT', symbol: 'DOT', name: '波卡', price: '7.2345', priceCny: '¥49.88', change: -0.82, volume: '1.52亿', iconBg: '#e6007a', flash: '' },
  { pair: 'LINK/USDT', symbol: 'LINK', name: 'Chainlink', price: '14.567', priceCny: '¥100.46', change: 3.42, volume: '1.28亿', iconBg: '#2a5ada', flash: 'flash-up' },
  { pair: 'AVAX/USDT', symbol: 'AVAX', name: 'Avalanche', price: '42.18', priceCny: '¥290.80', change: 1.85, volume: '9800万', iconBg: '#e84142', flash: '' },
  { pair: 'MATIC/USDT', symbol: 'MATIC', name: 'Polygon', price: '0.8923', priceCny: '¥6.15', change: -0.65, volume: '7200万', iconBg: '#8247e5', flash: '' },
  { pair: 'LTC/USDT', symbol: 'LTC', name: '莱特币', price: '78.45', priceCny: '¥541.20', change: 0.92, volume: '6500万', iconBg: '#345d9d', flash: '' },
  { pair: 'BCH/USDT', symbol: 'BCH', name: '比特币现金', price: '412.30', priceCny: '¥2,844.50', change: -1.25, volume: '4800万', iconBg: '#8dc351', flash: '' },
  { pair: 'UNI/USDT', symbol: 'UNI', name: 'Uniswap', price: '9.856', priceCny: '¥67.98', change: 2.15, volume: '4200万', iconBg: '#ff007a', flash: 'flash-up' },
  { pair: 'ATOM/USDT', symbol: 'ATOM', name: 'Cosmos', price: '8.923', priceCny: '¥61.55', change: -0.45, volume: '3800万', iconBg: '#2e3148', flash: '' },
  { pair: 'ETC/USDT', symbol: 'ETC', name: '以太坊经典', price: '26.78', priceCny: '¥184.70', change: 1.35, volume: '3200万', iconBg: '#328332', flash: '' },
  { pair: 'FIL/USDT', symbol: 'FIL', name: 'Filecoin', price: '6.234', priceCny: '¥43.00', change: -2.15, volume: '2800万', iconBg: '#0090ff', flash: 'flash-down' },
  { pair: 'TRX/USDT', symbol: 'TRX', name: '波场', price: '0.1156', priceCny: '¥0.80', change: 0.75, volume: '2500万', iconBg: '#ff060a', flash: '' },
  { pair: 'XLM/USDT', symbol: 'XLM', name: '恒星币', price: '0.1089', priceCny: '¥0.75', change: -0.35, volume: '2200万', iconBg: '#14b6e7', flash: '' },
  { pair: 'VET/USDT', symbol: 'VET', name: '唯链', price: '0.0345', priceCny: '¥0.24', change: 1.85, volume: '1900万', iconBg: '#15bdff', flash: '' },
  { pair: 'EOS/USDT', symbol: 'EOS', name: '柚子', price: '0.789', priceCny: '¥5.44', change: -1.05, volume: '1650万', iconBg: '#000000', flash: '' }
])

// 模拟实时更新
let interval = null

const updatePrices = () => {
  marketData.value.forEach(item => {
    const change = (Math.random() - 0.5) * 0.1
    const price = parseFloat(item.price.replace(/,/g, ''))
    const newPrice = price * (1 + change / 100)
    item.price = newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    item.change = parseFloat((item.change + (Math.random() - 0.5) * 0.5).toFixed(2))
    item.flash = change > 0 ? 'flash-up' : change < 0 ? 'flash-down' : ''
  })
}

const goToTrade = (item) => {
  router.push('/trade')
}

onMounted(() => {
  interval = setInterval(updatePrices, 3000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<style scoped>
.market-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  color: #fff;
  margin-bottom: 24px;
}

/* 热门行情 */
.market-section {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  color: #fff;
  margin: 0;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #00d4aa;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-text {
  font-size: 14px;
  color: #8b949e;
}

.market-table {
  width: 100%;
}

.market-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  padding: 12px 16px;
  background: #21262d;
  border-radius: 8px;
  font-size: 14px;
  color: #8b949e;
  margin-bottom: 8px;
}

.market-list {
  max-height: 400px;
  overflow-y: auto;
}

.market-item {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  padding: 16px;
  border-bottom: 1px solid #30363d;
  align-items: center;
  cursor: pointer;
  transition: background 0.3s;
}

.market-item:hover {
  background: #21262d;
}

.market-item:last-child {
  border-bottom: none;
}

.coin-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.coin-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  font-size: 16px;
  flex-shrink: 0;
}

.coin-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coin-name {
  font-weight: 600;
  color: #fff;
  font-size: 16px;
}

.coin-volume {
  font-size: 12px;
  color: #8b949e;
}

.col-price {
  text-align: left;
}

.price-usd {
  font-weight: 600;
  color: #fff;
  font-size: 16px;
}

.price-cny {
  font-size: 12px;
  color: #8b949e;
  margin-top: 2px;
}

.col-change {
  text-align: right;
}

.change-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.2);
}

.change-badge.up {
  background: rgba(0, 212, 170, 0.15);
}

.change-badge.down {
  background: rgba(248, 81, 73, 0.15);
}

.flash-up {
  animation: flashUp 0.5s;
}

.flash-down {
  animation: flashDown 0.5s;
}

@keyframes flashUp {
  0%, 100% { color: #fff; }
  50% { color: #00d4aa; }
}

@keyframes flashDown {
  0%, 100% { color: #fff; }
  50% { color: #f85149; }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .market-page {
    padding: 16px;
    padding-bottom: 80px;
  }

  h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .market-header {
    padding: 10px 12px;
    font-size: 12px;
  }

  .market-item {
    padding: 12px;
  }

  .coin-icon {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .coin-name {
    font-size: 14px;
  }

  .price-usd {
    font-size: 14px;
  }

  .change-badge {
    padding: 4px 8px;
    font-size: 12px;
  }

  .market-list {
    max-height: none;
  }
}
</style>
