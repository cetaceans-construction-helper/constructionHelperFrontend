<script setup lang="ts">
import { ref, reactive } from 'vue'

defineProps<{
  show: boolean
}>()
const emit = defineEmits(['close'])

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzO4-4KgaoSufyPLoTte0I_QhzIlex3jq5K-A1tSEsUmLzjO93lOERnYa_Y50jcVLfF2A/exec'

const form = reactive({
  name: '',
  position: '',
  siteAddress: '',
  phone: '',
  email: ''
})

const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

const resetForm = () => {
  form.name = ''
  form.position = ''
  form.siteAddress = ''
  form.phone = ''
  form.email = ''
  submitted.value = false
  error.value = ''
}

const handleSubmit = async () => {
  error.value = ''
  submitting.value = true

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        position: form.position,
        siteAddress: form.siteAddress,
        phone: form.phone,
        email: form.email,
        timestamp: new Date().toISOString()
      })
    })
    submitted.value = true
  } catch (e) {
    error.value = '전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  resetForm()
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="handleClose">
        <div class="modal">
          <button class="modal-close" @click="handleClose">&times;</button>

          <template v-if="!submitted">
            <h2 class="modal-title">문의하기</h2>
            <p class="modal-desc">아래 정보를 입력해 주시면 빠르게 연락드리겠습니다.</p>

            <form @submit.prevent="handleSubmit" class="modal-form">
              <div class="form-group">
                <label for="name">이름</label>
                <input id="name" v-model="form.name" type="text" placeholder="홍길동" required />
              </div>
              <div class="form-group">
                <label for="position">직책</label>
                <input id="position" v-model="form.position" type="text" placeholder="현장소장" required />
              </div>
              <div class="form-group">
                <label for="siteAddress">현장주소</label>
                <input id="siteAddress" v-model="form.siteAddress" type="text" placeholder="서울시 강남구 ..." required />
              </div>
              <div class="form-group">
                <label for="phone">전화번호</label>
                <input id="phone" v-model="form.phone" type="tel" placeholder="010-0000-0000" required />
              </div>
              <div class="form-group">
                <label for="email">이메일</label>
                <input id="email" v-model="form.email" type="email" placeholder="example@email.com" required />
              </div>

              <p v-if="error" class="form-error">{{ error }}</p>

              <button type="submit" class="form-submit" :disabled="submitting">
                {{ submitting ? '전송 중...' : '문의 접수' }}
              </button>
            </form>
          </template>

          <template v-else>
            <div class="modal-success">
              <div class="success-icon">✓</div>
              <h2 class="modal-title">문의가 접수되었습니다</h2>
              <p class="modal-desc">빠른 시일 내에 연락드리겠습니다.<br />감사합니다.</p>
              <button class="form-submit" @click="handleClose">닫기</button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal {
  background: #ffffff;
  border-radius: 20px;
  padding: 2.5rem;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1.2rem;
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
}

.modal-close:hover {
  color: #1a1a2e;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: #1F2F98;
  margin-bottom: 0.5rem;
}

.modal-desc {
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 2rem;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 0.4rem;
}

.form-group input {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s;
  outline: none;
}

.form-group input:focus {
  border-color: #1CA7EC;
}

.form-group input::placeholder {
  color: #c0c5ce;
}

.form-error {
  color: #ef4444;
  font-size: 0.85rem;
}

.form-submit {
  width: 100%;
  padding: 0.9rem;
  background: linear-gradient(135deg, #1CA7EC, #787FF6);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s;
  font-family: inherit;
}

.form-submit:hover {
  opacity: 0.9;
}

.form-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-success {
  text-align: center;
  padding: 2rem 0;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4ADEDE, #1CA7EC);
  color: #ffffff;
  font-size: 2rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal {
  transform: scale(0.95) translateY(10px);
}

.modal-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 768px) {
  .modal {
    padding: 2rem 1.5rem;
    border-radius: 16px;
  }
}
</style>
