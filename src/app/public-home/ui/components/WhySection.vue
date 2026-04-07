<template>
  <section class="why">
    <div class="container">
      <h2 class="section-label">왜 CONELP인가</h2>
      <p class="section-title">현장에 최적화된 서류작성 파트너</p>

      <div class="cards">
        <div class="card" v-for="item in items" :key="item.title">
          <div class="card-icon">{{ item.icon }}</div>
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-desc">{{ item.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const items = [
  {
    icon: '💰',
    title: '압도적 저렴함',
    desc: '현장관리자 서류작성 비용의 약 1/3. 월 198,000원으로 모든 서류를 해결합니다.'
  },
  {
    icon: '📋',
    title: '건설 서류 전문성',
    desc: '건설현장 서류에 특화된 전문 인력이 법규와 기준에 맞춰 정확하게 작성합니다.'
  },
  {
    icon: '✅',
    title: '검증된 정확성',
    desc: '작업일보, 품질서류, 자재서류 등 현장에서 요구하는 모든 서류를 빈틈없이 완성합니다.'
  }
]
</script>

<style scoped>
.why {
  padding: 6rem 1.5rem;
  background: var(--white);
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
  margin-bottom: 3.5rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.card {
  padding: 2.5rem 2rem;
  border-radius: 16px;
  background: var(--light-gray);
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(31, 47, 152, 0.1);
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: 1.2rem;
}

.card-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--deep-navy);
  margin-bottom: 0.8rem;
}

.card-desc {
  font-size: 0.95rem;
  color: var(--text-light);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .why {
    padding: 4rem 1.5rem;
  }

  .section-title {
    font-size: 1.6rem;
    margin-bottom: 2.5rem;
  }

  .cards {
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }

  .card {
    padding: 2rem 1.5rem;
  }
}
</style>
