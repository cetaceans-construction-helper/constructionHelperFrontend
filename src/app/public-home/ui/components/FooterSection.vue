<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-info">
        <p class="footer-company">세타시언스 (Cetaceans)</p>
        <div class="footer-details">
          <span>대표: 김수연</span>
          <span class="divider">|</span>
          <span>사업자등록번호: 430-36-01631</span>
        </div>
        <div class="footer-details">
          <span>업태/종목: 정보통신업 / 소프트웨어 자문·개발 및 공급</span>
        </div>
        <div class="footer-details">
          <span>소재지: 서울특별시 양천구 목동동로 202, 상가동 2층 205호 (목동, 현대아파트)</span>
        </div>
        <div class="footer-details">
          <span>Tel: 010-9912-3292</span>
          <span class="divider">|</span>
          <span>Email: master@cetaceans.kr</span>
        </div>
      </div>
      <p class="footer-copyright">&copy; {{ year }} Cetaceans. All rights reserved.</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<style scoped>
.footer {
  padding: 3rem 1.5rem;
  background: var(--deep-navy);
  color: rgba(255, 255, 255, 0.7);
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
}

.footer-company {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--white);
  margin-bottom: 0.8rem;
}

.footer-details {
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  line-height: 1.8;
}

.divider {
  margin: 0 0.6rem;
  opacity: 0.4;
}

.footer-copyright {
  font-size: 0.8rem;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .footer-details {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .divider {
    display: none;
  }
}
</style>
