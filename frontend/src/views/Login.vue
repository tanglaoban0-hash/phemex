<template>
  <div class="login-page">
    <div class="login-box">
      <div class="logo-section">
        <img src="/phemex-full-logo.png" class="login-logo" alt="Phemex" />
      </div>
      <h2 class="title">{{ $t('login.title') }}</h2>
      
      <!-- 登录方式切换 -->
      <div class="login-tabs">
        <span 
          :class="['tab', { active: loginType === 'password' }]"
          @click="loginType = 'password'"
        >
          {{ $t('login.passwordLogin') }}
        </span>
        <span 
          :class="['tab', { active: loginType === 'code' }]"
          @click="loginType = 'code'"
        >
          {{ $t('login.codeLogin') }}
        </span>
      </div>
      
      <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
        <el-form-item prop="email">
          <el-input 
            v-model="form.email" 
            :placeholder="$t('login.email')"
            :prefix-icon="Message"
            size="large"
          />
        </el-form-item>
        
        <!-- 密码登录 -->
        <template v-if="loginType === 'password'">
          <el-form-item prop="password">
            <el-input 
              v-model="form.password" 
              type="password" 
              :placeholder="$t('login.password')"
              :prefix-icon="Lock"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
        </template>
        
        <!-- 验证码登录 -->
        <template v-else>
          <el-form-item prop="code">
            <div class="code-input">
              <el-input 
                v-model="form.code" 
                :placeholder="$t('login.code')"
                :prefix-icon="Key"
                size="large"
                maxlength="6"
                @keyup.enter="handleLogin"
              />
              <el-button 
                :disabled="codeCountdown > 0"
                @click="sendCode"
                class="send-code-btn"
              >
                {{ codeCountdown > 0 ? `${codeCountdown}s` : $t('login.sendCode') }}
              </el-button>
            </div>
          </el-form-item>
        </template>
        
        <el-button 
          type="primary" 
          size="large" 
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          {{ $t('login.loginBtn') }}
        </el-button>
        
        <div class="actions">
          <router-link to="/register">{{ $t('login.registerLink') }}</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { Message, Lock, Key } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import api from '@/utils/api'

const router = useRouter()
const userStore = useUserStore()
const { t, locale } = useI18n()
const formRef = ref(null)

// 格式化副标题，Phemex 使用渐变样式
const formattedSubtitle = computed(() => {
  const subtitle = t('login.subtitle')
  // 将 Phemex 包裹在 strong 标签中
  return subtitle.replace('Phemex', '<strong>Phemex</strong>')
})
const loading = ref(false)
const loginType = ref('password') // 'password' 或 'code'
const codeCountdown = ref(0)

const form = reactive({
  email: '',
  password: '',
  code: ''
})

const rules = computed(() => ({
  email: [
    { required: true, message: t('login.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('login.emailInvalid'), trigger: 'blur' }
  ],
  password: [
    { required: loginType.value === 'password', message: t('login.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('login.passwordMin'), trigger: 'blur' }
  ],
  code: [
    { required: loginType.value === 'code', message: t('login.codeRequired'), trigger: 'blur' },
    { len: 6, message: t('login.codeLen'), trigger: 'blur' }
  ]
}))

// 发送验证码
const sendCode = async () => {
  // 先验证邮箱
  const emailValid = await formRef.value.validateField('email').catch(() => false)
  if (!emailValid) return

  try {
    const res = await api.post('/auth/send-code', {
      email: form.email,
      type: 'login'
    })

    if (res.data.code === 200) {
      ElMessage.success(res.data.message)
      // 开发模式显示验证码
      if (res.data.data?.devCode) {
        console.log('验证码:', res.data.data.devCode)
      }
      // 开始倒计时
      codeCountdown.value = 60
      const timer = setInterval(() => {
        codeCountdown.value--
        if (codeCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    }
  } catch (err) {
    console.error('发送验证码失败:', err)
  }
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  loading.value = true
  try {
    let res
    
    if (loginType.value === 'password') {
      // 密码登录
      res = await userStore.login({
        email: form.email,
        password: form.password
      })
    } else {
      // 验证码登录
      const loginRes = await api.post('/auth/login-code', {
        email: form.email,
        code: form.code
      })
      
      if (loginRes.data.code === 200) {
        // 设置token和用户信息
        userStore.setToken(loginRes.data.data.token)
        userStore.userInfo = loginRes.data.data.user
        res = loginRes.data
      } else {
        throw new Error(loginRes.data.message)
      }
    }
    
    if (res.code === 200) {
      ElMessage.success(t('login.success'))
      router.push('/trade')
    }
  } catch (err) {
    console.error('登录失败:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
}

.login-box {
  width: 400px;
  padding: 48px;
  background: #161b22;
  border-radius: 16px;
  border: 1px solid #30363d;
}

.logo-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.login-logo {
  height: 48px;
  width: auto;
  object-fit: contain;
}

.title {
  font-size: 28px;
  color: #fff;
  text-align: center;
  margin-bottom: 24px;
  font-weight: 600;
}

.login-tabs {
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid #30363d;
}

.tab {
  flex: 1;
  padding: 12px;
  text-align: center;
  color: #8b949e;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.tab:hover {
  color: #fff;
}

.tab.active {
  color: #00d4aa;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #00d4aa;
}

.login-form {
  :deep(.el-input__wrapper) {
    background: #0d1117;
    box-shadow: none;
    border: 1px solid #30363d;
  }
  
  :deep(.el-input__inner) {
    color: #fff;
  }
}

.code-input {
  display: flex;
  gap: 12px;
}

.code-input .el-input {
  flex: 1;
}

.send-code-btn {
  width: 120px;
  background: transparent;
  border: 1px solid #00d4aa;
  color: #00d4aa;
}

.send-code-btn:hover {
  background: rgba(0, 212, 170, 0.1);
}

.send-code-btn:disabled {
  border-color: #30363d;
  color: #8b949e;
  cursor: not-allowed;
}

.login-btn {
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