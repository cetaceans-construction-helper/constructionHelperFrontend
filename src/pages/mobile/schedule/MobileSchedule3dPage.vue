<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

let prevHtmlOverflow = ''
let prevBodyOverflow = ''

onMounted(() => {
  prevHtmlOverflow = document.documentElement.style.overflow
  prevBodyOverflow = document.body.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.documentElement.style.overflow = prevHtmlOverflow
  document.body.style.overflow = prevBodyOverflow
})
</script>

<template>
  <div class="bg-background text-foreground flex flex-col overflow-hidden" style="height: 100dvh">
    <header class="shrink-0 px-4 py-3">
      <h1 class="text-base font-semibold">모바일 3D 공정표 (Gate 1)</h1>
    </header>

    <main class="flex-1 min-h-0 overflow-hidden">
      <div class="h-full min-h-0 flex flex-col">
        <section
          class="flex-[7] min-h-0 bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center overflow-hidden"
        >
          <p class="text-sm text-muted-foreground">3D Viewer 영역 (스켈레톤)</p>
        </section>

        <section
          class="flex-[3] min-h-0 bg-amber-100 dark:bg-amber-950/40 px-4 py-3 flex flex-col gap-3 overflow-y-auto"
        >
          <p class="text-sm font-medium">하단 패널 영역</p>
          <p class="text-sm text-muted-foreground">
            Gate 1 단계에서는 모바일 라우팅과 화면 골격만 제공합니다.
          </p>
        </section>
      </div>
    </main>
  </div>
</template>
