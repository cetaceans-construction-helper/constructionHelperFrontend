<script setup lang="ts">
import { ref } from 'vue'
import { Settings } from 'lucide-vue-next'
import ReferenceEditDialog from '@/shared/helper-ui/ReferenceEditDialog.vue'
import {
  REFERENCE_EDIT_TITLES,
  type ReferenceEditType,
} from '@/shared/helper-ui/reference-edit-panels/types'

defineProps<{
  type: ReferenceEditType
}>()

const emit = defineEmits<{
  refresh: []
}>()

const dialogOpen = ref(false)

function handleClose() {
  emit('refresh')
}
</script>

<template>
  <button
    class="inline-flex items-center justify-center p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    :title="REFERENCE_EDIT_TITLES[type]"
    @click="dialogOpen = true"
  >
    <Settings class="w-3.5 h-3.5" />
  </button>
  <ReferenceEditDialog
    v-model:open="dialogOpen"
    :type="type"
    @close="handleClose"
  />
</template>
