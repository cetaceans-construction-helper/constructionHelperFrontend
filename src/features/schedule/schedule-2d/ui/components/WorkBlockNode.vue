<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position, type NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()

const labelText = computed(() => {
  return (props.data?.label as string) || ''
})
</script>

<template>
  <div
    class="flex items-center justify-center w-full h-full px-2 text-center overflow-visible whitespace-nowrap border-2 rounded"
    style="border-color: inherit"
  >
    <Handle id="target-left" type="target" :position="Position.Left" />
    <span class="text-[44px] font-medium whitespace-nowrap">{{ labelText }}</span>
    <Handle id="source-right" type="source" :position="Position.Right" />
  </div>
</template>
