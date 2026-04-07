<template>
  <section class="process">
    <div class="container">
      <h2 class="section-label">이용 방법</h2>
      <p class="section-title">간단한 3단계로 시작하세요</p>

      <div class="steps">
        <div class="step" v-for="(step, index) in steps" :key="step.title">
          <div class="step-number">{{ index + 1 }}</div>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.desc }}</p>
        </div>
        <div class="step-line"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const steps = [
  { title: '문의 및 상담', desc: '전화 또는 이메일로 편하게 문의해 주세요' },
  { title: '서류 요건 확인', desc: '필요한 서류 종류와 현장 정보를 확인합니다' },
  { title: '전문가 작성 · 납품', desc: '전문 인력이 서류를 작성하여 전달드립니다' },
]
</script>

<style scoped>
.process {
  padding: 6rem 1.5rem;
  background: var(--white);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

.section-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--blue);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.8rem;
}

.section-title {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--text-dark);
  margin-bottom: 4rem;
}

.steps {
  display: flex;
  justify-content: space-between;
  position: relative;
  gap: 2rem;
}

.step-line {
  position: absolute;
  top: 32px;
  left: 15%;
  right: 15%;
  height: 2px;
  background: linear-gradient(90deg, var(--light-blue), var(--blue), var(--purple-blue));
  z-index: 0;
}

.step {
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-number {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--blue), var(--purple-blue));
  color: var(--white);
  font-size: 1.5rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  box-shadow: 0 4px 20px rgba(28, 167, 236, 0.3);
}

.step-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--deep-navy);
  margin-bottom: 0.6rem;
}

.step-desc {
  font-size: 0.9rem;
  color: var(--text-light);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .process {
    padding: 4rem 1.5rem;
  }

  .section-title {
    font-size: 1.6rem;
    margin-bottom: 3rem;
  }

  .steps {
    flex-direction: column;
    gap: 2.5rem;
  }

  .step-line {
    top: 0;
    bottom: 0;
    left: 32px;
    right: auto;
    width: 2px;
    height: auto;
    background: linear-gradient(180deg, var(--light-blue), var(--blue), var(--purple-blue));
  }

  .step {
    display: flex;
    align-items: center;
    text-align: left;
    gap: 1.5rem;
  }

  .step-number {
    width: 48px;
    height: 48px;
    min-width: 48px;
    font-size: 1.2rem;
    margin: 0;
  }

  .step-title {
    margin-bottom: 0.3rem;
  }
}
</style>
