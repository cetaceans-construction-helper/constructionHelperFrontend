<script setup lang="ts">
import logo from '../../assets/logo.png'
import { useRouter } from 'vue-router'

const emit = defineEmits(['open-contact'])
const router = useRouter()
</script>

<template>
  <section class="hero">
    <div class="hero-bg"></div>
    <button class="hero-login" @click="router.push('/login')">로그인</button>
    <div class="hero-content">
      <img :src="logo" alt="CONELP" class="hero-logo" />
      <h1 class="hero-title">현장관리자는<br />현장관리에만 집중합시다!</h1>
      <p class="hero-subtitle">건설현장 서류작성, CONELP가 대신합니다</p>
      <button class="hero-cta" @click="emit('open-contact')">문의하기</button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1F2F98 0%, #787FF6 50%, #1CA7EC 100%);
  z-index: 0;
}

.hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 70%, rgba(74, 222, 222, 0.15) 0%, transparent 60%),
              radial-gradient(circle at 70% 30%, rgba(123, 213, 245, 0.1) 0%, transparent 60%);
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 2rem;
  max-width: 800px;
}

.hero-login {
  position: absolute;
  top: 1.5rem;
  right: 2rem;
  z-index: 2;
  padding: 0.6rem 1.8rem;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 50px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  font-family: inherit;
}

.hero-login:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.7);
}

.hero-logo {
  display: block;
  margin: 0 auto 2rem;
  width: 220px;
  filter: brightness(0) invert(1);
}

.hero-title {
  font-size: 3rem;
  font-weight: 900;
  color: var(--white);
  line-height: 1.3;
  margin-bottom: 1.2rem;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 2.5rem;
  font-weight: 400;
}

.hero-cta {
  display: inline-block;
  padding: 1rem 3rem;
  background: var(--white);
  color: var(--deep-navy);
  font-size: 1.1rem;
  font-weight: 700;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .hero-logo {
    width: 160px;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1.05rem;
  }

  .hero-cta {
    padding: 0.85rem 2.5rem;
    font-size: 1rem;
  }
}
</style>
