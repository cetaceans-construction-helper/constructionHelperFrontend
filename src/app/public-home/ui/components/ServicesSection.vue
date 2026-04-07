<template>
  <section class="services">
    <div class="container">
      <h2 class="section-label">서비스 안내</h2>
      <p class="section-title">건설현장에 필요한 모든 서류,<br />CONELP가 작성합니다</p>

      <div class="service-grid">
        <div class="service-item" v-for="item in services" :key="item.title">
          <div class="service-icon">{{ item.icon }}</div>
          <h3 class="service-title">{{ item.title }}</h3>
          <p class="service-desc">{{ item.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const services = [
  { icon: '📝', title: '작업일보', desc: '일일 작업 내용을 정확하게 기록·정리' },
  { icon: '🔍', title: '품질서류', desc: '품질관리 기준에 맞는 서류 작성' },
  { icon: '💻', title: 'CSI 입력', desc: '건설정보시스템 데이터 입력 대행' },
  { icon: '📦', title: '자재서류', desc: '자재 반입·검수·승인 서류 작성' },
  { icon: '📐', title: '시공도면서류', desc: '시공 관련 도면 서류 정리·작성' },
  { icon: '🏗️', title: '감리제출서류', desc: '감리단 제출용 서류 작성·정리' },
  { icon: '📁', title: '기타 행정서류', desc: '현장에서 필요한 각종 행정 서류' },
]
</script>

<style scoped>
.services {
  padding: 6rem 1.5rem;
  background: linear-gradient(180deg, var(--light-gray) 0%, var(--white) 100%);
}

.container {
  max-width: 1000px;
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
  line-height: 1.4;
  margin-bottom: 3.5rem;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.service-item {
  padding: 2rem 1.5rem;
  background: var(--white);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: transform 0.2s, border-color 0.2s;
}

.service-item:hover {
  transform: translateY(-3px);
  border-color: var(--light-blue);
}

.service-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.service-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--deep-navy);
  margin-bottom: 0.5rem;
}

.service-desc {
  font-size: 0.85rem;
  color: var(--text-light);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .services {
    padding: 4rem 1.5rem;
  }

  .section-title {
    font-size: 1.6rem;
    margin-bottom: 2.5rem;
  }

  .service-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .service-item {
    padding: 1.5rem 1rem;
  }
}
</style>
