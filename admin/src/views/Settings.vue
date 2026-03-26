<template>
  <div class="settings-page">
    <el-card title="系统设置">
      <el-form :model="settings" label-width="150px">
        <el-form-item label="网站名称">
          <el-input v-model="settings.site_name" />
        </el-form-item>
        <el-form-item label="买入手续费率">
          <el-input v-model="settings.trading_fee_buy">
            <template #append>%</template>
          </el-input>
        </el-form-item>
        <el-form-item label="卖出手续费率">
          <el-input v-model="settings.trading_fee_sell">
            <template #append>%</template>
          </el-input>
        </el-form-item>
        <el-form-item label="注册赠送USDT">
          <el-input v-model="settings.register_gift_usdt" />
        </el-form-item>
        <el-form-item label="邀请奖励USDT">
          <el-input v-model="settings.invite_reward_usdt" />
        </el-form-item>
        <el-form-item label="最小提现USDT">
          <el-input v-model="settings.min_withdraw_usdt" />
        </el-form-item>
        <el-form-item label="提现是否需要KYC">
          <el-switch v-model="settings.kyc_required_for_withdraw" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="saving">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'

const settings = ref({
  site_name: '',
  trading_fee_buy: '0.1',
  trading_fee_sell: '0.1',
  register_gift_usdt: '10000',
  invite_reward_usdt: '100',
  min_withdraw_usdt: '10',
  kyc_required_for_withdraw: 0
})

const saving = ref(false)

onMounted(() => {
  fetchSettings()
})

const fetchSettings = async () => {
  try {
    const res = await api.get('/admin/settings')
    if (res.data.code === 200) {
      settings.value = { ...settings.value, ...res.data.data }
    }
  } catch (err) {
    console.error('获取设置失败:', err)
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    const res = await api.post('/admin/settings', settings.value)
    if (res.data.code === 200) {
      ElMessage.success('保存成功')
    }
  } catch (err) {
    console.error('保存失败:', err)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.settings-page {
  max-width: 600px;
}

:deep(.el-input) {
  width: 300px;
}
</style>