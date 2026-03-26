<template>
  <div class="kyc-manage">
    <h2>KYC 实名认证管理</h2>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="4">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">{{ stats.total || 0 }}</div>
            <div class="stat-label">总申请</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div class="stat-item">
            <div class="stat-value text-warning">{{ stats.pending || 0 }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div class="stat-item">
            <div class="stat-value text-success">{{ stats.approved || 0 }}</div>
            <div class="stat-label">已通过</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div class="stat-item">
            <div class="stat-value text-danger">{{ stats.rejected || 0 }}</div>
            <div class="stat-label">已拒绝</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">{{ stats.l1_count || 0 }}</div>
            <div class="stat-label">L1认证</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">{{ stats.l2_count || 0 }}</div>
            <div class="stat-label">L2认证</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filter.status" placeholder="认证状态" clearable style="width: 120px">
        <el-option label="待审核" :value="1" />
        <el-option label="已通过" :value="2" />
        <el-option label="已拒绝" :value="3" />
      </el-select>
      <el-select v-model="filter.level" placeholder="认证级别" clearable style="width: 120px; margin-left: 10px">
        <el-option label="L1基础" :value="1" />
        <el-option label="L2高级" :value="2" />
      </el-select>
      <el-input v-model="filter.keyword" placeholder="搜索用户/姓名/证件号" style="width: 200px; margin-left: 10px" />
      <el-button type="primary" @click="fetchList" style="margin-left: 10px">查询</el-button>
    </div>

    <!-- 列表 -->
    <el-table :data="kycList" border v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="email" label="邮箱" width="180" />
      <el-table-column prop="real_name" label="真实姓名" width="100" />
      <el-table-column prop="id_card" label="证件号" width="150">
        <template #default="{ row }">
          {{ maskIdCard(row.id_card) }}
        </template>
      </el-table-column>
      <el-table-column prop="levelName" label="认证级别" width="100">
        <template #default="{ row }">
          <el-tag :type="row.level === 1 ? 'primary' : 'success'">{{ row.levelName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="statusName" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ row.statusName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="daily_withdraw_limit" label="提现限额" width="120">
        <template #default="{ row }">
          {{ row.daily_withdraw_limit }} USDT
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="申请时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="viewDetail(row)">查看</el-button>
          <template v-if="row.status === 1">
            <el-button type="success" size="small" @click="handleAudit(row, 2)">通过</el-button>
            <el-button type="danger" size="small" @click="handleAudit(row, 3)">拒绝</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :page-size="10"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 20px"
      @current-change="fetchList"
    />

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialog.visible" title="认证详情" width="600px">
      <el-descriptions :column="2" border v-if="detailDialog.data">
        <el-descriptions-item label="用户名">{{ detailDialog.data.username }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detailDialog.data.email }}</el-descriptions-item>
        <el-descriptions-item label="真实姓名">{{ detailDialog.data.real_name }}</el-descriptions-item>
        <el-descriptions-item label="证件号">{{ detailDialog.data.id_card }}</el-descriptions-item>
        <el-descriptions-item label="证件类型">{{ detailDialog.data.id_type === 'id_card' ? '身份证' : '护照' }}</el-descriptions-item>
        <el-descriptions-item label="国家/地区">{{ detailDialog.data.country }}</el-descriptions-item>
        <el-descriptions-item label="认证级别">{{ detailDialog.data.levelName }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailDialog.data.statusName }}</el-descriptions-item>
        <el-descriptions-item label="每日限额">{{ detailDialog.data.daily_withdraw_limit }} USDT</el-descriptions-item>
        <el-descriptions-item label="提交次数">{{ detailDialog.data.submit_count }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatTime(detailDialog.data.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ detailDialog.data.verified_at ? formatTime(detailDialog.data.verified_at) : '-' }}</el-descriptions-item>
      </el-descriptions>
      
      <!-- 证件照片 -->
      <div v-if="detailDialog.data && detailDialog.data.level >= 2" class="id-images">
        <h4>证件照片 (点击图片放大)</h4>
        <div class="image-list">
          <div v-if="detailDialog.data.id_card_front" class="image-item" @click="showImagePreview(detailDialog.data.id_card_front)">
            <img :src="getFullImageUrl(detailDialog.data.id_card_front)" alt="身份证正面" />
            <span>身份证正面</span>
          </div>
          <div v-if="detailDialog.data.id_card_back" class="image-item" @click="showImagePreview(detailDialog.data.id_card_back)">
            <img :src="getFullImageUrl(detailDialog.data.id_card_back)" alt="身份证背面" />
            <span>身份证背面</span>
          </div>
          <div v-if="detailDialog.data.id_card_hand" class="image-item" @click="showImagePreview(detailDialog.data.id_card_hand)">
            <img :src="getFullImageUrl(detailDialog.data.id_card_hand)" alt="手持身份证" />
            <span>手持身份证</span>
          </div>
        </div>
      </div>
      
      <!-- 拒绝原因 -->
      <div v-if="detailDialog.data && detailDialog.data.status === 3" class="reject-info">
        <el-alert :title="'拒绝原因: ' + detailDialog.data.reject_reason" type="error" :closable="false" />
      </div>

      <template #footer>
        <el-button @click="detailDialog.visible = false">关闭</el-button>
        <template v-if="detailDialog.data && detailDialog.data.status === 1">
          <el-button type="success" @click="handleAudit(detailDialog.data, 2)">审核通过</el-button>
          <el-button type="danger" @click="showRejectDialog">审核拒绝</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 图片预览对话框 -->
    <el-dialog v-model="imagePreview.visible" title="图片预览" width="800px" :fullscreen="true">
      <div style="text-align: center; padding: 20px;">
        <img :src="imagePreview.url" style="max-width: 100%; max-height: 80vh; border-radius: 8px;" />
      </div>
    </el-dialog>

    <!-- 拒绝原因对话框 -->
    <el-dialog v-model="rejectDialog.visible" title="拒绝原因" width="400px">
      <el-input
        v-model="rejectDialog.reason"
        type="textarea"
        :rows="3"
        placeholder="请输入拒绝原因"
      />
      <template #footer>
        <el-button @click="rejectDialog.visible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const kycList = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const stats = ref({})

const filter = ref({
  status: undefined,
  level: undefined,
  keyword: ''
})

const detailDialog = ref({
  visible: false,
  data: null
})

const rejectDialog = ref({
  visible: false,
  reason: '',
  row: null
})

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
  if (!url) return ''
  const baseUrl = getApiBaseUrl()
  return url.startsWith('http') ? url : baseUrl + url
}

const showImagePreview = (url) => {
  imagePreview.value.url = getFullImageUrl(url)
  imagePreview.value.visible = true
}

const fetchList = async () => {
  loading.value = true
  try {
    let url = `/admin/kyc/list?page=${page.value}`
    if (filter.value.status !== undefined) url += `&status=${filter.value.status}`
    if (filter.value.level !== undefined) url += `&level=${filter.value.level}`
    if (filter.value.keyword) url += `&keyword=${filter.value.keyword}`
    
    const res = await api.get(url)
    if (res.data.code === 200) {
      kycList.value = res.data.data.list
      total.value = res.data.data.pagination.total
    }
  } catch (err) {
    console.error('获取列表失败:', err)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const res = await api.get('/admin/kyc/statistics')
    if (res.data.code === 200) {
      stats.value = res.data.data
    }
  } catch (err) {
    console.error('获取统计失败:', err)
  }
}

const viewDetail = async (row) => {
  try {
    const res = await api.get(`/admin/kyc/detail/${row.id}`)
    if (res.data.code === 200) {
      detailDialog.value.data = res.data.data
      detailDialog.value.visible = true
    }
  } catch (err) {
    console.error('获取详情失败:', err)
  }
}

const handleAudit = async (row, status) => {
  if (status === 3) {
    rejectDialog.value.row = row
    rejectDialog.value.visible = true
    return
  }
  
  try {
    await ElMessageBox.confirm('确认通过该认证申请?', '提示', { type: 'warning' })
    const res = await api.post(`/admin/kyc/audit/${row.id}`, { status })
    if (res.data.code === 200) {
      ElMessage.success('审核通过')
      fetchList()
      fetchStats()
      if (detailDialog.value.visible) {
        detailDialog.value.visible = false
      }
    }
  } catch (err) {
    if (err !== 'cancel') console.error('审核失败:', err)
  }
}

const showRejectDialog = () => {
  rejectDialog.value.row = detailDialog.value.data
  rejectDialog.value.visible = true
}

const confirmReject = async () => {
  if (!rejectDialog.value.reason) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  
  try {
    const res = await api.post(`/admin/kyc/audit/${rejectDialog.value.row.id}`, {
      status: 3,
      rejectReason: rejectDialog.value.reason
    })
    if (res.data.code === 200) {
      ElMessage.success('已拒绝')
      rejectDialog.value.visible = false
      fetchList()
      fetchStats()
      if (detailDialog.value.visible) {
        detailDialog.value.visible = false
      }
    }
  } catch (err) {
    console.error('审核失败:', err)
  }
}

const maskIdCard = (idCard) => {
  if (!idCard) return '-'
  if (idCard.length <= 8) return idCard
  return idCard.substring(0, 4) + '****' + idCard.substring(idCard.length - 4)
}

const getStatusType = (status) => {
  const types = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }
  return types[status] || 'info'
}

const formatTime = (time) => {
  return time ? new Date(time).toLocaleString() : '-'
}

onMounted(() => {
  fetchList()
  fetchStats()
})
</script>

<style scoped>
.kyc-manage {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-value.text-success {
  color: #67c23a;
}

.stat-value.text-warning {
  color: #e6a23c;
}

.stat-value.text-danger {
  color: #f56c6c;
}

.stat-label {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

.filter-bar {
  margin-bottom: 20px;
}

.id-images {
  margin-top: 20px;
}

.id-images h4 {
  margin-bottom: 16px;
}

.image-list {
  display: flex;
  gap: 16px;
}

.image-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.3s;
}

.image-item:hover {
  background: #f5f7fa;
}

.image-item img {
  width: 150px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  transition: transform 0.3s;
}

.image-item:hover img {
  transform: scale(1.05);
  border-color: #409eff;
}

.image-item span {
  font-size: 12px;
  color: #606266;
}

.reject-info {
  margin-top: 20px;
}
</style>
