<script setup lang="ts">
const emit = defineEmits(['open-contact'])
</script>

<template>
  <section class="cta">
    <div class="container">
      <h2 class="cta-title">지금 바로 문의하세요</h2>
      <p class="cta-desc">건설현장 서류 고민, CONELP가 해결해 드립니다</p>
      <button class="cta-btn" @click="emit('open-contact')">무료 상담 신청</button>
    </div>
  </section>
</template>

<style scoped>
.cta {
  padding: 5rem 1.5rem;
  background: linear-gradient(135deg, #1F2F98 0%, #787FF6 50%, #1CA7EC 100%);
  text-align: center;
}

.container {
  max-width: 700px;
  margin: 0 auto;
}

.cta-title {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--white);
  margin-bottom: 1rem;
}

.cta-desc {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2.5rem;
}

.cta-btn {
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

.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .cta {
    padding: 4rem 1.5rem;
  }

  .cta-title {
    font-size: 1.6rem;
  }

  .cta-desc {
    font-size: 1rem;
  }
}
</style>
