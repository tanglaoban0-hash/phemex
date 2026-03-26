<template>
  <div class="fund-manage">
    <h2>资金管理</h2>
    
    <el-tabs v-model="activeTab">
      <!-- 充值管理 -->
      <el-tab-pane label="充值管理" name="deposits">
        <div class="filter-bar">
          <el-select v-model="depositFilter.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已驳回" :value="2" />
          </el-select>
          <el-date-picker
            v-model="depositFilter.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="margin-left: 10px"
          />
          <el-button type="primary" @click="fetchDeposits" style="margin-left: 10px">查询</el-button>
        </div>
        
        <el-table :data="depositList" border>
          <el-table-column prop="deposit_no" label="单号" width="150" />
          <el-table-column prop="username" label="用户" width="120" />
          <el-table-column prop="real_name" label="真实姓名" width="100" />
          <el-table-column prop="coin_symbol" label="币种" width="80" />
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{ row }">
              {{ parseFloat(row.amount).toFixed(4) }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="支付方式" width="100" />
          <el-table-column prop="from_address" label="付款地址" show-overflow-tooltip />
          <el-table-column prop="statusName" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'warning' : row.status === 1 ? 'success' : 'danger'">
                {{ row.statusName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="申请时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewDepositDetail(row)">查看</el-button>
              <el-button 
                v-if="row.status === 0"
                type="success" 
                size="small"
                @click="auditDeposit(row, 1)"
              >
                通过
              </el-button>
              <el-button 
                v-if="row.status === 0"
                type="danger" 
                size="small"
                @click="auditDeposit(row, 2)"
              >
                驳回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <el-pagination
          v-model:current-page="depositPage"
          :page-size="10"
          :total="depositTotal"
          layout="total, prev, pager, next"
          style="margin-top: 20px"
          @current-change="fetchDeposits"
        />
      </el-tab-pane>

      <!-- 提现管理 -->
      <el-tab-pane label="提现管理" name="withdrawals">
        <div class="filter-bar">
          <el-select v-model="withdrawFilter.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="待审核" :value="0" />
            <el-option label="审核通过" :value="1" />
            <el-option label="已驳回" :value="2" />
            <el-option label="已到账" :value="3" />
          </el-select>
          <el-date-picker
            v-model="withdrawFilter.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="margin-left: 10px"
          />
          <el-button type="primary" @click="fetchWithdrawals" style="margin-left: 10px">查询</el-button>
        </div>
        
        <el-table :data="withdrawList" border>
          <el-table-column prop="withdraw_no" label="单号" width="150" />
          <el-table-column prop="username" label="用户" width="120" />
          <el-table-column prop="real_name" label="真实姓名" width="100" />
          <el-table-column prop="coin_symbol" label="币种" width="80" />
          <el-table-column prop="amount" label="提现金额" width="120">
            <template #default="{ row }">
              {{ parseFloat(row.amount).toFixed(4) }}
            </template>
          </el-table-column>
          <el-table-column prop="fee" label="手续费" width="100">
            <template #default="{ row }">
              {{ parseFloat(row.fee).toFixed(4) }}
            </template>
          </el-table-column>
          <el-table-column prop="real_amount" label="到账金额" width="120">
            <template #default="{ row }">
              {{ parseFloat(row.real_amount).toFixed(4) }}
            </template>
          </el-table-column>
          <el-table-column prop="address" label="提现地址" show-overflow-tooltip />
          <el-table-column prop="statusName" label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ row.statusName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="申请时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button 
                v-if="row.status === 0"
                type="success" 
                size="small"
                @click="auditWithdraw(row, 1)"
              >
                通过
              </el-button>
              <el-button 
                v-if="row.status === 0"
                type="danger" 
                size="small"
                @click="auditWithdraw(row, 2)"
              >
                驳回
              </el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
        
        <el-pagination
          v-model:current-page="withdrawPage"
          :page-size="10"
          :total="withdrawTotal"
          layout="total, prev, pager, next"
          style="margin-top: 20px"
          @current-change="fetchWithdrawals"
        />
      </el-tab-pane>

      <!-- 支付方式配置 -->
      <el-tab-pane label="支付配置" name="configs">
        <div class="config-header">
          <el-button type="primary" @click="showConfigDialog = true">添加支付方式</el-button>
        </div>
        
        <el-table :data="configList" border>
          <el-table-column prop="method" label="支付方式" width="100" />
          <el-table-column prop="name" label="显示名称" width="150" />
          <el-table-column prop="method_type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag>{{ row.method_type === 'crypto' ? '数字货币' : row.method_type === 'hkb' ? '港卡' : '银行' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="address" label="收款地址/卡号" show-overflow-tooltip />
          <el-table-column prop="network" label="网络" width="100" />
          <el-table-column prop="min_amount" label="最小金额" width="100" />
          <el-table-column prop="max_amount" label="最大金额" width="100" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="updateConfigStatus(row)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="editConfig(row)">编辑</el-button>
              <el-button type="danger" size="small" @click="deleteConfig(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 统计 -->
      <el-tab-pane label="资金统计" name="stats">
        <div class="stats-cards">
          <el-card>
            <template #header>今日充值</template>
            <div class="stat-value">{{ formatAmount(stats.deposit?.total_amount) }}</div>
            <div class="stat-label">{{ stats.deposit?.total_count || 0 }} 笔</div>
          </el-card>
          <el-card>
            <template #header>待审核充值</template>
            <div class="stat-value">{{ stats.deposit?.pending_count || 0 }}</div>
            <div class="stat-label">笔</div>
          </el-card>
          <el-card>
            <template #header>今日提现</template>
            <div class="stat-value">{{ formatAmount(stats.withdraw?.total_amount) }}</div>
            <div class="stat-label">{{ stats.withdraw?.total_count || 0 }} 笔</div>
          </el-card>
          <el-card>
            <template #header>待审核提现</template>
            <div class="stat-value">{{ stats.withdraw?.pending_count || 0 }}</div>
            <div class="stat-label">笔</div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 充值详情对话框 -->
    <el-dialog v-model="depositDetailDialog.visible" title="充值详情" width="600px">
      <el-descriptions :column="2" border v-if="depositDetailDialog.data">
        <el-descriptions-item label="单号">{{ depositDetailDialog.data.deposit_no }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ depositDetailDialog.data.username }}</el-descriptions-item>
        <el-descriptions-item label="真实姓名">{{ depositDetailDialog.data.real_name }}</el-descriptions-item>
        <el-descriptions-item label="币种">{{ depositDetailDialog.data.coin_symbol }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ parseFloat(depositDetailDialog.data.amount).toFixed(4) }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ depositDetailDialog.data.payment_method }}</el-descriptions-item>
        <el-descriptions-item label="付款地址" :span="2">{{ depositDetailDialog.data.from_address }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="depositDetailDialog.data.status === 0 ? 'warning' : depositDetailDialog.data.status === 1 ? 'success' : 'danger'">
            {{ depositDetailDialog.data.statusName }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatTime(depositDetailDialog.data.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="审核人" v-if="depositDetailDialog.data.audit_by">{{ depositDetailDialog.data.audit_username }}</el-descriptions-item>
        <el-descriptions-item label="审核时间" v-if="depositDetailDialog.data.audit_at">{{ formatTime(depositDetailDialog.data.audit_at) }}</el-descriptions-item>
      </el-descriptions>

      <!-- 支付凭证图片 -->
      <div v-if="depositDetailDialog.data?.payment_proof" class="proof-image">
        <h4>支付凭证 (点击查看大图)</h4>
        <div style="border: 1px solid #dcdfe6; border-radius: 4px; padding: 10px; display: inline-block;">
          <img 
            :src="getFullImageUrl(depositDetailDialog.data.payment_proof)" 
            alt="支付凭证" 
            @click="showImagePreview(depositDetailDialog.data.payment_proof)"
            style="max-width: 300px; max-height: 200px; cursor: pointer;"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="depositDetailDialog.visible = false">关闭</el-button>
        <template v-if="depositDetailDialog.data && depositDetailDialog.data.status === 0">
          <el-button type="success" @click="auditFromDetail(1)">通过</el-button>
          <el-button type="danger" @click="auditFromDetail(2)">驳回</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditDialog.visible" title="审核" width="400px">
      <el-form>
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditDialog.status">
            <el-radio :label="1">通过</el-radio>
            <el-radio :label="2">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="auditDialog.remark" type="textarea" :rows="3" placeholder="请输入审核备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmAudit">确认</el-button>
      </template>
    </el-dialog>

    <!-- 图片预览 -->
    <el-dialog v-model="imagePreview.visible" title="图片预览" width="500px">
      <div style="text-align: center; padding: 20px;">
        <p style="color: #909399; margin-bottom: 20px;">点击下方链接在新窗口查看图片</p>
        <p style="word-break: break-all; color: #409eff;">
          <a :href="imagePreview.url" target="_blank" style="font-size: 16px;">📷 新窗口打开图片</a>
        </p>
        <p style="margin-top: 20px; color: #999; font-size: 12px;">{{ imagePreview.url }}</p>
      </div>
    </el-dialog>

    <!-- 配置对话框 -->
    <el-dialog v-model="showConfigDialog" title="支付配置" width="500px">
      <el-form :model="configForm" label-width="100px">
        <el-form-item label="支付方式ID">
          <el-input v-model="configForm.method" placeholder="如 usdt_trc20, btc, bank_card" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="configForm.method_type" style="width: 100%">
            <el-option label="数字货币" value="crypto" />
            <el-option label="银行卡" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="configForm.name" placeholder="如 USDT, BTC, 银行卡" />
        </el-form-item>
        <el-form-item label="网络">
          <el-input v-model="configForm.network" placeholder="如 ERC20, TRC20, BTC, CNY" />
        </el-form-item>
        <el-form-item label="收款地址/卡号">
          <el-input v-model="configForm.address" />
        </el-form-item>
        <el-form-item label="银行名称">
          <el-input v-model="configForm.bank_name" />
        </el-form-item>
        <el-form-item label="账户名">
          <el-input v-model="configForm.account_name" />
        </el-form-item>
        <el-form-item label="最小金额">
          <el-input-number v-model="configForm.min_amount" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最大金额">
          <el-input-number v-model="configForm.max_amount" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const activeTab = ref('deposits')

// 充值
const depositList = ref([])
const depositPage = ref(1)
const depositTotal = ref(0)
const depositFilter = ref({ status: undefined, dateRange: null })

// 提现
const withdrawList = ref([])
const withdrawPage = ref(1)
const withdrawTotal = ref(0)
const withdrawFilter = ref({ status: undefined, dateRange: null })

// 配置
const configList = ref([])
const showConfigDialog = ref(false)
const configForm = ref({
  method: '',
  method_type: 'crypto',
  name: '',
  address: '',
  bank_name: '',
  account_name: '',
  network: '',
  min_amount: 0,
  max_amount: 0
})
const editingConfig = ref(null)

// 统计
const stats = ref({})

// 审核对话框
const auditDialog = ref({
  visible: false,
  type: '', // deposit | withdraw
  id: null,
  status: 1,
  remark: ''
})

// 充值详情对话框
const depositDetailDialog = ref({
  visible: false,
  data: null
})

// 图片预览
const imagePreview = ref({
  visible: false,
  url: ''
})

// 动态获取后端地址（根据当前访问的页面）
const getApiBaseUrl = () => {
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3000`
}

const getFullImageUrl = (url) => {
  if (!url) {
    console.log('getFullImageUrl: url is empty')
    return ''
  }
  const baseUrl = getApiBaseUrl()
  const fullUrl = url.startsWith('http') ? url : baseUrl + url
  console.log('getFullImageUrl:', url, '->', fullUrl)
  return fullUrl
}

const showImagePreview = (url) => {
  const fullUrl = getFullImageUrl(url)
  console.log('打开图片预览:', url, '->', fullUrl)
  imagePreview.value.url = fullUrl
  imagePreview.value.visible = true
}

const viewDepositDetail = async (row) => {
  try {
    const res = await api.get(`/admin/fund/deposits/${row.id}`)
    if (res.data.code === 200) {
      depositDetailDialog.value.data = res.data.data
      depositDetailDialog.value.visible = true
    }
  } catch (err) {
    console.error('获取充值详情失败:', err)
    ElMessage.error('获取详情失败')
  }
}

const auditFromDetail = (status) => {
  depositDetailDialog.value.visible = false
  auditDeposit(depositDetailDialog.value.data, status)
}

// 获取充值列表
const fetchDeposits = async () => {
  try {
    let url = `/admin/fund/deposits?page=${depositPage.value}`
    if (depositFilter.value.status !== undefined) url += `&status=${depositFilter.value.status}`
    if (depositFilter.value.dateRange) {
      url += `&startDate=${depositFilter.value.dateRange[0]}&endDate=${depositFilter.value.dateRange[1]}`
    }
    const res = await api.get(url)
    if (res.data.code === 200) {
      depositList.value = res.data.data.list
      depositTotal.value = res.data.data.pagination.total
    }
  } catch (err) {
    console.error('获取充值列表失败:', err)
  }
}

// 获取提现列表
const fetchWithdrawals = async () => {
  try {
    let url = `/admin/fund/withdrawals?page=${withdrawPage.value}`
    if (withdrawFilter.value.status !== undefined) url += `&status=${withdrawFilter.value.status}`
    if (withdrawFilter.value.dateRange) {
      url += `&startDate=${withdrawFilter.value.dateRange[0]}&endDate=${withdrawFilter.value.dateRange[1]}`
    }
    const res = await api.get(url)
    if (res.data.code === 200) {
      withdrawList.value = res.data.data.list
      withdrawTotal.value = res.data.data.pagination.total
    }
  } catch (err) {
    console.error('获取提现列表失败:', err)
  }
}

// 审核
const auditDeposit = (row, status) => {
  auditDialog.value = {
    visible: true,
    type: 'deposit',
    id: row.id,
    status,
    remark: ''
  }
}

const auditWithdraw = (row, status) => {
  auditDialog.value = {
    visible: true,
    type: 'withdraw',
    id: row.id,
    status,
    remark: ''
  }
}

const confirmAudit = async () => {
  try {
    const { type, id, status, remark } = auditDialog.value
    const url = type === 'deposit' 
      ? `/admin/fund/deposits/${id}/audit`
      : `/admin/fund/withdrawals/${id}/audit`
    
    const res = await api.post(url, { status, remark })
    if (res.data.code === 200) {
      ElMessage.success('审核完成')
      auditDialog.value.visible = false
      if (type === 'deposit') fetchDeposits()
      else fetchWithdrawals()
      fetchStats()
    }
  } catch (err) {
    console.error('审核失败:', err)
  }
}

// 获取配置
const fetchConfigs = async () => {
  try {
    const res = await api.get('/admin/fund/payment-configs')
    if (res.data.code === 200) {
      configList.value = res.data.data
    }
  } catch (err) {
    console.error('获取配置失败:', err)
  }
}

// 保存配置
const saveConfig = async () => {
  try {
    // 表单验证
    if (!configForm.value.method) {
      ElMessage.warning('请输入支付方式ID')
      return
    }
    if (!configForm.value.method_type) {
      ElMessage.warning('请选择类型')
      return
    }
    if (!configForm.value.name) {
      ElMessage.warning('请输入显示名称')
      return
    }
    
    if (editingConfig.value) {
      const res = await api.put(`/admin/fund/payment-configs/${editingConfig.value.id}`, configForm.value)
      if (res.data.code !== 200) {
        ElMessage.error(res.data.message || '更新失败')
        return
      }
    } else {
      const res = await api.post('/admin/fund/payment-configs', configForm.value)
      if (res.data.code !== 200) {
        ElMessage.error(res.data.message || '添加失败')
        return
      }
    }
    ElMessage.success('保存成功')
    showConfigDialog.value = false
    fetchConfigs()
  } catch (err) {
    console.error('保存配置失败:', err)
    ElMessage.error('保存失败，请检查网络或联系管理员')
  }
}

// 编辑配置
const editConfig = (row) => {
  editingConfig.value = row
  // 将后端下划线字段名映射为前端驼峰格式
  configForm.value = {
    method: row.method || '',
    method_type: row.method_type || 'crypto',
    name: row.name || '',
    address: row.address || '',
    bank_name: row.bank_name || '',
    account_name: row.account_name || '',
    network: row.network || '',
    min_amount: row.min_amount || 0,
    max_amount: row.max_amount || 0,
    fee_rate: row.fee_rate || 0,
    fee_fixed: row.fee_fixed || 0,
    qr_code: row.qr_code || '',
    sort_order: row.sort_order || 0,
    status: row.status !== undefined ? row.status : 1
  }
  showConfigDialog.value = true
}

// 删除配置
const deleteConfig = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除此支付方式?', '提示', { type: 'warning' })
    await api.delete(`/admin/fund/payment-configs/${row.id}`)
    ElMessage.success('删除成功')
    fetchConfigs()
  } catch (err) {
    if (err !== 'cancel') console.error('删除失败:', err)
  }
}

// 更新配置状态
const updateConfigStatus = async (row) => {
  try {
    await api.put(`/admin/fund/payment-configs/${row.id}`, { status: row.status })
    ElMessage.success('更新成功')
  } catch (err) {
    console.error('更新状态失败:', err)
  }
}

// 获取统计
const fetchStats = async () => {
  try {
    const res = await api.get('/admin/fund/statistics')
    if (res.data.code === 200) {
      stats.value = res.data.data
    }
  } catch (err) {
    console.error('获取统计失败:', err)
  }
}

const getStatusType = (status) => {
  const types = { 0: 'warning', 1: 'primary', 2: 'danger', 3: 'success' }
  return types[status] || 'info'
}

const formatAmount = (val) => {
  return parseFloat(val || 0).toFixed(4)
}

const formatTime = (time) => {
  return new Date(time).toLocaleString()
}

onMounted(() => {
  fetchDeposits()
  fetchWithdrawals()
  fetchConfigs()
  fetchStats()
})
</script>

<style scoped>
.fund-manage {
  padding: 20px;
}

.filter-bar {
  margin-bottom: 20px;
}

.config-header {
  margin-bottom: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  color: #909399;
  margin-top: 8px;
}

.proof-image {
  margin-top: 20px;
}

.proof-image h4 {
  margin-bottom: 12px;
  color: #303133;
}

.proof-image img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  transition: transform 0.3s;
}

.proof-image img:hover {
  transform: scale(1.02);
  border-color: #409eff;
}
</style>
