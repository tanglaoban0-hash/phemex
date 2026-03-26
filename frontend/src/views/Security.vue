<template>
  <div class="security-page">
    <div class="security-container">
      <h2>安全中心</h2>
      
      <!-- 折叠面板：个人资料和修改密码 -->
      <el-collapse v-model="activeCollapse" class="security-collapse">
        <!-- 个人资料 -->
        <el-collapse-item name="profile">
          <template #title>
            <div class="collapse-title">
              <el-icon><User /></el-icon>
              <span>个人资料</span>
            </div>
          </template>
          <el-form :model="userForm" label-width="100px" class="dark-form">
            <el-form-item label="用户名">
              <el-input v-model="userForm.username" disabled class="dark-input" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="userForm.email" disabled class="dark-input" />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="userForm.phone" placeholder="绑定手机号" class="dark-input" />
            </el-form-item>
            <el-form-item label="真实姓名">
              <el-input v-model="userForm.real_name" placeholder="实名认证" class="dark-input" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="updateProfile">保存修改</el-button>
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <!-- 修改密码 -->
        <el-collapse-item name="password">
          <template #title>
            <div class="collapse-title">
              <el-icon><Lock /></el-icon>
              <span>修改密码</span>
            </div>
          </template>
          <el-form :model="passwordForm" :rules="passwordRules" ref="passwordRef" label-width="100px" class="dark-form">
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password class="dark-input" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" show-password class="dark-input" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password class="dark-input" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="updatePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>
      
      <!-- 安全状态概览 -->
      <el-card class="status-card">
        <template #header>
          <span>安全设置</span>
        </template>
        <div class="security-level">
          <div class="level-score" :class="securityLevelClass">
            {{ securityScore }}
          </div>
          <div class="level-info">
            <h3>安全等级: {{ securityLevelText }}</h3>
            <p>建议您完成以下安全设置，保护账户安全</p>
          </div>
        </div>
        
        <div class="security-items">
          <div class="security-item" :class="{ completed: true }">
            <el-icon class="item-icon"><Lock /></el-icon>
            <div class="item-info">
              <span class="item-name">登录密码</span>
              <span class="item-status">已设置</span>
            </div>
          </div>
          
          <div class="security-item" :class="{ completed: hasFundPassword }">
            <el-icon class="item-icon"><Wallet /></el-icon>
            <div class="item-info">
              <span class="item-name">资金密码</span>
              <span class="item-status">{{ hasFundPassword ? '已设置' : '未设置' }}</span>
            </div>
            <el-button 
              v-if="!hasFundPassword" 
              type="primary" 
              size="small"
              @click="showSetFundPassword = true"
            >
              设置
            </el-button>
            <el-button 
              v-else 
              type="default" 
              size="small"
              @click="showChangeFundPassword = true"
            >
              修改
            </el-button>
          </div>
          
          <div class="security-item" :class="{ completed: hasPhone }">
            <el-icon class="item-icon"><Iphone /></el-icon>
            <div class="item-info">
              <span class="item-name">手机绑定</span>
              <span class="item-status">{{ hasPhone ? '已绑定' : '未绑定' }}</span>
            </div>
          </div>

          <div class="security-item" :class="{ completed: isKycVerified }">
            <el-icon class="item-icon"><User /></el-icon>
            <div class="item-info">
              <span class="item-name">实名认证</span>
              <span class="item-status">{{ getKycStatus(userStore.userInfo?.kyc_status) }}</span>
            </div>
            <el-button 
              v-if="!isKycVerified" 
              type="primary" 
              size="small"
              @click="goToKyc"
            >
              去认证
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 邀请好友卡片 -->
      <el-card class="invite-card">
        <template #header>
          <span>邀请好友</span>
        </template>
        <div class="invite-info">
          <p>您的邀请码：</p>
          <div class="invite-code">{{ userStore.userInfo?.invite_code || '---' }}</div>
          <p class="invite-tip">邀请好友注册，双方均可获得奖励！</p>
        </div>
      </el-card>

      <!-- 登录历史 -->
      <el-card class="history-card">
        <template #header>
          <span>最近登录</span>
        </template>
        <div class="login-info">
          <div class="info-row">
            <span class="label">上次登录时间:</span>
            <span class="value">{{ lastLoginAt || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">上次登录IP:</span>
            <span class="value">{{ lastLoginIp || '-' }}</span>
          </div>
        </div>
      </el-card>

      <!-- 设置资金密码对话框 -->
      <el-dialog v-model="showSetFundPassword" title="设置资金密码" width="400px">
        <el-form :model="setFundForm" label-position="top">
          <el-form-item label="资金密码">
            <el-input 
              v-model="setFundForm.fundPassword" 
              type="password" 
              placeholder="请设置6位以上资金密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="确认资金密码">
            <el-input 
              v-model="setFundForm.confirmPassword" 
              type="password" 
              placeholder="请再次输入资金密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="登录密码（验证身份）">
            <el-input 
              v-model="setFundForm.loginPassword" 
              type="password" 
              placeholder="请输入登录密码"
              show-password
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showSetFundPassword = false">取消</el-button>
          <el-button type="primary" @click="setFundPassword" :loading="submitting">确认</el-button>
        </template>
      </el-dialog>

      <!-- 修改资金密码对话框 -->
      <el-dialog v-model="showChangeFundPassword" title="修改资金密码" width="400px">
        <el-form :model="changeFundForm" label-position="top">
          <el-form-item label="原资金密码">
            <el-input 
              v-model="changeFundForm.oldPassword" 
              type="password" 
              placeholder="请输入原资金密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="新资金密码">
            <el-input 
              v-model="changeFundForm.newPassword" 
              type="password" 
              placeholder="请设置6位以上新密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="确认新资金密码">
            <el-input 
              v-model="changeFundForm.confirmPassword" 
              type="password" 
              placeholder="请再次输入新密码"
              show-password
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showChangeFundPassword = false">取消</el-button>
          <el-button type="primary" @click="changeFundPassword" :loading="submitting">确认</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { Lock, Wallet, Iphone, User } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 折叠面板当前展开的项（默认全部收起）
const activeCollapse = ref([])

// 用户资料
const userForm = ref({
  username: '',
  email: '',
  phone: '',
  real_name: ''
})

const passwordRef = ref(null)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 安全设置
const hasFundPassword = ref(false)
const lastLoginAt = ref('')
const lastLoginIp = ref('')
const submitting = ref(false)

const showSetFundPassword = ref(false)
const showChangeFundPassword = ref(false)

const setFundForm = ref({
  fundPassword: '',
  confirmPassword: '',
  loginPassword: ''
})

const changeFundForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const hasPhone = computed(() => {
  return !!userStore.userInfo?.phone
})

const isKycVerified = computed(() => {
  return userStore.userInfo?.kyc_status === 2
})

const securityScore = computed(() => {
  let score = 60 // 基础分（登录密码）
  if (hasFundPassword.value) score += 10
  if (hasPhone.value) score += 10
  if (isKycVerified.value) score += 10
  return score
})

const securityLevelText = computed(() => {
  if (securityScore.value >= 90) return '高'
  if (securityScore.value >= 70) return '中'
  return '低'
})

const securityLevelClass = computed(() => {
  if (securityScore.value >= 90) return 'high'
  if (securityScore.value >= 70) return 'medium'
  return 'low'
})

onMounted(() => {
  fetchSecurityStatus()
  if (userStore.userInfo) {
    userForm.value = { ...userStore.userInfo }
  }
})

// 更新资料
const updateProfile = async () => {
  try {
    const res = await api.put('/user/profile', {
      phone: userForm.value.phone,
      real_name: userForm.value.real_name
    })
    
    if (res.data.code === 200) {
      ElMessage.success('保存成功')
      userStore.fetchUserInfo()
    }
  } catch (err) {
    console.error('保存失败:', err)
  }
}

// 修改密码
const updatePassword = async () => {
  const valid = await passwordRef.value.validate().catch(() => false)
  if (!valid) return
  
  try {
    const res = await api.post('/user/password', {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })
    
    if (res.data.code === 200) {
      ElMessage.success('密码修改成功')
      passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    }
  } catch (err) {
    console.error('修改密码失败:', err)
  }
}

// 获取安全状态
const fetchSecurityStatus = async () => {
  try {
    const res = await api.get('/security/status')
    if (res.data.code === 200) {
      hasFundPassword.value = res.data.data.hasFundPassword
      lastLoginAt.value = res.data.data.lastLoginAt
      lastLoginIp.value = res.data.data.lastLoginIp
    }
  } catch (err) {
    console.error('获取安全状态失败:', err)
  }
}

// KYC状态
const getKycStatus = (status) => {
  const map = { 0: '未认证', 1: '待审核', 2: '已通过', 3: '已拒绝' }
  return map[status] || '未知'
}

// 去认证
const goToKyc = () => {
  router.push('/trade/kyc')
}

// 设置资金密码
const setFundPassword = async () => {
  if (setFundForm.value.fundPassword.length < 6) {
    ElMessage.warning('资金密码至少6位')
    return
  }
  if (setFundForm.value.fundPassword !== setFundForm.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  if (!setFundForm.value.loginPassword) {
    ElMessage.warning('请输入登录密码')
    return
  }
  
  submitting.value = true
  try {
    const res = await api.post('/security/set-fund-password', {
      fundPassword: setFundForm.value.fundPassword,
      loginPassword: setFundForm.value.loginPassword
    })
    if (res.data.code === 200) {
      ElMessage.success('资金密码设置成功')
      showSetFundPassword.value = false
      hasFundPassword.value = true
      setFundForm.value = { fundPassword: '', confirmPassword: '', loginPassword: '' }
    }
  } catch (err) {
    console.error('设置失败:', err)
  } finally {
    submitting.value = false
  }
}

// 修改资金密码
const changeFundPassword = async () => {
  if (changeFundForm.value.newPassword.length < 6) {
    ElMessage.warning('新资金密码至少6位')
    return
  }
  if (changeFundForm.value.newPassword !== changeFundForm.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  
  submitting.value = true
  try {
    const res = await api.post('/security/change-fund-password', {
      oldFundPassword: changeFundForm.value.oldPassword,
      newFundPassword: changeFundForm.value.newPassword
    })
    if (res.data.code === 200) {
      ElMessage.success('资金密码修改成功')
      showChangeFundPassword.value = false
      changeFundForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    }
  } catch (err) {
    console.error('修改失败:', err)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.security-page {
  padding: 24px;
  background: #0d1117;
  min-height: calc(100vh - 64px);
}

.security-container {
  max-width: 800px;
  margin: 0 auto;
}

.security-container h2 {
  color: #fff;
  margin-bottom: 24px;
}

/* 个人资料卡片 */
.profile-card,
.password-card {
  background: #161b22;
  border-color: #30363d;
  margin-bottom: 24px;
  color: #fff;
}

/* 安全状态卡片 */
.status-card,
.invite-card,
.history-card {
  background: #161b22;
  border-color: #30363d;
  margin-bottom: 24px;
}

.security-level {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #30363d;
  margin-bottom: 20px;
}

.level-score {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: #fff;
}

.level-score.high {
  background: linear-gradient(135deg, #00d4aa, #00a8e8);
}

.level-score.medium {
  background: linear-gradient(135deg, #f59e0b, #ff6b6b);
}

.level-score.low {
  background: linear-gradient(135deg, #ff6b6b, #ff4757);
}

.level-info h3 {
  color: #fff;
  margin: 0 0 8px 0;
}

.level-info p {
  color: #8b949e;
  margin: 0;
}

.security-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.security-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #0d1117;
  border-radius: 8px;
  border: 1px solid #30363d;
}

.security-item.completed {
  border-color: #00d4aa;
}

.item-icon {
  width: 40px;
  height: 40px;
  background: #21262d;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b949e;
  font-size: 20px;
  margin-right: 16px;
}

.security-item.completed .item-icon {
  background: #00d4aa22;
  color: #00d4aa;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-name {
  color: #fff;
  font-weight: 500;
}

.item-status {
  color: #8b949e;
  font-size: 12px;
  margin-top: 4px;
}

.security-item.completed .item-status {
  color: #00d4aa;
}

/* 邀请好友 */
.invite-info {
  text-align: center;
}

.invite-info p {
  color: #8b949e;
  margin-bottom: 12px;
}

.invite-code {
  font-size: 24px;
  font-weight: bold;
  color: #00d4aa;
  padding: 16px;
  background: #0d1117;
  border-radius: 8px;
  margin-bottom: 12px;
  font-family: monospace;
  letter-spacing: 2px;
}

.invite-tip {
  font-size: 12px;
}

/* 登录历史 */
.login-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
}

.info-row .label {
  color: #8b949e;
}

.info-row .value {
  color: #fff;
  font-family: monospace;
}

:deep(.el-card__header) {
  color: #fff;
  border-bottom: 1px solid #30363d;
}

:deep(.el-form-item__label) {
  color: #8b949e;
}

/* 所有输入框统一深色背景 */
:deep(.el-input__wrapper) {
  background: #21262d !important;
  box-shadow: none !important;
  border: 1px solid #30363d !important;
}

/* 所有输入框文字白色 */
:deep(.el-input__inner) {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}

/* 禁用输入框保持同样样式 */
:deep(.el-input.is-disabled .el-input__wrapper) {
  background: #21262d !important;
  border-color: #30363d !important;
  opacity: 0.8;
}

:deep(.el-input.is-disabled .el-input__inner) {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  background: transparent !important;
}

/* 输入框placeholder颜色 */
:deep(.el-input__inner::placeholder) {
  color: #8b949e !important;
}

/* 统一深色表单样式 */
.dark-form {
  .el-input__wrapper {
    background: #21262d !important;
    border: 1px solid #30363d !important;
    box-shadow: none !important;
  }
  
  .el-input__inner {
    color: #fff !important;
    -webkit-text-fill-color: #fff !important;
    background: transparent !important;
  }
}

/* 深色输入框样式 */
.dark-input .el-input__wrapper {
  background: #21262d !important;
  border: 1px solid #30363d !important;
}

.dark-input .el-input__inner {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}

/* 折叠面板样式 */
.security-collapse {
  margin-bottom: 24px;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-collapse-item__header) {
  background: #161b22 !important;
  border-bottom: 1px solid #30363d !important;
  color: #fff !important;
  font-size: 16px;
  font-weight: 600;
  padding: 16px 20px !important;
  height: auto !important;
  line-height: 1.5 !important;
}

:deep(.el-collapse-item__header.is-active) {
  border-bottom-color: #00d4aa !important;
}

:deep(.el-collapse-item__wrap) {
  background: #161b22 !important;
  border-bottom: none !important;
}

:deep(.el-collapse-item__content) {
  background: #161b22 !important;
  color: #fff !important;
  padding: 20px !important;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.collapse-title .el-icon {
  font-size: 20px;
  color: #00d4aa;
}

:deep(.el-collapse) {
  border: none !important;
}

:deep(.el-icon.el-collapse-item__arrow) {
  color: #8b949e !important;
}

:deep(.el-collapse-item__header:hover) {
  background: #1c2128 !important;
}

:deep(.el-dialog) {
  background: #161b22;
}

:deep(.el-dialog__title) {
  color: #fff;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .security-page {
    padding: 12px;
  }

  .security-container h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .profile-card,
  .password-card,
  .status-card,
  .invite-card,
  .history-card {
    margin-bottom: 16px;
  }

  .security-level {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .level-score {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }

  .security-item {
    padding: 12px;
  }

  .item-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .invite-code {
    font-size: 18px;
    padding: 12px;
  }

  :deep(.el-form-item__label) {
    font-size: 12px;
  }
}
</style>
