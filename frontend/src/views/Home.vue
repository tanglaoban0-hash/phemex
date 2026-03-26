<template>
  <div class="home-page">
    <!-- 滚动行情条 -->
    <div class="ticker-bar">
      <div class="ticker-wrapper">
        <div class="ticker-content">
          <div v-for="(item, index) in tickerData" :key="index" class="ticker-item">
            <span class="ticker-pair">{{ item.pair }}</span>
            <span class="ticker-price" :class="item.change >= 0 ? 'up' : 'down'">{{ item.price }}</span>
            <span class="ticker-change" :class="item.change >= 0 ? 'up' : 'down'">{{ item.change >= 0 ? '+' : '' }}{{ item.change }}%</span>
          </div>
          <div v-for="(item, index) in tickerData" :key="'dup-'+index" class="ticker-item">
            <span class="ticker-pair">{{ item.pair }}</span>
            <span class="ticker-price" :class="item.change >= 0 ? 'up' : 'down'">{{ item.price }}</span>
            <span class="ticker-change" :class="item.change >= 0 ? 'up' : 'down'">{{ item.change >= 0 ? '+' : '' }}{{ item.change }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">Phemex</h1>
        <p class="hero-subtitle">专业级数字资产交易平台</p>
        <p class="hero-desc">安全、稳定、高效的加密货币交易体验</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="goToTrade">
            开始交易
          </el-button>
          <el-button size="large" @click="$router.push('/register')" v-if="!userStore.isLogin">
            立即注册
          </el-button>
          <!-- 下载APP按钮 - 移动端显示 -->
          <el-button 
            class="install-app-btn" 
            size="large" 
            @click="installApp"
          >
            📲 下载APP
          </el-button>
        </div>
      </div>
      <div class="hero-stats">
        <div class="stat-item">
          <div class="stat-value">$2.5B+</div>
          <div class="stat-label">24h交易量</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">500+</div>
          <div class="stat-label">交易对</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">10M+</div>
          <div class="stat-label">全球用户</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">99.9%</div>
          <div class="stat-label">系统稳定性</div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <h2 class="section-title">为什么选择我们</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>安全可靠</h3>
          <p>采用银行级安全架构，冷热钱包分离存储，多重签名技术保障资产安全</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>极速交易</h3>
          <p>百万级TPS撮合引擎，毫秒级订单响应，支持高频交易策略</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💰</div>
          <h3>秒合约</h3>
          <p>30秒到30分钟多种期限选择，最高收益率可达95%，简单预测涨跌即可盈利</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">👥</div>
          <h3>邀请奖励</h3>
          <p>邀请好友注册交易，双方均可获得丰厚奖励，多级返佣机制</p>
        </div>
      </div>
    </section>

    <!-- Invite Section -->
    <section class="invite-section">
      <div class="invite-content">
        <h2 class="section-title">邀请好友 共享收益</h2>
        <p class="invite-desc">每成功邀请一位好友，您可获得其交易手续费的20%作为返佣</p>
        <div class="invite-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-text">获取专属邀请码</div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-text">分享给好友</div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-text">好友完成注册</div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-text">获得返佣奖励</div>
          </div>
        </div>
        <div class="invite-actions" v-if="userStore.isLogin">
          <div class="invite-code-box">
            <span class="label">我的邀请码：</span>
            <span class="code">{{ userStore.userInfo?.invite_code || '---' }}</span>
            <el-button type="primary" size="small" @click="copyInviteCode">复制</el-button>
          </div>
        </div>
        <div class="invite-actions" v-else>
          <el-button type="primary" size="large" @click="$router.push('/register')">
            立即注册获取邀请码
          </el-button>
        </div>
      </div>
    </section>

    <!-- Security Section -->
    <section class="security-section">
      <h2 class="section-title">安全保障</h2>
      <div class="security-grid">
        <div class="security-item">
          <div class="security-icon">🔐</div>
          <h4>SSL加密传输</h4>
          <p>全站采用HTTPS加密，保障数据传输安全</p>
        </div>
        <div class="security-item">
          <div class="security-icon">🔑</div>
          <h4>资金密码</h4>
          <p>独立资金密码，提现需二次验证</p>
        </div>
        <div class="security-item">
          <div class="security-icon">📱</div>
          <h4>手机验证</h4>
          <p>关键操作需手机验证码确认</p>
        </div>
        <div class="security-item">
          <div class="security-icon">✅</div>
          <h4>实名认证</h4>
          <p>KYC认证体系，保障账户真实安全</p>
        </div>
        <div class="security-item">
          <div class="security-icon">🧊</div>
          <h4>冷钱包存储</h4>
          <p>98%资产离线存储，杜绝黑客攻击</p>
        </div>
        <div class="security-item">
          <div class="security-icon">📊</div>
          <h4>风控系统</h4>
          <p>7×24小时智能风控监测</p>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <h2>准备好开始了吗？</h2>
      <p>加入数百万用户，开启您的数字资产交易之旅</p>
      <div class="cta-actions">
        <el-button type="primary" size="large" @click="goToTrade">
          {{ userStore.isLogin ? '立即交易' : '免费注册' }}
        </el-button>
        <el-button size="large" @click="$router.push('/trade/home')" v-if="userStore.isLogin">
          返回首页
        </el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const router = useRouter()

// 滚动行情条数据
const tickerData = ref([
  { pair: 'BTC/USDT', price: '67,234.56', change: 2.35 },
  { pair: 'ETH/USDT', price: '3,456.78', change: -1.24 },
  { pair: 'SOL/USDT', price: '178.90', change: 5.67 },
  { pair: 'XRP/USDT', price: '0.6234', change: -0.89 },
  { pair: 'DOGE/USDT', price: '0.1789', change: 8.45 },
  { pair: 'ADA/USDT', price: '0.4521', change: 1.25 },
  { pair: 'DOT/USDT', price: '7.2345', change: -0.82 },
  { pair: 'LINK/USDT', price: '14.567', change: 3.42 }
])

onMounted(() => {
  // 首页加载完成
})

onUnmounted(() => {
  // 清理工作
})

const goToTrade = () => {
  router.push('/trade')
}

// 安装APP
const installApp = () => {
  // 检测是否是iOS设备
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  
  if (isIOS) {
    // iOS Safari 提示手动添加
    ElMessage({
      message: '请点击浏览器底部的"分享"按钮，然后选择"添加到主屏幕"',
      type: 'info',
      duration: 5000
    })
  } else {
    // Android Chrome 尝试自动安装
    ElMessage({
      message: '请点击浏览器菜单，选择"添加到主屏幕"或"安装应用"',
      type: 'info',
      duration: 5000
    })
  }
}

const copyInviteCode = () => {
  const code = userStore.userInfo?.invite_code
  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      ElMessage.success('邀请码已复制')
    })
  }
}
</script>

<style scoped>
.home-page {
  background: #0d1117;
  color: #fff;
}

/* Hero Section */
.hero-section {
  padding: 80px 24px;
  text-align: center;
  background: linear-gradient(180deg, #161b22 0%, #0d1117 100%);
}

.hero-content {
  max-width: 800px;
  margin: 0 auto 60px;
}

.hero-title {
  font-size: 56px;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(90deg, #00d4aa, #00a8e8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 28px;
  color: #fff;
  margin-bottom: 12px;
}

.hero-desc {
  font-size: 16px;
  color: #8b949e;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.hero-actions .el-button {
  min-width: 140px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 60px;
  flex-wrap: wrap;
  max-width: 1000px;
  margin: 0 auto;
  padding-top: 40px;
  border-top: 1px solid #30363d;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #00d4aa;
  font-family: monospace;
}

.stat-label {
  font-size: 14px;
  color: #8b949e;
  margin-top: 4px;
}

/* Features Section */
.features-section {
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 36px;
  font-weight: 600;
  margin-bottom: 48px;
  color: #fff;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.feature-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  transition: all 0.3s;
}

.feature-card:hover {
  border-color: #00d4aa;
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 20px;
  color: #fff;
  margin-bottom: 12px;
}

.feature-card p {
  font-size: 14px;
  color: #8b949e;
  line-height: 1.6;
}

/* Invite Section */
.invite-section {
  padding: 80px 24px;
  background: linear-gradient(180deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
}

.invite-content {
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
}

.invite-desc {
  font-size: 18px;
  color: #8b949e;
  margin-bottom: 40px;
}

.invite-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #00d4aa, #00a8e8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.step-text {
  font-size: 14px;
  color: #8b949e;
}

.step-arrow {
  font-size: 24px;
  color: #00d4aa;
}

.invite-actions {
  margin-top: 32px;
}

.invite-code-box {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #161b22;
  border: 1px solid #30363d;
  padding: 16px 24px;
  border-radius: 8px;
}

.invite-code-box .label {
  color: #8b949e;
}

.invite-code-box .code {
  font-size: 24px;
  font-weight: 600;
  color: #00d4aa;
  font-family: monospace;
  letter-spacing: 2px;
}

/* Security Section */
.security-section {
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.security-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.security-item {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s;
}

.security-item:hover {
  border-color: #00d4aa;
}

.security-icon {
  font-size: 36px;
  margin-bottom: 16px;
}

.security-item h4 {
  font-size: 16px;
  color: #fff;
  margin-bottom: 8px;
}

.security-item p {
  font-size: 13px;
  color: #8b949e;
}

/* CTA Section */
.cta-section {
  padding: 80px 24px;
  text-align: center;
  background: linear-gradient(180deg, #0d1117 0%, #161b22 100%);
}

.cta-section h2 {
  font-size: 36px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
}

.cta-section p {
  font-size: 18px;
  color: #8b949e;
  margin-bottom: 32px;
}

.cta-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* 下载APP按钮 */
.install-app-btn {
  display: none;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .install-app-btn {
    display: inline-flex;
    background: linear-gradient(135deg, #00d4aa, #00a8e8) !important;
    border: none !important;
    color: #fff !important;
  }
  
  .hero-section {
    padding: 40px 16px;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-subtitle {
    font-size: 20px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-actions .el-button {
    width: 100%;
    max-width: 280px;
  }

  .hero-stats {
    gap: 24px;
    padding-top: 24px;
  }

  .stat-value {
    font-size: 24px;
  }

  .features-section,
  .security-section {
    padding: 40px 16px;
  }

  .section-title {
    font-size: 24px;
    margin-bottom: 32px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .feature-card {
    padding: 24px;
  }

  .feature-icon {
    font-size: 40px;
  }

  .invite-section {
    padding: 40px 16px;
  }

  .invite-steps {
    flex-direction: column;
    gap: 16px;
  }

  .step-arrow {
    transform: rotate(90deg);
  }

  .invite-code-box {
    flex-direction: column;
    gap: 8px;
  }

  .security-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .cta-section {
    padding: 40px 16px;
  }

  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}

/* 滚动行情条 */
.ticker-bar {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 12px 0;
  overflow: hidden;
  position: relative;
}

.ticker-wrapper {
  display: flex;
  overflow: hidden;
}

.ticker-content {
  display: flex;
  animation: scroll 30s linear infinite;
  white-space: nowrap;
}

@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  font-size: 14px;
}

.ticker-pair {
  color: #8b949e;
  font-weight: 500;
}

.ticker-price {
  color: #fff;
  font-weight: 600;
}

.ticker-change {
  font-weight: 600;
}

.ticker-change.up, .change-badge.up {
  color: #00d4aa;
}

.ticker-change.down, .change-badge.down {
  color: #f85149;
}

/* 热门行情 */
.market-section {
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #8b949e;
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

.market-table {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  overflow: hidden;
}

.market-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  padding: 16px 24px;
  background: #21262d;
  font-size: 14px;
  color: #8b949e;
}

.market-item {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid #30363d;
  align-items: center;
}

.market-item:last-child {
  border-bottom: none;
}

.col-pair {
  display: flex;
  align-items: center;
}

.coin-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.coin-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  font-size: 14px;
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
  font-size: 14px;
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
}

.price-cny {
  font-size: 12px;
  color: #8b949e;
}

.col-change {
  text-align: right;
}

.change-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
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

@media (max-width: 768px) {
  .market-section {
    padding: 24px 16px;
  }

  .market-table {
    max-height: 320px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .market-list {
    max-height: 260px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .market-header {
    padding: 12px 16px;
    font-size: 12px;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .market-item {
    padding: 12px 16px;
  }

  .coin-icon {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .ticker-item {
    padding: 0 16px;
    font-size: 12px;
  }
}
</style>
