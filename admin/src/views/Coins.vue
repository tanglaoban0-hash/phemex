<template>
  <div class="coins-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span>币种管理</span>
          <el-button type="primary" @click="showAddDialog">添加币种</el-button>
        </div>
      </template>
      
      <el-table :data="coins">
        <el-table-column prop="symbol" label="币种" width="100" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="decimals" label="精度" width="80" />
        <el-table-column label="基准货币" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_base ? 'success' : 'info'">
              {{ row.is_base ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="min_withdraw" label="最小提现" />
        <el-table-column prop="withdraw_fee" label="提现手续费" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editCoin(row)">编辑</el-button>
            <el-button :type="row.status === 1 ? 'danger' : 'success'" size="small" @click="toggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑币种对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑币种' : '添加币种'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="币种符号" prop="symbol">
          <el-input v-model="form.symbol" placeholder="如: BTC" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="币种名称" prop="name">
          <el-input v-model="form.name" placeholder="如: Bitcoin" />
        </el-form-item>
        <el-form-item label="精度">
          <el-input-number v-model="form.decimals" :min="0" :max="18" />
        </el-form-item>
        <el-form-item label="基准货币">
          <el-switch v-model="form.is_base" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="最小提现">
          <el-input v-model="form.min_withdraw" type="number" />
        </el-form-item>
        <el-form-item label="提现手续费">
          <el-input v-model="form.withdraw_fee" type="number" />
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

const coins = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const form = ref({
  symbol: '',
  name: '',
  decimals: 8,
  is_base: 0,
  min_withdraw: 0,
  withdraw_fee: 0
})

const rules = {
  symbol: [{ required: true, message: '请输入币种符号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入币种名称', trigger: 'blur' }]
}

onMounted(() => {
  fetchCoins()
})

const fetchCoins = async () => {
  try {
    const res = await api.get('/admin/coins')
    if (res.data.code === 200) {
      coins.value = res.data.data
    }
  } catch (err) {
    console.error('获取币种失败:', err)
  }
}

const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    symbol: '',
    name: '',
    decimals: 8,
    is_base: 0,
    min_withdraw: 0,
    withdraw_fee: 0
  }
  dialogVisible.value = true
}

const editCoin = (row) => {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

const submitForm = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const url = isEdit.value ? `/admin/coins/${form.value.id}` : '/admin/coins'
    const method = isEdit.value ? 'put' : 'post'
    const res = await api[method](url, form.value)
    
    if (res.data.code === 200) {
      ElMessage.success(isEdit.value ? '编辑成功' : '添加成功')
      dialogVisible.value = false
      fetchCoins()
    }
  } catch (err) {
    console.error('提交失败:', err)
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (row) => {
  try {
    const res = await api.post(`/admin/coins/${row.id}/status`, {
      status: row.status === 1 ? 0 : 1
    })
    if (res.data.code === 200) {
      ElMessage.success('操作成功')
      fetchCoins()
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
</style>