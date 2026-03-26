<template>
  <div class="orders-page">
    <h2>订单管理</h2>
    
    <el-tabs v-model="activeTab">
      <el-tab-pane label="当前委托" name="active">
        <el-table :data="activeOrders" style="width: 100%">
          <el-table-column label="时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="交易对" prop="pair_symbol" width="120" />
          <el-table-column label="类型" width="100">
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
          <el-table-column label="价格" align="right">
            <template #default="{ row }">
              {{ row.price || '市价' }}
            </template>
          </el-table-column>
          <el-table-column label="数量" align="right" prop="amount" />
          <el-table-column label="已成交" align="right" prop="filled_amount" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
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
          <el-table-column label="时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="交易对" prop="pair_symbol" width="120" />
          <el-table-column label="类型" width="100">
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
          <el-table-column label="成交均价" align="right" prop="avg_price" />
          <el-table-column label="成交数量" align="right" prop="filled_amount" />
          <el-table-column label="手续费" align="right" prop="fee" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="fetchHistoryOrders"
          />
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="成交记录" name="trades">
        <el-table :data="trades" style="width: 100%">
          <el-table-column label="时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="交易对" prop="pair_symbol" width="120" />
          <el-table-column label="方向" width="80">
            <template #default="{ row }">
              <span :class="row.side === 1 ? 'buy' : 'sell'">
                {{ row.side === 1 ? '买入' : '卖出' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="成交价格" align="right" prop="price" />
          <el-table-column label="成交数量" align="right" prop="amount" />
          <el-table-column label="成交金额" align="right" prop="total" />
          <el-table-column label="手续费" align="right" prop="fee" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('active')
const activeOrders = ref([])
const historyOrders = ref([])
const trades = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

onMounted(() => {
  fetchActiveOrders()
})

watch(activeTab, (val) => {
  if (val === 'active') fetchActiveOrders()
  if (val === 'history') fetchHistoryOrders()
  if (val === 'trades') fetchTrades()
})

const fetchActiveOrders = async () => {
  try {
    const res = await api.get('/trade/orders?status=0,1')
    if (res.data.code === 200) {
      activeOrders.value = res.data.data.list
    }
  } catch (err) {
    console.error('获取订单失败:', err)
  }
}

const fetchHistoryOrders = async () => {
  try {
    const res = await api.get(`/trade/orders?status=2,3&page=${page.value}&limit=${pageSize.value}`)
    if (res.data.code === 200) {
      historyOrders.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    console.error('获取历史订单失败:', err)
  }
}

const fetchTrades = async () => {
  try {
    const res = await api.get('/trade/trades')
    if (res.data.code === 200) {
      trades.value = res.data.data.list
    }
  } catch (err) {
    console.error('获取成交记录失败:', err)
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
.orders-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: #fff;
}

.buy {
  color: #00d4aa;
}

.sell {
  color: #ff6b6b;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

:deep(.el-tabs__item) {
  color: #8b949e;
}

:deep(.el-tabs__item.is-active) {
  color: #00d4aa;
}

:deep(.el-tabs__active-bar) {
  background-color: #00d4aa;
}

:deep(.el-table) {
  background: transparent;
  
  th, td {
    background: #161b22;
    border-bottom: 1px solid #30363d;
    color: #fff;
  }
  
  tr:hover td {
    background: #21262d;
  }
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .orders-page {
    padding: 12px;
  }

  h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }

  /* 表格横向滚动 */
  :deep(.el-table) {
    font-size: 12px;
  }

  :deep(.el-table .cell) {
    white-space: nowrap;
    padding: 0 8px;
  }

  /* 标签页样式 */
  :deep(.el-tabs__item) {
    font-size: 14px;
    padding: 0 12px;
  }

  .pagination {
    margin-top: 16px;
  }
}
</style>