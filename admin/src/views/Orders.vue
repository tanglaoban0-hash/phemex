<template>
  <div class="orders-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span>订单管理</span>
          <el-input v-model="searchQuery" placeholder="搜索订单号/用户" style="width: 200px;">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>
      
      <el-table :data="orders" v-loading="loading">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="username" label="用户" />
        <el-table-column prop="pair_symbol" label="交易对" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 1 ? '' : 'info'" size="small">
              {{ row.type === 1 ? '限价' : '市价' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="方向" width="80">
          <template #default="{ row }">
            <span :class="row.side === 1 ? 'buy' : 'sell'">
              {{ row.side === 1 ? '买入' : '卖出' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" />
        <el-table-column prop="amount" label="数量" />
        <el-table-column prop="filled_amount" label="已成交" />
        <el-table-column label="状态" width="100">
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
      
      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchOrders"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const orders = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchQuery = ref('')

onMounted(() => {
  fetchOrders()
})

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await api.get(`/admin/orders?page=${page.value}&limit=${pageSize.value}&search=${searchQuery.value}`)
    if (res.data.code === 200) {
      orders.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    console.error('获取订单失败:', err)
  } finally {
    loading.value = false
  }
}

const getStatusType = (status) => {
  const types = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = { 0: '待成交', 1: '部分成交', 2: '完全成交', 3: '已撤销' }
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

.buy { color: #52c41a; }
.sell { color: #f5222d; }

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>