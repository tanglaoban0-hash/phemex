<template>
  <div class="pairs-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span>交易对管理</span>
          <el-button type="primary" @click="showAddDialog">添加交易对</el-button>
        </div>
      </template>
      
      <el-table :data="pairs">
        <el-table-column prop="symbol" label="交易对" />
        <el-table-column prop="price" label="当前价格" />
        <el-table-column prop="price_change_24h" label="24h涨跌">
          <template #default="{ row }">
            <span :class="row.price_change_24h >= 0 ? 'up' : 'down'">
              {{ row.price_change_24h >= 0 ? '+' : '' }}{{ row.price_change_24h }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="volume_24h" label="24h成交量" />
        <el-table-column prop="min_amount" label="最小交易量" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editPair(row)">编辑</el-button>
            <el-button :type="row.status === 1 ? 'danger' : 'success'" size="small" @click="toggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'

const pairs = ref([])

onMounted(() => {
  fetchPairs()
})

const fetchPairs = async () => {
  try {
    const res = await api.get('/admin/pairs')
    if (res.data.code === 200) {
      pairs.value = res.data.data
    }
  } catch (err) {
    console.error('获取交易对失败:', err)
  }
}

const showAddDialog = () => {
  ElMessage.info('添加功能开发中...')
}

const editPair = (row) => {
  console.log('编辑:', row)
}

const toggleStatus = async (row) => {
  try {
    const res = await api.post(`/admin/pairs/${row.id}/status`, {
      status: row.status === 1 ? 0 : 1
    })
    if (res.data.code === 200) {
      ElMessage.success('操作成功')
      fetchPairs()
    }
  } catch (err) {
    console.error('操作失败:', err)
  }
}
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.up { color: #52c41a; }
.down { color: #f5222d; }
</style>