<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <el-input v-model="searchQuery" placeholder="搜索用户" style="width: 200px;">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="fetchUsers">刷新</el-button>
        </div>
      </template>
      
      <el-table :data="users" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button :type="row.status === 1 ? 'danger' : 'success'" size="small" @click="toggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchUsers"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'

const users = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchQuery = ref('')

onMounted(() => {
  fetchUsers()
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await api.get(`/admin/users?page=${page.value}&limit=${pageSize.value}&search=${searchQuery.value}`)
    if (res.data.code === 200) {
      users.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    console.error('获取用户失败:', err)
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (row) => {
  try {
    const res = await api.post(`/admin/users/${row.id}/status`, {
      status: row.status === 1 ? 0 : 1
    })
    if (res.data.code === 200) {
      ElMessage.success('操作成功')
      fetchUsers()
    }
  } catch (err) {
    console.error('操作失败:', err)
  }
}

const viewDetail = (row) => {
  console.log('查看详情:', row)
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