<template>
  <div class="option-control-page">
    <h2>秒合约控制面板</h2>
    
    <!-- 统计概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-label">今日总投注</div>
          <div class="stat-value">{{ stats.totalBet }} USDT</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-label">今日总盈亏</div>
          <div class="stat-value" :class="stats.totalProfit >= 0 ? 'up' : 'down'">
            {{ stats.totalProfit >= 0 ? '+' : '' }}{{ stats.totalProfit }} USDT
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-label">当前用户胜率</div>
          <div class="stat-value">{{ currentRate }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-label">今日订单数</div>
          <div class="stat-value">{{ stats.totalOrders }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 胜率控制 -->
    <el-card class="control-card">
      <template #header>
        <span>胜率控制</span>
      </template>
      
      <div class="control-content">
        <div class="rate-slider">
          <span class="label">用户胜率</span>
          <el-slider v-model="userWinRate" :min="0" :max="100" show-stops :step="5" />
          <span class="value">{{ userWinRate }}%</span>
        </div>
        
        <div class="control-tip">
          <el-alert
            title="控制说明"
            description="调整用户胜率可以控制平台的盈亏。胜率越高，用户越容易赢；胜率越低，平台越容易盈利。建议设置在40%-60%之间。"
            type="info"
            show-icon
            :closable="false"
          />
        </div>
        
        <el-button type="primary" :loading="saving" @click="saveWinRate">
          保存设置
        </el-button>
      </div>
    </el-card>

    <!-- 合约类型管理 -->
    <el-card class="contracts-card">
      <template #header>
        <div class="header-actions">
          <span>合约类型管理</span>
          <el-button type="primary" size="small" @click="showAddDialog">添加合约</el-button>
        </div>
      </template>
      
      <el-table :data="contracts">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="duration" label="持续时间">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column prop="profit_rate" label="收益率">
          <template #default="{ row }">
            {{ (row.profit_rate * 100).toFixed(0) }}%
          </template>
        </el-table-column>
        <el-table-column prop="min_amount" label="最小金额" />
        <el-table-column prop="max_amount" label="最大金额" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editContract(row)">编辑</el-button>
            <el-button :type="row.status === 1 ? 'danger' : 'success'" size="small" @click="toggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 最近订单 -->
    <el-card class="orders-card">
      <template #header>
        <span>最近秒合约订单</span>
      </template>
      
      <el-table :data="recentOrders">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="username" label="用户" />
        <el-table-column prop="pair_symbol" label="交易对" />
        <el-table-column label="方向" width="80">
          <template #default="{ row }">
            <span :class="row.direction === 1 ? 'up' : 'down'">
              {{ row.direction === 1 ? '看涨' : '看跌' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" />
        <el-table-column label="盈亏" prop="profit_amount">
          <template #default="{ row }">
            <span :class="row.profit_amount > 0 ? 'up' : row.profit_amount < 0 ? 'down' : ''">
              {{ row.profit_amount > 0 ? '+' : '' }}{{ row.profit_amount }}
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
        <el-table-column prop="created_at" label="时间">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑合约对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑合约' : '添加合约'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：30秒" />
        </el-form-item>
        <el-form-item label="持续时间" prop="duration">
          <el-input-number v-model="form.duration" :min="10" :step="10" />
          <span class="unit">秒</span>
        </el-form-item>
        <el-form-item label="收益率" prop="profit_rate">
          <el-input-number v-model="form.profit_rate" :min="0.1" :max="2" :step="0.05" />
          <span class="unit">%</span>
        </el-form-item>
        <el-form-item label="最小金额" prop="min_amount">
          <el-input-number v-model="form.min_amount" :min="1" />
        </el-form-item>
        <el-form-item label="最大金额" prop="max_amount">
          <el-input-number v-model="form.max_amount" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'

const stats = ref({
  totalBet: 0,
  totalProfit: 0,
  totalOrders: 0
})

const currentRate = ref(50)
const userWinRate = ref(50)
const saving = ref(false)

const contracts = ref([])
const recentOrders = ref([])

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const form = ref({
  name: '',
  duration: 60,
  profit_rate: 0.75,
  min_amount: 10,
  max_amount: 1000
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入持续时间', trigger: 'blur' }],
  profit_rate: [{ required: true, message: '请输入收益率', trigger: 'blur' }]
}

onMounted(() => {
  fetchStats()
  fetchWinRate()
  fetchContracts()
  fetchRecentOrders()
})

const fetchStats = async () => {
  try {
    const res = await api.get('/admin/option/stats')
    if (res.data.code === 200) {
      stats.value = res.data.data
    }
  } catch (err) {
    console.error('获取统计失败:', err)
  }
}

const fetchWinRate = async () => {
  try {
    const res = await api.get('/admin/option/win-rate')
    if (res.data.code === 200) {
      currentRate.value = res.data.data.rate
      userWinRate.value = res.data.data.rate
    }
  } catch (err) {
    console.error('获取胜率失败:', err)
  }
}

const saveWinRate = async () => {
  saving.value = true
  try {
    const res = await api.post('/admin/option/win-rate', {
      rate: userWinRate.value
    })
    if (res.data.code === 200) {
      ElMessage.success('保存成功')
      currentRate.value = userWinRate.value
    }
  } catch (err) {
    console.error('保存失败:', err)
  } finally {
    saving.value = false
  }
}

const fetchContracts = async () => {
  try {
    const res = await api.get('/option/contracts')
    if (res.data.code === 200) {
      contracts.value = res.data.data
    }
  } catch (err) {
    console.error('获取合约失败:', err)
  }
}

const fetchRecentOrders = async () => {
  try {
    const res = await api.get('/admin/option/orders?limit=20')
    if (res.data.code === 200) {
      recentOrders.value = res.data.data.list
    }
  } catch (err) {
    console.error('获取订单失败:', err)
  }
}

const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    name: '',
    duration: 60,
    profit_rate: 0.75,
    min_amount: 10,
    max_amount: 1000
  }
  dialogVisible.value = true
}

const editContract = (row) => {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

const submitForm = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const url = isEdit.value ? `/admin/option/contracts/${form.value.id}` : '/admin/option/contracts'
    const method = isEdit.value ? 'put' : 'post'
    const res = await api[method](url, form.value)
    
    if (res.data.code === 200) {
      ElMessage.success(isEdit.value ? '编辑成功' : '添加成功')
      dialogVisible.value = false
      fetchContracts()
    }
  } catch (err) {
    console.error('提交失败:', err)
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (row) => {
  try {
    const res = await api.post(`/admin/option/contracts/${row.id}/status`, {
      status: row.status === 1 ? 0 : 1
    })
    if (res.data.code === 200) {
      ElMessage.success('操作成功')
      fetchContracts()
    }
  } catch (err) {
    console.error('操作失败:', err)
  }
}

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  return `${Math.floor(seconds / 3600)}小时`
}

const formatTime = (time) => {
  return new Date(time).toLocaleString()
}

const getStatusType = (status) => {
  const types = { 0: 'info', 1: 'success', 2: 'danger', 3: 'warning' }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = { 0: '进行中', 1: '盈利', 2: '亏损', 3: '平局' }
  return texts[status] || '未知'
}
</script>

<style scoped>
.option-control-page {
  padding: 24px;
}

h2 {
  margin-bottom: 24px;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #262626;
}

.control-card,
.contracts-card,
.orders-card {
  margin-bottom: 24px;
}

.control-content {
  padding: 20px;
}

.rate-slider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.rate-slider .label {
  width: 80px;
  font-weight: 500;
}

.rate-slider .el-slider {
  flex: 1;
}

.rate-slider .value {
  width: 60px;
  text-align: right;
  font-size: 18px;
  font-weight: bold;
  color: #1890ff;
}

.control-tip {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.up {
  color: #52c41a;
}

.down {
  color: #f5222d;
}

.unit {
  margin-left: 8px;
  color: #8c8c8c;
}
</style>