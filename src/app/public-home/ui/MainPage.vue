<script setup lang="ts">
import { ref } from 'vue'
import HeroSection from './components/HeroSection.vue'
import CostSection from './components/CostSection.vue'
import WhySection from './components/WhySection.vue'
import ServicesSection from './components/ServicesSection.vue'
import ProcessSection from './components/ProcessSection.vue'
import CtaSection from './components/CtaSection.vue'
import ContactModal from './components/ContactModal.vue'
import FooterSection from './components/FooterSection.vue'

const showModal = ref(false)

const openModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}
</script>

<template>
  <div class="landing-page">
    <HeroSection @open-contact="openModal" />
    <CostSection />
    <WhySection />
    <ServicesSection />
    <ProcessSection />
    <CtaSection @open-contact="openModal" />
    <FooterSection />
    <ContactModal :show="showModal" @close="closeModal" />
  </div>
</template>

<style>
.landing-page {
  --deep-navy: #1F2F98;
  --blue: #1CA7EC;
  --purple-blue: #787FF6;
  --cyan: #4ADEDE;
  --light-blue: #7BD5F5;
  --white: #ffffff;
  --light-gray: #f8f9fc;
  --text-dark: #1a1a2e;
  --text-light: #6b7280;

  font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-dark);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
</style>
