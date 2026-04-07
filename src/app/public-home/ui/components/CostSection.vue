<template>
  <section class="cost">
    <div class="container">
      <h2 class="section-label">비용 절감</h2>
      <p class="section-title">서류작성에 낭비되는 비용,<br />얼마인지 아시나요?</p>

      <div class="cost-comparison">
        <div class="cost-card cost-before">
          <div class="cost-card-label">현재 서류작성 비용</div>
          <div class="cost-breakdown">
            <div class="cost-item">
              <span class="cost-desc">현장관리자 연 인건비</span>
              <span class="cost-value">4,500만원</span>
            </div>
            <div class="cost-item">
              <span class="cost-desc">일 8시간 중 서류작성</span>
              <span class="cost-value highlight-red">평균 1.5시간</span>
            </div>
            <div class="cost-divider"></div>
            <div class="cost-item total">
              <span class="cost-desc">연간 서류작성 비용</span>
              <span class="cost-value big">약 850만원</span>
            </div>
          </div>
        </div>

        <div class="cost-arrow">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M8 24h32M32 16l8 8-8 8" stroke="#1CA7EC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="cost-card cost-after">
          <div class="cost-card-label">CONELP 이용 시</div>
          <div class="cost-highlight">
            <div class="cost-badge">약 1/3 가격</div>
            <div class="cost-price">월 <span class="price-number">198,000</span>원</div>
            <div class="cost-annual">연간 약 240만원으로 해결</div>
          </div>
        </div>
      </div>

      <p class="cost-saving">
        서류는 서류전문가에게, 현장관리자는 현장에 집중!
      </p>
      <p class="cost-message">
        무의미한 서류업무에 지치지 않도록 CONELP가 도와드립니다
      </p>
    </div>
  </section>
</template>

<style scoped>
.cost {
  padding: 6rem 1.5rem;
  background: var(--light-gray);
}

.container {
  max-width: 960px;
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
  margin-bottom: 3rem;
}

.cost-comparison {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.cost-card {
  flex: 1;
  max-width: 380px;
  padding: 2rem;
  border-radius: 16px;
  text-align: left;
}

.cost-before {
  background: var(--white);
  border: 2px solid #e5e7eb;
}

.cost-after {
  background: linear-gradient(135deg, #1F2F98, #787FF6);
  color: var(--white);
}

.cost-card-label {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.cost-desc {
  font-size: 0.95rem;
  color: var(--text-light);
}

.cost-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-dark);
}

.highlight-red {
  color: #ef4444;
}

.cost-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0.8rem 0;
}

.cost-item.total .cost-desc {
  font-weight: 700;
  color: var(--text-dark);
}

.cost-item.total .cost-value.big {
  font-size: 1.6rem;
  color: #ef4444;
}

.plus {
  font-size: 1rem;
}

.cost-arrow {
  flex-shrink: 0;
}

.cost-highlight {
  text-align: center;
}

.cost-badge {
  display: inline-block;
  padding: 0.4rem 1.2rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
}

.cost-price {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.price-number {
  font-size: 2.8rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.cost-annual {
  font-size: 0.9rem;
  opacity: 0.8;
}

.cost-saving {
  font-size: 1.1rem;
  color: var(--text-light);
}

.cost-saving strong {
  color: var(--blue);
}

.cost-message {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ef4444;
  margin-top: 0.8rem;
}

@media (max-width: 768px) {
  .cost {
    padding: 4rem 1.5rem;
  }

  .section-title {
    font-size: 1.6rem;
  }

  .cost-comparison {
    flex-direction: column;
    gap: 1.5rem;
  }

  .cost-card {
    max-width: 100%;
    width: 100%;
  }

  .cost-arrow {
    transform: rotate(90deg);
  }

  .price-number {
    font-size: 2.2rem;
  }
}
</style>
