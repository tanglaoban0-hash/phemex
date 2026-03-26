<template>
  <div class="chat-widget" v-if="isLoggedIn">
    <!-- 悬浮按钮 - 只在桌面端显示 -->
    <div 
      v-if="!props.modelValue"
      class="chat-button desktop-only" 
      :class="{ 'has-unread': unreadCount > 0 }"
      @click="toggleChat"
    >
      <el-icon :size="28"><Service /></el-icon>
      <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
    </div>
    
    <!-- 聊天窗口 -->
    <div v-if="showChat || props.modelValue" class="chat-window">
      <div class="chat-header">
        <div class="header-info">
          <el-icon><Service /></el-icon>
          <span>在线客服</span>
          <el-tag type="success" size="small">在线</el-tag>
        </div>
        <div class="header-actions" @click="toggleChat">
          <el-icon><Close /></el-icon>
        </div>
      </div>
      
      <div class="chat-body" ref="chatBody">
        <div class="message system">
          <div class="message-content">👋 您好！有什么可以帮助您的吗？</div>
        </div>
        
        <div 
          v-for="msg in messages" 
          :key="msg.id"
          class="message"
          :class="{ 'user': msg.sender_type === 1, 'admin': msg.sender_type === 2 }"
        >
          <div class="message-content">{{ msg.message }}</div>
        </div>
      </div>
      
      <div class="chat-footer">
        <div class="input-area">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="2"
            placeholder="请输入您的问题..."
            resize="none"
          />
          <el-button type="primary" @click="sendMessage" :loading="sending">
            <el-icon><Promotion /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { Service, Close, Promotion } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const userStore = useUserStore()

const isLoggedIn = computed(() => !!userStore.token)
const showChat = ref(false)
const messages = ref([])
const inputMessage = ref('')
const sending = ref(false)
const unreadCount = ref(0)
const sessionId = ref(null)

let interval = null

const toggleChat = () => {
  if (props.modelValue) {
    emit('update:modelValue', false)
  } else {
    showChat.value = !showChat.value
    if (showChat.value) {
      fetchMessages()
    }
  }
}

// 监听外部控制
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    fetchMessages()
  }
})

const fetchSession = async () => {
  if (!isLoggedIn.value) return
  try {
    const res = await api.get('/chat/session')
    if (res.data.code === 200) {
      sessionId.value = res.data.data.id
      fetchMessages()
    }
  } catch (err) {
    console.log('获取会话失败:', err)
  }
}

const fetchMessages = async () => {
  if (!sessionId.value) return
  try {
    const res = await api.get(`/chat/messages/${sessionId.value}`)
    if (res.data.code === 200) {
      messages.value = res.data.data
    }
  } catch (err) {
    console.log('获取消息失败:', err)
  }
}

const fetchUnread = async () => {
  if (!isLoggedIn.value) return
  try {
    const res = await api.get('/chat/unread')
    if (res.data.code === 200) {
      unreadCount.value = res.data.data.count
    }
  } catch (err) {
    console.log('获取未读失败:', err)
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return
  sending.value = true
  try {
    const res = await api.post('/chat/send', {
      sessionId: sessionId.value,
      message: inputMessage.value.trim()
    })
    if (res.data.code === 200) {
      messages.value.push(res.data.data)
      inputMessage.value = ''
    }
  } catch (err) {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  fetchSession()
  fetchUnread()
  interval = setInterval(() => {
    fetchUnread()
    if (showChat.value) fetchMessages()
  }, 5000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<style scoped>
.chat-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.chat-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00d4aa, #00a8e8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4);
  transition: all 0.3s;
}

.chat-button.desktop-only {
  display: flex;
}

.chat-button:hover {
  transform: scale(1.1);
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  background: #ff6b6b;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.chat-window {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 360px;
  height: 500px;
  background: #161b22;
  border-radius: 16px;
  border: 1px solid #30363d;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #0d1117;
  border-bottom: 1px solid #30363d;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
}

.header-actions {
  cursor: pointer;
  color: #8b949e;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  margin-bottom: 12px;
  max-width: 80%;
}

.message.system .message-content {
  background: #21262d;
  color: #8b949e;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 12px;
}

.message.user {
  margin-left: auto;
}

.message.user .message-content {
  background: #00d4aa;
  color: #000;
  padding: 10px 14px;
  border-radius: 12px;
  border-bottom-right-radius: 4px;
}

.message.admin .message-content {
  background: #409eff;
  color: #fff;
  padding: 10px 14px;
  border-radius: 12px;
  border-bottom-left-radius: 4px;
}

.chat-footer {
  padding: 12px;
  background: #0d1117;
  border-top: 1px solid #30363d;
}

.input-area {
  display: flex;
  gap: 8px;
}

.input-area :deep(.el-textarea__inner) {
  background: #161b22;
  border-color: #30363d;
  color: #fff;
}

@media screen and (max-width: 768px) {
  .chat-widget {
    bottom: 80px;
    right: 12px;
  }
  
  .chat-button {
    width: 50px;
    height: 50px;
  }
  
  .chat-window {
    width: calc(100vw - 24px);
    right: -12px;
  }
}
</style>
