<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'
import { Button } from '@/shared/ui/button'

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  suffix?: string
}>(), {
  min: 1,
  suffix: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

function decrement() {
  emit('update:modelValue', Math.max(props.min, props.modelValue - 1))
}

function increment() {
  emit('update:modelValue', props.modelValue + 1)
}
</script>

<template>
  <div class="flex items-center gap-1">
    <Button variant="outline" size="icon-sm" :disabled="modelValue <= min" @click="decrement">
      <Minus class="w-4 h-4" />
    </Button>
    <span class="h-9 flex-1 flex items-center justify-center text-sm rounded-md border border-input bg-transparent shadow-xs">
      {{ modelValue }}{{ suffix }}
    </span>
    <Button variant="outline" size="icon-sm" @click="increment">
      <Plus class="w-4 h-4" />
    </Button>
  </div>
</template>
