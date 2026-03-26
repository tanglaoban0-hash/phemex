<template>
  <div class="assets-page">
    <h2>我的资产</h2>
    
    <!-- 总资产 -->
    <el-card class="total-card">
      <div class="total-value">
        <span class="label">总资产估值 (USDT)</span>
        <span class="value">{{ formatAmount(totalValue) }}</span>
      </div>
    </el-card>

    <!-- 标签页切换：余额、充值提现、订单 -->
    <el-tabs v-model="activeTab" class="assets-tabs">
      <!-- 余额 -->
      <el-tab-pane label="余额" name="balances">
        <el-card class="balances-card">
          <template #header>
            <div class="card-header">
              <span>币种余额</span>
              <el-radio-group v-model="hideZero" size="small">
                <el-radio-button :label="false">全部</el-radio-button>
                <el-radio-button :label="true">隐藏零余额</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          
          <!-- 移动端卡片式列表 -->
          <div class="mobile-balances-list" v-if="isMobile">
            <div v-for="row in filteredBalances" :key="row.coin_id" class="balance-card">
              <div class="balance-header">
                <div class="coin-info">
                  <span class="coin-name">{{ row.coin_name }}</span>
                  <span class="coin-symbol">{{ row.coin_symbol }}</span>
                </div>
                <div class="total-amount">{{ formatAmount(parseFloat(row.available) + parseFloat(row.frozen)) }}</div>
              </div>
              <div class="balance-details">
                <div class="detail-item">
                  <span class="label">可用</span>
                  <span class="value">{{ formatAmount(row.available) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">冻结</span>
                  <span class="value">{{ formatAmount(row.frozen) }}</span>
                </div>
              </div>
              <div class="balance-actions">
                <el-button type="primary" size="small" @click="showRecharge(row)">充值</el-button>
                <el-button type="danger" size="small" @click="showWithdraw(row)">提现</el-button>
              </div>
            </div>
          </div>
          
          <!-- 桌面端表格 -->
          <div class="balances-table-wrapper" v-else>
            <el-table :data="filteredBalances" style="width: 100%">
              <el-table-column label="币种" width="150">
                <template #default="{ row }">
                  <div class="coin-cell">
                    <span class="coin-name">{{ row.coin_name }}</span>
                    <span class="coin-symbol">{{ row.coin_symbol }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="可用" align="right">
                <template #default="{ row }">
                  {{ formatAmount(row.available) }}
                </template>
              </el-table-column>
              <el-table-column label="冻结" align="right">
                <template #default="{ row }">
                  {{ formatAmount(row.frozen) }}
                </template>
              </el-table-column>
              <el-table-column label="总计" align="right">
                <template #default="{ row }">
                  <span class="total">{{ formatAmount(parseFloat(row.available) + parseFloat(row.frozen)) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button type="primary" size="small" plain @click="showRecharge(row)">充值</el-button>
                  <el-button type="danger" size="small" plain @click="showWithdraw(row)">提现</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 充值提现记录 -->
      <el-tab-pane label="充值提现" name="fund">
        <el-card class="fund-records-card">
          <template #header>
            <div class="card-header">
              <span>充值提现记录</span>
            </div>
          </template>
          
          <el-table :data="fundRecords" style="width: 100%">
            <el-table-column label="时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.type === 'recharge' ? 'success' : 'danger'" size="small">
                  {{ row.type === 'recharge' ? '充值' : '提现' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="币种" prop="coin_symbol" width="100" />
            <el-table-column label="金额" align="right">
              <template #default="{ row }">
                {{ formatAmount(row.amount) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getFundStatusType(row.status)" size="small">
                  {{ row.statusName || getFundStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination" v-if="fundTotal > fundPageSize">
            <el-pagination
              v-model:current-page="fundPage"
              v-model:page-size="fundPageSize"
              :total="fundTotal"
              layout="prev, pager, next"
              @current-change="fetchFundRecords"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 订单 -->
      <el-tab-pane label="订单" name="orders">
        <el-tabs v-model="orderSubTab" class="order-sub-tabs">
          <el-tab-pane label="当前委托" name="active">
            <el-table :data="activeOrders" style="width: 100%">
              <el-table-column label="时间" width="150">
                <template #default="{ row }">
                  {{ formatTime(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="交易对" prop="pair_symbol" width="100" />
              <el-table-column label="方向" width="80">
                <template #default="{ row }">
                  <span :class="row.side === 1 ? 'buy' : 'sell'">
                    {{ row.side === 1 ? '买入' : '卖出' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="价格" align="right" width="120">
                <template #default="{ row }">
                  {{ row.price || '市价' }}
                </template>
              </el-table-column>
              <el-table-column label="数量" align="right" prop="amount" width="120" />
              <el-table-column label="已成交" align="right" prop="filled_amount" width="120" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getOrderStatusType(row.status)" size="small">
                    {{ getOrderStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" align="center">
                <template #default="{ row }">
                  <el-button 
                    v-if="row.status === 0 || row.status === 1"
                    type="danger" 
                    size="small"
                    @click="cancelOrder(row.id)"
                  >
                    撤单
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="历史委托" name="history">
            <el-table :data="historyOrders" style="width: 100%">
              <el-table-column label="时间" width="150">
                <template #default="{ row }">
                  {{ formatTime(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="交易对" prop="pair_symbol" width="100" />
              <el-table-column label="方向" width="80">
                <template #default="{ row }">
                  <span :class="row.side === 1 ? 'buy' : 'sell'">
                    {{ row.side === 1 ? '买入' : '卖出' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="均价" align="right" prop="avg_price" width="120" />
              <el-table-column label="成交数量" align="right" prop="filled_amount" width="120" />
              <el-table-column label="手续费" align="right" prop="fee" width="120" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getOrderStatusType(row.status)" size="small">
                    {{ getOrderStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="pagination" v-if="orderTotal > orderPageSize">
              <el-pagination
                v-model:current-page="orderPage"
                v-model:page-size="orderPageSize"
                :total="orderTotal"
                layout="prev, pager, next"
                @current-change="fetchHistoryOrders"
              />
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="成交记录" name="trades">
            <el-table :data="trades" style="width: 100%">
              <el-table-column label="时间" width="150">
                <template #default="{ row }">
                  {{ formatTime(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="交易对" prop="pair_symbol" width="100" />
              <el-table-column label="方向" width="80">
                <template #default="{ row }">
                  <span :class="row.side === 1 ? 'buy' : 'sell'">
                    {{ row.side === 1 ? '买入' : '卖出' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="成交价格" align="right" prop="price" width="120" />
              <el-table-column label="成交数量" align="right" prop="amount" width="120" />
              <el-table-column label="成交金额" align="right" prop="total" width="120" />
              <el-table-column label="手续费" align="right" prop="fee" width="120" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
    </el-tabs>

    <!-- 充值对话框 -->
    <el-dialog v-model="rechargeVisible" title="充值" width="90%" :max-width="500">
      <div class="recharge-dialog">
        <el-alert
          title="请选择充值方式"
          description="币币交易需要网络支持，一般1-10分钟内会到账"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        />
        
        <!-- 充值方式选择 -->
        <div class="payment-methods-section">
          <label class="section-label">选择充值方式</label>
          <div class="payment-methods">
            <div 
              v-for="method in rechargeMethods" 
              :key="method.method"
              class="payment-method"
              :class="{ active: selectedRechargeMethod === method.method }"
              @click="selectRechargeMethod(method)"
            >
              <div class="method-name">{{ method.name }}</div>
              <div class="method-network" v-if="method.network">{{ method.network }}</div>
              <div class="method-limit">限额: {{ formatAmount(method.min) }}-{{ formatAmount(method.max) || '无限制' }}</div>
            </div>
          </div>
        </div>

        <!-- 选中后的信息 -->
        <template v-if="selectedRechargeMethod">
          <div class="payment-info-box">
            <label class="section-label">收款信息</label>
            <div class="info-content">
              <div v-if="currentMethod?.address" class="info-row">
                <span class="label">地址/卡号:</span>
                <span class="value copy-text" @click="copyText(currentMethod.address)">
                  {{ currentMethod.address }}
                  <el-icon><CopyDocument /></el-icon>
                </span>
              </div>
              <div v-else class="info-row">
                <span class="label">地址:</span>
                <span class="value" style="color: #ff6b6b">未配置收款地址，请联系管理员</span>
              </div>
              <div v-if="currentMethod?.bankName" class="info-row">
                <span class="label">银行:</span>
                <span class="value">{{ currentMethod.bankName }}</span>
              </div>
              <div v-if="currentMethod?.accountName" class="info-row">
                <span class="label">账户名:</span>
                <span class="value">{{ currentMethod.accountName }}</span>
              </div>
              <div v-if="currentMethod?.qrCode" class="qr-code">
                <img :src="currentMethod.qrCode" alt="收款码" />
              </div>
            </div>
          </div>

          <el-form label-position="top" class="recharge-form">
            <el-form-item label="充值金额">
              <el-input-number 
                v-model="rechargeForm.amount" 
                :min="selectedRechargeMethod.min"
                :max="selectedRechargeMethod.max || 999999"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="付款地址/卡号">
              <el-input 
                v-model="rechargeForm.fromAddress" 
                placeholder="请输入您的付款地址或卡号"
              />
            </el-form-item>
            <el-form-item label="支付凭证">
              <el-upload
                class="upload-proof"
                action="/api/upload"
                :headers="uploadHeaders"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
                :before-upload="beforeUpload"
                :file-list="fileList"
                list-type="picture-card"
                :limit="1"
              >
                <el-icon><Plus /></el-icon>
                <template #tip>
                  <div class="el-upload__tip">
                    支持 JPG/PNG 格式，大小不超过 5MB
                  </div>
                </template>
              </el-upload>
              <el-input 
                v-if="selectedRechargeMethod?.id !== 'bank_card'"
                v-model="rechargeForm.txId" 
                placeholder="或填写 TxID/交易哈希"
                style="margin-top: 12px"
              />
            </el-form-item>
            <el-button 
              type="primary" 
              size="large" 
              style="width: 100%"
              @click="submitRecharge"
              :loading="rechargeSubmitting"
            >
              提交充值申请
            </el-button>
          </el-form>
        </template>
        <p class="tip">* 此地址为模拟地址，仅供演示使用</p>
      </div>
    </el-dialog>

    <!-- 提现对话框 -->
    <el-dialog v-model="withdrawVisible" title="提现" width="90%" :max-width="500">
      <el-form :model="withdrawForm" label-width="100px" label-position="top">
        <el-form-item label="币种">
          <span class="form-value">{{ currentCoin?.coin_symbol }}</span>
        </el-form-item>
        <el-form-item label="可用余额">
          <span class="form-value">{{ formatAmount(currentCoin?.available) }} {{ currentCoin?.coin_symbol }}</span>
        </el-form-item>
        
        <!-- 提现方式选择 -->
        <el-form-item label="选择提现方式">
          <div class="payment-methods">
            <div
              v-for="method in withdrawMethods"
              :key="method.method"
              class="payment-method"
              :class="{ active: withdrawForm.method === method.method }"
              @click="selectWithdrawMethod(method)"
            >
              <div class="method-name">{{ method.name }}</div>
              <div class="method-network" v-if="method.network">{{ method.network }}</div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="提现地址/卡号">
          <el-input v-model="withdrawForm.address" placeholder="请输入提现地址或银行卡号" />
        </el-form-item>
        <el-form-item label="提现金额">
          <el-input-number 
            v-model="withdrawForm.amount" 
            :min="0"
            :precision="2"
            style="width: 100%"
          />
          <div class="form-hint" v-if="currentCoin">
            最小提现: {{ currentCoin.min_withdraw || 0 }} {{ currentCoin.symbol }}
            手续费: {{ currentCoin.withdraw_fee || 0 }} {{ currentCoin.symbol }}
          </div>
        </el-form-item>
        <el-form-item label="到账金额" v-if="withdrawForm.amount > 0">
          <div class="receive-amount">
            {{ formatAmount(calculateReceiveAmount) }} {{ currentCoin?.coin_symbol }}
          </div>
        </el-form-item>
        <el-form-item label="资金密码">
          <el-input v-model="withdrawForm.fundPassword" type="password" placeholder="请输入资金密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" @click="submitWithdraw" :loading="withdrawing">提交提现申请</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Plus } from '@element-plus/icons-vue'

const userStore = useUserStore()

// 响应式
const isMobile = ref(false)

const handleResize = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth <= 768
  }
}

onMounted(() => {
  handleResize()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
})

// 标签页
const activeTab = ref('balances')
const orderSubTab = ref('active')

// 余额数据
const balances = ref([])
const totalValue = ref(0)
const hideZero = ref(false)

// 充值提现
const rechargeVisible = ref(false)
const withdrawVisible = ref(false)
const currentCoin = ref(null)
const withdrawing = ref(false)
const rechargeSubmitting = ref(false)
const fundRecords = ref([])
const fundPage = ref(1)
const fundPageSize = ref(10)
const fundTotal = ref(0)

// 充值方式 - 从API获取
const rechargeMethods = ref([])

// 当前选中的支付方式（存储method字符串）
const selectedRechargeMethod = ref('')

// 根据选中的method获取完整支付方式对象
const currentMethod = computed(() => {
  return rechargeMethods.value.find(m => m.method === selectedRechargeMethod.value)
})

// 获取充值方式配置
const fetchRechargeMethods = async () => {
  try {
    const res = await api.get('/fund/methods')
    console.log('API返回:', res.data)
    if (res.data.code === 200) {
      rechargeMethods.value = res.data.data.map(m => {
        console.log('处理支付方式:', m.method, '地址:', m.address)
        return {
          method: m.method,  // 用 method 作为唯一标识
          name: m.name,
          network: m.network,
          min: m.min_amount,
          max: m.max_amount,
          address: m.address,
          bankName: m.bank_name,
          accountName: m.account_name
        }
      })
      console.log('映射后:', rechargeMethods.value)
    }
  } catch (err) {
    console.error('获取支付方式失败:', err)
    // 使用默认配置
    rechargeMethods.value = [
      { method: 'usdt_trc20', name: 'USDT', network: 'TRC20', min: 10, max: 100000, address: 'TY9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X' },
      { method: 'usdt_erc20', name: 'USDT', network: 'ERC20', min: 50, max: 100000, address: '0x1234567890abcdef1234567890abcdef12345678' },
      { method: 'btc', name: 'BTC', network: 'BTC', min: 0.001, max: 10, address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
      { method: 'eth', name: 'ETH', network: 'ERC20', min: 0.01, max: 100, address: '0xabcdef1234567890abcdef1234567890abcdef12' },
      { method: 'bank_card', name: '银行卡', network: 'CNY', min: 100, max: 50000, bankName: '中国工商银行', accountName: '张三', cardNo: '6222000000000000000' }
    ]
  }
}

// 充值表单
const rechargeForm = ref({
  amount: 0,
  fromAddress: '',
  proof: '',
  txId: ''
})

// 图片上传
const fileList = ref([])
const uploadHeaders = ref({
  Authorization: `Bearer ${userStore.token || ''}`
})

// 提现方式 - 使用充值方式配置
const withdrawMethods = computed(() => {
  return rechargeMethods.value.map(m => ({
    method: m.method,
    name: m.name,
    network: m.network
  }))
})

const withdrawForm = ref({
  method: '',
  address: '',
  amount: 0,
  fundPassword: ''
})

// 订单数据
const activeOrders = ref([])
const historyOrders = ref([])
const trades = ref([])
const orderPage = ref(1)
const orderPageSize = ref(20)
const orderTotal = ref(0)

const filteredBalances = computed(() => {
  if (!hideZero.value) return balances.value
  return balances.value.filter(b => parseFloat(b.available) > 0 || parseFloat(b.frozen) > 0)
})

onMounted(() => {
  fetchBalances()
  fetchFundRecords()
  fetchActiveOrders()
  fetchRechargeMethods()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 监听标签页变化
watch(activeTab, (val) => {
  if (val === 'fund') fetchFundRecords()
  if (val === 'orders') {
    if (orderSubTab.value === 'active') fetchActiveOrders()
    if (orderSubTab.value === 'history') fetchHistoryOrders()
    if (orderSubTab.value === 'trades') fetchTrades()
  }
})

watch(orderSubTab, (val) => {
  if (val === 'active') fetchActiveOrders()
  if (val === 'history') fetchHistoryOrders()
  if (val === 'trades') fetchTrades()
})

// 余额相关
const fetchBalances = async () => {
  try {
    const res = await api.get('/asset/balances')
    if (res.data.code === 200) {
      balances.value = res.data.data
    }
    
    const totalRes = await api.get('/asset/total')
    if (totalRes.data.code === 200) {
      totalValue.value = totalRes.data.data.total_usdt
    }
  } catch (err) {
    console.error('获取资产失败:', err)
  }
}

const showRecharge = async (coin) => {
  currentCoin.value = coin
  rechargeForm.value = { amount: 0, fromAddress: '', proof: '' }
  // 先获取最新配置
  await fetchRechargeMethods()
  // 默认选中第一个
  if (rechargeMethods.value.length > 0) {
    selectedRechargeMethod.value = rechargeMethods.value[0].method
    rechargeForm.value.amount = rechargeMethods.value[0].min || 0
  }
  // 然后显示弹窗
  rechargeVisible.value = true
}

const showWithdraw = (coin) => {
  currentCoin.value = coin
  withdrawForm.value = { method: '', address: '', amount: 0, fundPassword: '' }
  withdrawVisible.value = true
}

// 选择充值方式
const selectRechargeMethod = (method) => {
  selectedRechargeMethod.value = method.method
  rechargeForm.value.amount = method.min || 0
  rechargeForm.value.proof = ''
  rechargeForm.value.txId = ''
  fileList.value = []
  console.log('当前选中:', selectedRechargeMethod.value)
}

// 选择提现方式
const selectWithdrawMethod = (method) => {
  withdrawForm.value.method = method.method
}

// 计算到账金额
const calculateReceiveAmount = computed(() => {
  if (!currentCoin.value || !withdrawForm.value.amount) return 0
  const fee = parseFloat(currentCoin.value.withdraw_fee || 0)
  return Math.max(0, withdrawForm.value.amount - fee)
})

// 提交充值
const submitRecharge = async () => {
  if (!selectedRechargeMethod.value) {
    ElMessage.warning('请选择充值方式')
    return
  }
  if (!rechargeForm.value.amount || rechargeForm.value.amount <= 0) {
    ElMessage.warning('请输入充值金额')
    return
  }
  if (!rechargeForm.value.fromAddress) {
    ElMessage.warning('请输入付款地址')
    return
  }
  // 银行卡必须上传凭证，其他可以填TxID
  if (selectedRechargeMethod.value === 'bank_card' && !rechargeForm.value.proof) {
    ElMessage.warning('请上传银行转账凭证')
    return
  }

  rechargeSubmitting.value = true
  try {
    const res = await api.post('/fund/deposit', {
      coinId: currentCoin.value.coin_id,
      amount: rechargeForm.value.amount,
      paymentMethod: selectedRechargeMethod.value,
      fromAddress: rechargeForm.value.fromAddress,
      paymentProof: rechargeForm.value.proof,
      txId: rechargeForm.value.txId
    })
    
    if (res.data.code === 200) {
      ElMessage.success('充值申请已提交')
      rechargeVisible.value = false
      fileList.value = []
      fetchFundRecords()
    }
  } catch (err) {
    console.error('提交充值失败:', err)
  } finally {
    rechargeSubmitting.value = false
  }
}

const generateAddress = () => {
  const chars = '0123456789abcdef'
  let addr = '0x'
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)]
  }
  return addr
}

const copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制')
  })
}

// 上传相关
const beforeUpload = (file) => {
  const isJPG = file.type === 'image/jpeg'
  const isPNG = file.type === 'image/png'
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isJPG && !isPNG) {
    ElMessage.error('只支持 JPG/PNG 格式图片!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

const handleUploadSuccess = (response, file) => {
  if (response.code === 200) {
    rechargeForm.value.proof = response.data.url
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleUploadError = () => {
  ElMessage.error('上传失败，请重试')
}

const submitWithdraw = async () => {
  if (!withdrawForm.value.method) {
    ElMessage.warning('请选择提现方式')
    return
  }
  if (!withdrawForm.value.address) {
    ElMessage.warning('请输入提现地址')
    return
  }
  if (!withdrawForm.value.amount || withdrawForm.value.amount <= 0) {
    ElMessage.warning('请输入提现金额')
    return
  }
  if (!withdrawForm.value.fundPassword) {
    ElMessage.warning('请输入资金密码')
    return
  }
  
  withdrawing.value = true
  try {
    const res = await api.post('/fund/withdraw', {
      coinId: currentCoin.value.coin_id,
      toAddress: withdrawForm.value.address,
      amount: parseFloat(withdrawForm.value.amount),
      method: withdrawForm.value.method,
      fundPassword: withdrawForm.value.fundPassword
    })
    
    if (res.data.code === 200) {
      ElMessage.success('提现申请已提交')
      withdrawVisible.value = false
      fetchBalances()
      fetchFundRecords()
    }
  } catch (err) {
    console.error('提现失败:', err)
  } finally {
    withdrawing.value = false
  }
}

// 充值提现记录
const fetchFundRecords = async () => {
  try {
    let records = []
    
    // 获取充值记录
    const depositRes = await api.get(`/fund/deposits?page=${fundPage.value}&limit=${fundPageSize.value}`)
    if (depositRes.data.code === 200) {
      const deposits = depositRes.data.data.list.map(r => ({
        ...r,
        type: 'recharge',
        coin_symbol: r.coin_symbol || 'USDT',
        status: r.status || 0
      }))
      records = [...records, ...deposits]
    }
    
    // 获取提现记录
    const withdrawRes = await api.get(`/asset/withdrawals?page=${fundPage.value}&limit=${fundPageSize.value}`)
    if (withdrawRes.data.code === 200) {
      const withdrawals = withdrawRes.data.data.list.map(r => ({
        ...r,
        type: 'withdraw',
        coin_symbol: r.coin_symbol || 'USDT',
        status: r.status || 0
      }))
      records = [...records, ...withdrawals]
    }
    
    // 按时间排序
    records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    fundRecords.value = records
    fundTotal.value = records.length
  } catch (err) {
    console.error('获取充值提现记录失败:', err)
    fundRecords.value = []
  }
}

const getFundStatusType = (status) => {
  const types = { 0: 'info', 1: 'success', 2: 'danger', 3: 'warning' }
  return types[status] || 'info'
}

const getFundStatusText = (status) => {
  const texts = { 0: '处理中', 1: '已完成', 2: '已拒绝', 3: '待审核' }
  return texts[status] || '未知'
}

// 订单相关
const fetchActiveOrders = async () => {
  try {
    const res = await api.get('/trade/orders?status=0,1')
    if (res.data.code === 200) {
      activeOrders.value = res.data.data?.list || []
    }
  } catch (err) {
    console.error('获取订单失败:', err)
    activeOrders.value = []
  }
}

const fetchHistoryOrders = async () => {
  try {
    const res = await api.get(`/trade/orders?status=2,3&page=${orderPage.value}&limit=${orderPageSize.value}`)
    if (res.data.code === 200) {
      historyOrders.value = res.data.data?.list || []
      orderTotal.value = res.data.data?.total || 0
    }
  } catch (err) {
    console.error('获取历史订单失败:', err)
    historyOrders.value = []
  }
}

const fetchTrades = async () => {
  try {
    const res = await api.get('/trade/trades')
    if (res.data.code === 200) {
      trades.value = res.data.data?.list || []
    }
  } catch (err) {
    console.error('获取成交记录失败:', err)
    trades.value = []
  }
}

const cancelOrder = async (orderId) => {
  try {
    await ElMessageBox.confirm('确定要撤销此订单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await api.post(`/trade/cancel/${orderId}`)
    if (res.data.code === 200) {
      ElMessage.success('撤单成功')
      fetchActiveOrders()
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('撤单失败:', err)
    }
  }
}

const getOrderStatusType = (status) => {
  const types = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }
  return types[status] || 'info'
}

const getOrderStatusText = (status) => {
  const texts = { 0: '待成交', 1: '部分成交', 2: '完全成交', 3: '已撤销' }
  return texts[status] || '未知'
}

// 格式化
const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(6)
}

const formatTime = (time) => {
  return new Date(time).toLocaleString()
}
</script>

<style scoped>
.assets-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: #fff;
}

.total-card {
  margin-bottom: 24px;
  background: linear-gradient(135deg, #00d4aa20, #00a8e820);
  border: 1px solid #00d4aa40;
}

.total-value {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.total-value .label {
  font-size: 14px;
  color: #8b949e;
}

.total-value .value {
  font-size: 36px;
  font-weight: bold;
  color: #fff;
  font-family: monospace;
}

/* 标签页样式 */
.assets-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.assets-tabs :deep(.el-tabs__item) {
  color: #8b949e;
  font-size: 14px;
}

.assets-tabs :deep(.el-tabs__item.is-active) {
  color: #00d4aa;
}

.assets-tabs :deep(.el-tabs__active-bar) {
  background-color: #00d4aa;
}

.order-sub-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.order-sub-tabs :deep(.el-tabs__item) {
  font-size: 13px;
  padding: 0 12px;
}

.balances-card,
.fund-records-card {
  background: #161b22;
  border: 1px solid #30363d;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.balances-table-wrapper {
  overflow-x: auto;
}

.coin-cell {
  display: flex;
  flex-direction: column;
}

.coin-name {
  font-weight: 500;
  color: #fff;
}

.coin-symbol {
  font-size: 12px;
  color: #8b949e;
}

.total {
  font-weight: 600;
  color: #fff;
}

.buy {
  color: #00d4aa;
}

.sell {
  color: #ff6b6b;
}

.address-text {
  font-family: monospace;
  font-size: 11px;
  color: #8b949e;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.recharge-dialog p {
  margin-bottom: 12px;
  color: #8b949e;
}

.address-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #0d1117;
  border-radius: 8px;
  border: 1px solid #30363d;
}

.address-box code {
  flex: 1;
  font-family: monospace;
  word-break: break-all;
  color: #fff;
}

.tip {
  font-size: 12px;
  color: #ff6b6b !important;
}

:deep(.el-card) {
  background: #161b22;
  border: 1px solid #30363d;
  color: #fff;
}

:deep(.el-table) {
  background: #161b22;
}

:deep(.el-table th) {
  background: #0d1117 !important;
  border-bottom: 1px solid #30363d;
  color: #fff;
}

:deep(.el-table td) {
  background: #161b22 !important;
  border-bottom: 1px solid #30363d;
  color: #fff;
}

:deep(.el-table tr:hover td) {
  background: #21262d;
}

:deep(.el-dialog) {
  background: #161b22;
}

:deep(.el-dialog .el-dialog__title) {
  color: #fff;
}

/* 充值提现方式选择 */
.recharge-dialog {
  color: #fff;
}

.section-label {
  display: block;
  color: #8b949e;
  font-size: 14px;
  margin-bottom: 12px;
}

.payment-methods-section {
  margin-bottom: 20px;
}

.payment-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.payment-method {
  padding: 16px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.payment-method:hover {
  border-color: #00d4aa;
}

.payment-method .method-name {
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.payment-method .method-network {
  color: #00d4aa;
  font-size: 12px;
  margin-top: 4px;
}

.payment-method .method-limit {
  color: #8b949e;
  font-size: 11px;
  margin-top: 4px;
}

.payment-info-box {
  margin-bottom: 20px;
  padding: 16px;
  background: #21262d !important;
  border-radius: 8px;
  border: 1px solid #30363d;
}

.payment-info-box .section-label {
  color: #00d4aa;
  font-size: 16px;
  font-weight: 600;
}

.payment-info-box .info-content {
  margin-top: 12px;
}

.recharge-dialog .info-row {
  display: flex;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #30363d;
}

.recharge-dialog .info-row:last-child {
  border-bottom: none;
}

.recharge-dialog .info-row .label {
  width: 100px;
  color: #8b949e;
  flex-shrink: 0;
  font-size: 14px;
}

.recharge-dialog .info-row .value {
  color: #fff !important;
  flex: 1;
  font-size: 14px;
  word-break: break-all;
}

.copy-text {
  cursor: pointer;
  color: #00d4aa !important;
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-text:hover {
  text-decoration: underline;
}

.copy-text .el-icon {
  font-size: 14px;
}

.qr-code {
  margin-top: 12px;
  text-align: center;
}

.qr-code img {
  max-width: 200px;
  border-radius: 8px;
}

.recharge-form :deep(.el-form-item__label) {
  color: #8b949e;
}

.form-value {
  color: #fff;
  font-size: 16px;
}

.form-hint {
  color: #8b949e;
  font-size: 12px;
  margin-top: 4px;
}

.receive-amount {
  font-size: 24px;
  color: #00d4aa;
  font-weight: bold;
}

/* 图片上传样式 */
.upload-proof :deep(.el-upload--picture-card) {
  background: #0d1117;
  border-color: #30363d;
  color: #8b949e;
}

.upload-proof :deep(.el-upload--picture-card:hover) {
  border-color: #00d4aa;
  color: #00d4aa;
}

.upload-proof :deep(.el-upload-list__item) {
  background: #0d1117;
  border-color: #30363d;
}

.upload-proof .el-upload__tip {
  color: #8b949e;
}

/* 移动端卡片式余额列表 */
.mobile-balances-list {
  display: none;
}

.balance-card {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.balance-header .coin-info {
  display: flex;
  flex-direction: column;
}

.balance-header .coin-name {
  font-weight: 600;
  color: #fff;
  font-size: 14px;
}

.balance-header .coin-symbol {
  font-size: 12px;
  color: #8b949e;
}

.balance-header .total-amount {
  font-size: 18px;
  font-weight: bold;
  color: #00d4aa;
  font-family: monospace;
}

.balance-details {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #30363d;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 11px;
  color: #8b949e;
}

.detail-item .value {
  font-size: 13px;
  color: #fff;
  font-family: monospace;
}

.balance-actions {
  display: flex;
  gap: 12px;
}

.balance-actions .el-button {
  flex: 1;
  min-height: 36px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .assets-page {
    padding: 12px;
  }

  .assets-page h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }

  .total-card {
    margin-bottom: 16px;
  }

  .total-value .value {
    font-size: 24px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  /* 移动端显示卡片，隐藏表格 */
  .mobile-balances-list {
    display: block;
  }

  .balances-table-wrapper {
    display: none;
  }

  .fund-records-card,
  .order-sub-tabs {
    overflow-x: auto;
  }

  .fund-records-card .el-table,
  .order-sub-tabs .el-table {
    min-width: 600px;
  }

  .coin-cell .coin-name {
    font-size: 12px;
  }

  .coin-cell .coin-symbol {
    font-size: 10px;
  }

  .el-table {
    font-size: 12px;
  }

  .el-table .cell {
    white-space: nowrap;
  }
  
  /* 充值提现对话框移动端适配 */
  :deep(.el-dialog) {
    width: 95% !important;
    max-width: 100%;
    margin: 10px auto !important;
  }
  
  :deep(.el-dialog__body) {
    padding: 15px;
  }
  
  .payment-methods {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .payment-method {
    padding: 12px 8px;
  }
  
  .payment-method .method-name {
    font-size: 12px;
  }
  
  .payment-method .method-network {
    font-size: 10px;
  }
  
  .payment-info-box {
    padding: 12px;
  }
  
  .recharge-dialog .info-row {
    flex-direction: column;
    gap: 4px;
  }
  
  .recharge-dialog .info-row .label {
    width: auto;
    font-size: 12px;
  }
  
  .address-box {
    padding: 12px;
    flex-direction: column;
    gap: 8px;
  }
  
  .address-box code {
    font-size: 12px;
    word-break: break-all;
  }
  
  .qr-code img {
    max-width: 150px;
  }
  
  .receive-amount {
    font-size: 18px;
  }
  
  :deep(.el-form-item__label) {
    font-size: 12px;
  }
  
  :deep(.el-input__inner) {
    font-size: 14px;
  }
}
</style>
