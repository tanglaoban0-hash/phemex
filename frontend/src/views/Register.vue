<template>
  <div class="register-page">
    <div class="register-box">
      <h2 class="title">创建账号</h2>
      <p class="subtitle">开始您的交易之旅</p>
      
      <el-form :model="form" :rules="rules" ref="formRef" class="register-form">
        <el-form-item prop="username">
          <el-input 
            v-model="form.username" 
            placeholder="用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>
        
        <el-form-item prop="email">
          <el-input 
            v-model="form.email" 
            placeholder="邮箱地址"
            :prefix-icon="Message"
            size="large"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="设置密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="inviteCode">
          <el-input 
            v-model="form.inviteCode" 
            placeholder="邀请码（选填）"
            :prefix-icon="Ticket"
            size="large"
          />
        </el-form-item>
        
        <el-button 
          type="primary" 
          size="large" 
          class="register-btn"
          :loading="loading"
          @click="handleRegister"
        >
          注册
        </el-button>
        
        <div class="actions">
          <router-link to="/login">已有账号？立即登录</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { User, Message, Lock, Ticket } from '@element-plus/icons-vue'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  email: '',
  password: '',
  inviteCode: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  loading.value = true
  try {
    const res = await api.post('/auth/register', form)
    if (res.data.code === 200) {
      ElMessage.success('注册成功，请登录')
      router.push('/login')
    }
  } catch (err) {
    console.error('注册失败:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
}

.register-box {
  width: 400px;
  padding: 48px;
  background: #161b22;
  border-radius: 16px;
  border: 1px solid #30363d;
}

.title {
  font-size: 28px;
  color: #fff;
  text-align: center;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #8b949e;
  text-align: center;
  margin-bottom: 32px;
}

.register-form {
  :deep(.el-input__wrapper) {
    background: #0d1117;
    box-shadow: none;
    border: 1px solid #30363d;
  }
  
  :deep(.el-input__inner) {
    color: #fff;
  }
}

.register-btn {
  width: 100%;
  margin-top: 16px;
  background: linear-gradient(90deg, #00d4aa, #00a8e8);
  border: none;
}

.actions {
  margin-top: 24px;
  text-align: center;
  
  a {
    color: #00d4aa;
    text-decoration: none;
    font-size: 14px;
    
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>