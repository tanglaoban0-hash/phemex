<template>
  <div class="withdrawals-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <el-radio-group v-model="filterStatus" @change="fetchWithdrawals">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="0">待审核</el-radio-button>
            <el-radio-button label="1">已通过</el-radio-button>
            <el-radio-button label="2">已驳回</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      
      <el-table :data="withdrawals" v-loading="loading">
        <el-table-column prop="withdraw_no" label="提现单号" width="180" />
        <el-table-column prop="username" label="用户" />
        <el-table-column prop="coin_symbol" label="币种" width="80" />
        <el-table-column prop="amount" label="数量" />
        <el-table-column prop="fee" label="手续费" />
        <el-table-column prop="real_amount" label="实际到账" />
        <el-table-column prop="address" label="地址" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" v-if="filterStatus === '0' || filterStatus === ''">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button type="success" size="small" @click="audit(row, 1)">通过</el-button>
              <el-button type="danger" size="small" @click="audit(row, 2)">驳回</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchWithdrawals"
        />
      </div>
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditVisible" title="提现审核" width="400px">
      <p>用户: {{ currentWithdraw?.username }}</p>
      <p>数量: {{ currentWithdraw?.amount }} {{ currentWithdraw?.coin_symbol }}</p>
      <el-input
        v-model="auditRemark"
        type="textarea"
        placeholder="审核备注（可选）"
        rows="3"
        style="margin-top: 16px;"
      />
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAudit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'

const withdrawals = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterStatus = ref('0')

const auditVisible = ref(false)
const currentWithdraw = ref(null)
const auditAction = ref(1)
const auditRemark = ref('')
const submitting = ref(false)

onMounted(() => {
  fetchWithdrawals()
})

const fetchWithdrawals = async () => {
  loading.value = true
  try {
    const res = await api.get(`/admin/withdrawals?page=${page.value}&limit=${pageSize.value}&status=${filterStatus.value}`)
    if (res.data.code === 200) {
      withdrawals.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    console.error('获取提现列表失败:', err)
  } finally {
    loading.value = false
  }
}

const audit = (row, action) => {
  currentWithdraw.value = row
  auditAction.value = action
  auditRemark.value = ''
  auditVisible.value = true
}

const submitAudit = async () => {
  submitting.value = true
  try {
    const res = await api.post(`/admin/withdrawals/${currentWithdraw.value.id}/audit`, {
      status: auditAction.value,
      remark: auditRemark.value
    })
    if (res.data.code === 200) {
      ElMessage.success('审核完成')
      auditVisible.value = false
      fetchWithdrawals()
    }
  } catch (err) {
    console.error('审核失败:', err)
  } finally {
    submitting.value = false
  }
}

const getStatusType = (status) => {
  const types = { 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = { 0: '待审核', 1: '已通过', 2: '已驳回', 3: '已到账' }
  return texts[status] || '未知'
}

const formatTime = (time) => {
  return new Date(time).toLocaleString()
}
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>