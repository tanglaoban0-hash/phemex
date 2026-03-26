<template>
  <div class="profile-page">
    <h2>个人中心</h2>
    
    <el-row :gutter="24">
      <el-col :span="16">
        <el-card class="profile-card">
          <template #header>
            <span>基本信息</span>
          </template>
          <el-form :model="userForm" label-width="100px">
            <el-form-item label="用户名">
              <el-input v-model="userForm.username" disabled />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="userForm.email" disabled />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="userForm.phone" placeholder="绑定手机号" />
            </el-form-item>
            <el-form-item label="真实姓名">
              <el-input v-model="userForm.real_name" placeholder="实名认证" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="updateProfile">保存修改</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <el-card class="password-card">
          <template #header>
            <span>修改密码</span>
          </template>
          <el-form :model="passwordForm" :rules="passwordRules" ref="passwordRef" label-width="100px">
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="updatePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      
      <el-col :span="8">
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
        
        <el-card class="security-card">
          <template #header>
            <span>安全设置</span>
          </template>
          <div class="security-list">
            <div class="security-item">
              <span>登录密码</span>
              <el-tag type="success">已设置</el-tag>
            </div>
            <div class="security-item">
              <span>手机绑定</span>
              <el-tag :type="userStore.userInfo?.phone ? 'success' : 'info'">
                {{ userStore.userInfo?.phone ? '已绑定' : '未绑定' }}
              </el-tag>
            </div>
            <div class="security-item">
              <span>实名认证</span>
              <el-tag :type="userStore.userInfo?.kyc_status === 2 ? 'success' : 'info'">
                {{ getKycStatus(userStore.userInfo?.kyc_status) }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const passwordRef = ref(null)

const userForm = ref({
  username: '',
  email: '',
  phone: '',
  real_name: ''
})

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

onMounted(() => {
  if (userStore.userInfo) {
    userForm.value = { ...userStore.userInfo }
  }
})

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

const getKycStatus = (status) => {
  const map = { 0: '未认证', 1: '待审核', 2: '已通过', 3: '已拒绝' }
  return map[status] || '未知'
}
</script>

<style scoped>
.profile-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: #fff;
}

.profile-card,
.password-card,
.invite-card,
.security-card {
  background: #161b22;
  border: 1px solid #30363d;
  margin-bottom: 24px;
  color: #fff;
}

.invite-info {
  text-align: center;
  
  p {
    color: #8b949e;
    margin-bottom: 12px;
  }
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

.security-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #0d1117;
  border-radius: 8px;
}

:deep(.el-input__wrapper) {
  background: #0d1117;
  box-shadow: none;
  border: 1px solid #30363d;
}

:deep(.el-input__inner) {
  color: #fff;
}

:deep(.el-card__header) {
  color: #fff;
  border-bottom: 1px solid #30363d;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .profile-page {
    padding: 12px;
  }

  .profile-page h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .el-row {
    display: flex;
    flex-direction: column;
  }

  .el-col {
    width: 100% !important;
    max-width: 100% !important;
    flex: 0 0 100% !important;
    padding: 0 !important;
  }

  .profile-card,
  .password-card,
  .invite-card,
  .security-card {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    font-size: 12px;
  }

  .invite-code {
    font-size: 18px;
    padding: 12px;
  }

  .security-item {
    padding: 10px;
  }
}
</style>