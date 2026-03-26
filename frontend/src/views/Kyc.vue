<template>
  <div class="kyc-page">
    <div class="kyc-container">
      <h2>实名认证</h2>
      
      <!-- 认证状态卡片 -->
      <el-card class="status-card">
        <div class="status-header">
          <div class="status-icon" :class="'status-' + kycStatus.status">
            <el-icon v-if="kycStatus.status === 2"><Check /></el-icon>
            <el-icon v-else-if="kycStatus.status === 1"><Clock /></el-icon>
            <el-icon v-else-if="kycStatus.status === 3"><Close /></el-icon>
            <el-icon v-else><User /></el-icon>
          </div>
          <div class="status-info">
            <h3>{{ kycStatus.statusName }}</h3>
            <p v-if="kycStatus.level > 0">当前级别: {{ kycStatus.levelName }}</p>
            <p v-if="kycStatus.status === 3" class="reject-reason">拒绝原因: {{ kycInfo.reject_reason }}</p>
          </div>
        </div>
        
        <div class="limit-info" v-if="kycStatus.status === 2">
          <div class="limit-item">
            <span>每日提现限额</span>
            <span class="limit-value">{{ dailyLimit }} USDT</span>
          </div>
          <div class="limit-item">
            <span>今日已用额度</span>
            <span class="limit-value">{{ usedLimit }} USDT</span>
          </div>
          <div class="limit-item">
            <span>剩余额度</span>
            <span class="limit-value remaining">{{ remainingLimit }} USDT</span>
          </div>
        </div>
      </el-card>

      <!-- 认证等级选择 -->
      <div class="level-selection" v-if="kycStatus.status !== 1">
        <div 
          class="level-card" 
          :class="{ active: selectedLevel === 1, completed: kycInfo.level >= 1 }"
          @click="selectLevel(1)"
        >
          <div class="level-badge">L1</div>
          <h4>基础认证</h4>
          <ul class="level-features">
            <li>每日提现限额 {{ limits.l1 }} USDT</li>
            <li>需填写姓名和身份证号</li>
            <li>审核时间: 1-2小时</li>
          </ul>
          <el-button 
            v-if="kycInfo.level < 1 && kycStatus.status !== 3" 
            type="primary" 
            size="small"
          >
            去认证
          </el-button>
          <el-tag v-else-if="kycInfo.level >= 1" type="success">已完成</el-tag>
        </div>

        <div 
          class="level-card" 
          :class="{ 
            active: selectedLevel === 2, 
            completed: kycInfo.level >= 2,
            disabled: kycInfo.level < 1 
          }"
          @click="kycInfo.level >= 1 && selectLevel(2)"
        >
          <div class="level-badge">L2</div>
          <h4>高级认证</h4>
          <ul class="level-features">
            <li>每日提现限额 {{ limits.l2 }} USDT</li>
            <li>需上传身份证正反面</li>
            <li>需上传手持身份证照片</li>
            <li>审核时间: 4-8小时</li>
          </ul>
          <el-button 
            v-if="kycInfo.level === 1 && kycStatus.status !== 3" 
            type="primary" 
            size="small"
          >
            去认证
          </el-button>
          <el-tag v-else-if="kycInfo.level >= 2" type="success">已完成</el-tag>
          <el-tag v-else-if="kycInfo.level < 1" type="info">需先完成L1</el-tag>
        </div>
      </div>

      <!-- L1 认证表单 -->
      <el-card v-if="selectedLevel === 1 && kycInfo.level < 1" class="kyc-form">
        <template #header>
          <span>L1 基础认证</span>
        </template>
        
        <el-form :model="l1Form" label-position="top">
          <el-form-item label="证件类型">
            <el-radio-group v-model="l1Form.idType">
              <el-radio label="id_card">身份证</el-radio>
              <el-radio label="passport">护照</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="真实姓名">
            <el-input v-model="l1Form.realName" placeholder="请输入真实姓名" />
          </el-form-item>
          
          <el-form-item :label="l1Form.idType === 'id_card' ? '身份证号' : '护照号'">
            <el-input v-model="l1Form.idCard" :placeholder="l1Form.idType === 'id_card' ? '请输入身份证号' : '请输入护照号'" />
          </el-form-item>
          
          <el-form-item label="国家/地区">
            <el-select v-model="l1Form.country" style="width: 100%">
              <el-option label="中国" value="CN" />
              <el-option label="中国香港" value="HK" />
              <el-option label="美国" value="US" />
              <el-option label="新加坡" value="SG" />
              <el-option label="其他" value="OTHER" />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-checkbox v-model="l1Form.agreement">
              我确认以上信息真实有效，并同意<a href="#" @click.prevent>《实名认证协议》</a>
            </el-checkbox>
          </el-form-item>
          
          <el-button 
            type="primary" 
            size="large" 
            style="width: 100%"
            :loading="submitting"
            :disabled="!l1Form.agreement"
            @click="submitL1"
          >
            提交认证
          </el-button>
        </el-form>
      </el-card>

      <!-- L2 认证表单 -->
      <el-card v-if="selectedLevel === 2" class="kyc-form">
        <template #header>
          <span>L2 高级认证</span>
        </template>
        
        <el-form :model="l2Form" label-position="top">
          <el-form-item label="身份证正面">
            <el-upload
              class="upload-proof"
              action="/api/upload"
              :headers="uploadHeaders"
              :file-list="frontFileList"
              :on-success="handleFrontUpload"
              :on-error="() => ElMessage.error('上传失败')"
              list-type="picture-card"
              :limit="1"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <p class="upload-tip">请上传清晰的身份证正面照片，支持 jpg/png 格式</p>
          </el-form-item>
          
          <el-form-item label="身份证背面">
            <el-upload
              class="upload-proof"
              action="/api/upload"
              :headers="uploadHeaders"
              :file-list="backFileList"
              :on-success="handleBackUpload"
              :on-error="() => ElMessage.error('上传失败')"
              list-type="picture-card"
              :limit="1"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>
          
          <el-form-item label="手持身份证">
            <el-upload
              class="upload-proof"
              action="/api/upload"
              :headers="uploadHeaders"
              :file-list="handFileList"
              :on-success="handleHandUpload"
              :on-error="() => ElMessage.error('上传失败')"
              list-type="picture-card"
              :limit="1"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <p class="upload-tip">请上传手持身份证照片，确保人脸和证件清晰可见</p>
          </el-form-item>
          
          <el-button 
            type="primary" 
            size="large" 
            style="width: 100%"
            :loading="submitting"
            :disabled="!l2Form.idCardFront"
            @click="submitL2"
          >
            提交认证
          </el-button>
        </el-form>
      </el-card>

      <!-- 审核中提示 -->
      <el-card v-if="kycStatus.status === 1" class="pending-card">
        <el-result
          icon="info"
          title="认证审核中"
          sub-title="您的认证申请正在审核中，请耐心等待，一般需要1-2小时"
        >
          <template #extra>
            <el-button @click="fetchKycStatus">刷新状态</el-button>
          </template>
        </el-result>
      </el-card>


    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import { Check, Clock, Close, User, Plus } from '@element-plus/icons-vue'
import Cookies from 'js-cookie'

const kycStatus = ref({
  status: 0,
  statusName: '未认证',
  level: 0,
  levelName: '未认证'
})

const kycInfo = ref({})
const limits = ref({ l1: 10000, l2: 100000 })
const dailyLimit = ref(0)
const usedLimit = ref(0)
const remainingLimit = ref(0)

const selectedLevel = ref(1)
const submitting = ref(false)

const l1Form = ref({
  idType: 'id_card',
  realName: '',
  idCard: '',
  country: 'CN',
  agreement: false
})

const l2Form = ref({
  idCardFront: '',
  idCardBack: '',
  idCardHand: ''
})

// 上传文件列表
const frontFileList = ref([])
const backFileList = ref([])
const handFileList = ref([])

// 上传请求头
const uploadHeaders = computed(() => {
  const token = Cookies.get('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const selectLevel = (level) => {
  selectedLevel.value = level
}

const fetchKycStatus = async () => {
  try {
    const res = await api.get('/kyc/status')
    if (res.data.code === 200) {
      kycStatus.value = res.data.data.kyc
      kycInfo.value = res.data.data.kyc || {}
      limits.value = res.data.data.limits

      // 如果有图片数据，填充到表单
      const kyc = res.data.data.kyc
      if (kyc) {
        if (kyc.id_card_front) {
          l2Form.value.idCardFront = kyc.id_card_front
          frontFileList.value = [{ name: '身份证正面', url: kyc.id_card_front }]
        }
        if (kyc.id_card_back) {
          l2Form.value.idCardBack = kyc.id_card_back
          backFileList.value = [{ name: '身份证背面', url: kyc.id_card_back }]
        }
        if (kyc.id_card_hand) {
          l2Form.value.idCardHand = kyc.id_card_hand
          handFileList.value = [{ name: '手持身份证', url: kyc.id_card_hand }]
        }
      }

      // 如果已认证，获取额度信息
      if (kycStatus.value.status === 2) {
        fetchWithdrawLimit()
      }
    }
  } catch (err) {
    console.error('获取KYC状态失败:', err)
  }
}

const fetchWithdrawLimit = async () => {
  try {
    const res = await api.get('/kyc/withdraw-limit')
    if (res.data.code === 200) {
      dailyLimit.value = res.data.data.dailyLimit
      usedLimit.value = res.data.data.used
      remainingLimit.value = res.data.data.remaining
    }
  } catch (err) {
    console.error('获取额度失败:', err)
  }
}

const submitL1 = async () => {
  if (!l1Form.value.realName || !l1Form.value.idCard) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  submitting.value = true
  try {
    const res = await api.post('/kyc/l1', {
      realName: l1Form.value.realName,
      idCard: l1Form.value.idCard,
      idType: l1Form.value.idType,
      country: l1Form.value.country
    })
    
    if (res.data.code === 200) {
      ElMessage.success('L1认证申请已提交')
      fetchKycStatus()
    }
  } catch (err) {
    console.error('提交L1失败:', err)
  } finally {
    submitting.value = false
  }
}

const submitL2 = async () => {
  if (!l2Form.value.idCardFront) {
    ElMessage.warning('请上传身份证正面照片')
    return
  }
  
  submitting.value = true
  try {
    const res = await api.post('/kyc/l2', {
      idCardFront: l2Form.value.idCardFront,
      idCardBack: l2Form.value.idCardBack,
      idCardHand: l2Form.value.idCardHand
    })
    
    if (res.data.code === 200) {
      ElMessage.success('L2认证申请已提交')
      fetchKycStatus()
    }
  } catch (err) {
    console.error('提交L2失败:', err)
  } finally {
    submitting.value = false
  }
}

const handleFrontUpload = (response, file) => {
  if (response.code === 200) {
    l2Form.value.idCardFront = response.data.url
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleBackUpload = (response, file) => {
  if (response.code === 200) {
    l2Form.value.idCardBack = response.data.url
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleHandUpload = (response, file) => {
  if (response.code === 200) {
    l2Form.value.idCardHand = response.data.url
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

onMounted(() => {
  fetchKycStatus()
})
</script>

<style scoped>
.kyc-page {
  padding: 20px;
  background: #0d1117;
  min-height: calc(100vh - 64px);
}

.kyc-container {
  max-width: 800px;
  margin: 0 auto;
}

.kyc-container h2 {
  color: #fff;
  margin-bottom: 20px;
}

.status-card {
  margin-bottom: 20px;
  background: #161b22;
  border-color: #30363d;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.status-icon.status-0 {
  background: #30363d;
  color: #8b949e;
}

.status-icon.status-1 {
  background: #f59e0b22;
  color: #f59e0b;
}

.status-icon.status-2 {
  background: #00d4aa22;
  color: #00d4aa;
}

.status-icon.status-3 {
  background: #ff6b6b22;
  color: #ff6b6b;
}

.status-info h3 {
  color: #fff;
  margin: 0 0 8px 0;
}

.status-info p {
  color: #8b949e;
  margin: 0;
}

.reject-reason {
  color: #ff6b6b !important;
}

.limit-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #30363d;
  display: flex;
  gap: 40px;
}

.limit-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.limit-item span:first-child {
  color: #8b949e;
  font-size: 12px;
}

.limit-value {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.limit-value.remaining {
  color: #00d4aa;
}

.level-selection {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.level-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.level-card:hover:not(.disabled) {
  border-color: #00d4aa;
}

.level-card.active {
  border-color: #00d4aa;
  background: #00d4aa11;
}

.level-card.completed {
  border-color: #00d4aa;
}

.level-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.level-badge {
  position: absolute;
  top: -12px;
  left: 24px;
  background: #00d4aa;
  color: #000;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
}

.level-card h4 {
  color: #fff;
  margin: 20px 0 12px 0;
}

.level-features {
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
}

.level-features li {
  color: #8b949e;
  font-size: 13px;
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
}

.level-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #00d4aa;
}

.kyc-form {
  background: #161b22;
  border-color: #30363d;
}

.pending-card {
  background: #161b22;
  border-color: #30363d;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .kyc-page {
    padding: 12px;
  }
  
  .kyc-container h2 {
    font-size: 18px;
  }
  
  .status-header {
    flex-direction: column;
    text-align: center;
  }
  
  .limit-info {
    flex-direction: column;
    gap: 12px;
  }
  
  .level-selection {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .level-card {
    padding: 16px;
  }
}

:deep(.el-form-item__label) {
  color: #8b949e;
}

:deep(.el-input__wrapper) {
  background: #0d1117;
  box-shadow: none;
  border: 1px solid #30363d;
}

:deep(.el-input__inner) {
  color: #fff;
}

:deep(.el-upload-dragger) {
  background: #0d1117;
  border-color: #30363d;
}

:deep(.el-upload-dragger:hover) {
  border-color: #00d4aa;
}

/* 图片上传样式 */
.upload-tip {
  color: #8b949e;
  font-size: 12px;
  margin-top: 8px;
}

:deep(.upload-proof .el-upload--picture-card) {
  background: #0d1117;
  border-color: #30363d;
  color: #8b949e;
  width: 120px;
  height: 120px;
}

:deep(.upload-proof .el-upload--picture-card:hover) {
  border-color: #00d4aa;
  color: #00d4aa;
}

:deep(.upload-proof .el-upload-list__item) {
  background: #0d1117;
  border-color: #30363d;
  width: 120px;
  height: 120px;
}
</style>
