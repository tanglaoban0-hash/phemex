<template>
  <div class="chat-manage">
    <h2>客服中心</h2>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value">{{ stats.total || 0 }}</div>
            <div class="stat-label">总会话</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value text-success">{{ stats.active || 0 }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value text-warning">{{ stats.waiting || 0 }}</div>
            <div class="stat-label">等待回复</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-value text-danger">{{ stats.unread || 0 }}</div>
            <div class="stat-label">未读消息</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chat-layout">
      <!-- 会话列表 -->
      <el-col :span="8">
        <el-card class="session-list">
          <template #header>
            <div class="list-header">
              <span>会话列表</span>
              <el-radio-group v-model="filterStatus" size="small" @change="fetchSessions">
                <el-radio-button label="">全部</el-radio-button>
                <el-radio-button label="1">进行中</el-radio-button>
                <el-radio-button label="2">等待</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          
          <div class="sessions">
            <div 
              v-for="session in sessions" 
              :key="session.id"
              class="session-item"
              :class="{ active: currentSession?.id === session.id, waiting: session.status === 2 }"
              @click="selectSession(session)"
            >
              <div class="session-info">
                <div class="user-name">
                  {{ session.username || '匿名用户' }}
                  <el-badge v-if="session.unread_count > 0" :value="session.unread_count" />
                </div>
                <div class="last-message">{{ session.last_message || '暂无消息' }}</div>
                <div class="session-time">{{ formatTime(session.last_time) }}</div>
              </div>
              <el-tag v-if="session.status === 2" type="warning" size="small">等待</el-tag>
            </div>
            <el-empty v-if="sessions.length === 0" description="暂无会话" />
          </div>
        </el-card>
      </el-col>

      <!-- 聊天窗口 -->
      <el-col :span="16">
        <el-card v-if="currentSession" class="chat-window">
          <template #header>
            <div class="chat-header">
              <div class="user-info">
                <span class="name">{{ currentSession.username }}</span>
                <span class="email">{{ currentSession.email }}</span>
              </div>
              <div class="header-actions">
                <el-button type="danger" size="small" @click="closeSession">关闭会话</el-button>
              </div>
            </div>
          </template>
          
          <div class="messages" ref="messageContainer">
            <div 
              v-for="msg in messages" 
              :key="msg.id"
              class="message"
              :class="{ 'user': msg.sender_type === 1, 'admin': msg.sender_type === 2 }"
            >
              <div class="message-header">
                <span class="sender">{{ msg.sender_name }}</span>
                <span class="time">{{ formatTime(msg.created_at) }}</span>
              </div>
              <div class="message-content">{{ msg.message }}</div>
            </div>
            <el-empty v-if="messages.length === 0" description="暂无消息" />
          </div>
          
          <div class="input-area">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="请输入回复内容..."
              @keydown.enter.prevent="sendMessage"
            />
            <el-button 
              type="primary" 
              :disabled="!inputMessage.trim()"
              :loading="sending"
              @click="sendMessage"
            >
              发送
            </el-button>
          </div>
        </el-card>
        
        <el-card v-else class="chat-window empty">
          <el-empty description="请选择左侧会话开始聊天" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const stats = ref({})
const sessions = ref([])
const currentSession = ref(null)
const messages = ref([])
const inputMessage = ref('')
const sending = ref(false)
const filterStatus = ref('')
const messageContainer = ref(null)

let interval = null

const fetchStats = async () => {
  try {
    const res = await api.get('/admin/chat/statistics')
    if (res.data.code === 200) {
      stats.value = res.data.data
    }
  } catch (err) {
    console.error('获取统计失败:', err)
  }
}

const fetchSessions = async () => {
  try {
    let url = '/admin/chat/sessions'
    if (filterStatus.value) url += `?status=${filterStatus.value}`
    
    const res = await api.get(url)
    if (res.data.code === 200) {
      sessions.value = res.data.data
    }
  } catch (err) {
    console.error('获取会话失败:', err)
  }
}

const selectSession = async (session) => {
  currentSession.value = session
  await fetchMessages()
}

const fetchMessages = async () => {
  if (!currentSession.value) return
  
  try {
    const res = await api.get(`/admin/chat/messages/${currentSession.value.id}`)
    if (res.data.code === 200) {
      messages.value = res.data.data
      nextTick(() => {
        scrollToBottom()
      })
    }
  } catch (err) {
    console.error('获取消息失败:', err)
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || !currentSession.value) return
  
  sending.value = true
  try {
    const res = await api.post('/admin/chat/send', {
      sessionId: currentSession.value.id,
      message: inputMessage.value.trim()
    })
    
    if (res.data.code === 200) {
      messages.value.push(res.data.data)
      inputMessage.value = ''
      nextTick(() => {
        scrollToBottom()
      })
    }
  } catch (err) {
    console.error('发送失败:', err)
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

const closeSession = async () => {
  try {
    await ElMessageBox.confirm('确认关闭该会话?', '提示', { type: 'warning' })
    await api.post(`/admin/chat/close/${currentSession.value.id}`)
    ElMessage.success('会话已关闭')
    currentSession.value = null
    fetchSessions()
    fetchStats()
  } catch (err) {
    if (err !== 'cancel') console.error('关闭失败:', err)
  }
}

const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

const formatTime = (time) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchStats()
  fetchSessions()
  interval = setInterval(() => {
    fetchSessions()
    fetchStats()
    if (currentSession.value) fetchMessages()
  }, 5000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<style scoped>
.chat-manage {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-value.text-success {
  color: #67c23a;
}

.stat-value.text-warning {
  color: #e6a23c;
}

.stat-value.text-danger {
  color: #f56c6c;
}

.stat-label {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

.chat-layout {
  height: calc(100vh - 250px);
}

.session-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sessions {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 8px;
}

.session-item:hover {
  background: #f5f7fa;
}

.session-item.active {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
}

.session-item.waiting {
  background: #fdf6ec;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.last-message {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  color: #c0c4cc;
  font-size: 11px;
  margin-top: 4px;
}

.chat-window {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-window.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-info .name {
  font-weight: 500;
  font-size: 16px;
}

.user-info .email {
  color: #909399;
  font-size: 12px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
  min-height: 300px;
}

.message {
  margin-bottom: 16px;
  max-width: 80%;
}

.message.user {
  margin-left: auto;
}

.message.admin {
  margin-right: auto;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}

.message.user .message-header {
  justify-content: flex-end;
}

.message-header .sender {
  font-weight: 500;
  color: #303133;
}

.message-header .time {
  color: #909399;
}

.message-content {
  padding: 10px 14px;
  border-radius: 8px;
  background: #f4f4f5;
  color: #303133;
  word-break: break-word;
}

.message.user .message-content {
  background: #409eff;
  color: #fff;
}

.input-area {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.input-area .el-textarea {
  flex: 1;
}
</style>
