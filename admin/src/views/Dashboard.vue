<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #e6f7ff;">
            <el-icon color="#1890ff"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.userCount }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #f6ffed;">
            <el-icon color="#52c41a"><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalVolume }}</div>
            <div class="stat-label">24h成交量</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #fff7e6;">
            <el-icon color="#fa8c16"><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.orderCount }}</div>
            <div class="stat-label">今日订单</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #fff1f0;">
            <el-icon color="#f5222d"><Wallet /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pendingWithdraw }}</div>
            <div class="stat-label">待审核提现</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="12">
        <el-card title="交易量趋势">
          <div ref="chartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card title="最新注册用户">
          <el-table :data="recentUsers" style="width: 100%">
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column prop="created_at" label="注册时间">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import api from '@/utils/api'
import * as echarts from 'echarts'

const stats = ref({
  userCount: 0,
  totalVolume: 0,
  orderCount: 0,
  pendingWithdraw: 0
})

const recentUsers = ref([])
const chartRef = ref(null)
let chart = null

onMounted(() => {
  fetchStats()
  fetchRecentUsers()
  nextTick(() => initChart())
})

const fetchStats = async () => {
  try {
    const res = await api.get('/admin/stats')
    if (res.data.code === 200) {
      stats.value = res.data.data
    }
  } catch (err) {
    console.error('获取统计数据失败:', err)
  }
}

const fetchRecentUsers = async () => {
  try {
    const res = await api.get('/admin/users?limit=5')
    if (res.data.code === 200) {
      recentUsers.value = res.data.data.list
    }
  } catch (err) {
    console.error('获取用户失败:', err)
  }
}

const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  
  const option = {
    xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
    yAxis: { type: 'value' },
    series: [{
      data: [120, 200, 150, 80, 70, 110, 130],
      type: 'line',
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#1890ff' },
            { offset: 1, color: '#fff' }
          ]
        }
      }
    }]
  }
  chart.setOption(option)
}

const formatTime = (time) => {
  return new Date(time).toLocaleString()
}
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-info {
  margin-left: 16px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #262626;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-top: 4px;
}
</style>