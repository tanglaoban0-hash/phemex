<template>
  <div class="fund-page">
    <h2>资金管理</h2>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="充值" name="deposit">
        <div class="fund-content">
          <p style="color: #8b949e; padding: 40px; text-align: center;">充值功能</p>
        </div>
      </el-tab-pane>
      <el-tab-pane label="提现" name="withdraw">
        <div class="fund-content">
          <p style="color: #8b949e; padding: 40px; text-align: center;">提现功能</p>
        </div>
      </el-tab-pane>
      <el-tab-pane label="记录" name="records">
        <div class="fund-content">
          <el-empty description="暂无记录" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('deposit')
</script>

<style scoped>
.fund-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  color: #fff;
  margin-bottom: 24px;
}

.fund-content {
  padding: 20px 0;
}

@media screen and (max-width: 768px) {
  .fund-page {
    padding: 16px;
  }
  
  h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }
}
</style>
