<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useRoleManagement } from '../composables/useRoleManagement'

const {
  systemRoles,
  isLoadingSystemRoles,
  isCreatingSystemRole,
  newSystemRoleName,
  createSystemRole,
  companyRoles,
  isLoadingCompanyRoles,
  isCreatingCompanyRole,
  newCompanyRoleName,
  createCompanyRole,
  loadAllRoles,
} = useRoleManagement()

onMounted(() => {
  loadAllRoles()
})
</script>

<template>
  <div class="space-y-6">
    <!-- 시스템 역할 -->
    <div class="space-y-4">
      <h4 class="font-semibold">시스템 역할</h4>
      <p class="text-sm text-muted-foreground">
        프로젝트 내 사용자의 권한을 정의합니다. (예: GC, SC, Viewer)
      </p>

      <div class="flex gap-2">
        <Input
          v-model="newSystemRoleName"
          placeholder="새 시스템 역할명"
          @keyup.enter="createSystemRole"
          class="max-w-xs"
        />
        <Button
          @click="createSystemRole"
          :disabled="!newSystemRoleName.trim() || isCreatingSystemRole"
        >
          추가
        </Button>
      </div>

      <div class="flex flex-wrap gap-2">
        <div
          v-if="isLoadingSystemRoles"
          class="text-sm text-muted-foreground"
        >
          로딩 중...
        </div>
        <div
          v-else-if="systemRoles.length === 0"
          class="text-sm text-muted-foreground"
        >
          등록된 시스템 역할이 없습니다.
        </div>
        <div
          v-for="role in systemRoles"
          :key="role.id"
          class="px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm font-medium"
        >
          {{ role.name }}
        </div>
      </div>
    </div>

    <Separator />

    <!-- 회사 역할 -->
    <div class="space-y-4">
      <h4 class="font-semibold">회사 역할</h4>
      <p class="text-sm text-muted-foreground">
        프로젝트에서 회사의 역할을 정의합니다. (예: 시공사, 감리사, 발주처)
      </p>

      <div class="flex gap-2">
        <Input
          v-model="newCompanyRoleName"
          placeholder="새 회사 역할명"
          @keyup.enter="createCompanyRole"
          class="max-w-xs"
        />
        <Button
          @click="createCompanyRole"
          :disabled="!newCompanyRoleName.trim() || isCreatingCompanyRole"
        >
          추가
        </Button>
      </div>

      <div class="flex flex-wrap gap-2">
        <div
          v-if="isLoadingCompanyRoles"
          class="text-sm text-muted-foreground"
        >
          로딩 중...
        </div>
        <div
          v-else-if="companyRoles.length === 0"
          class="text-sm text-muted-foreground"
        >
          등록된 회사 역할이 없습니다.
        </div>
        <div
          v-for="role in companyRoles"
          :key="role.id"
          class="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium"
        >
          {{ role.name }}
        </div>
      </div>
    </div>
  </div>
</template>
