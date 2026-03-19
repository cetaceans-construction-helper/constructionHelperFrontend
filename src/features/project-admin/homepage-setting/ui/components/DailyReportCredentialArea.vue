<script setup lang="ts">
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useHomepageSetting } from '@/features/project-admin/homepage-setting/view-model/useHomepageSetting'

const { id, password, url, safetyCheck, tomorrowWorkMode, save } = useHomepageSetting()
</script>

<template>
  <div class="space-y-6 max-w-lg">
    <div class="space-y-2">
      <Label>아이디</Label>
      <Input v-model="id" placeholder="홈페이지 로그인 ID" />
    </div>

    <div class="space-y-2">
      <Label>비밀번호</Label>
      <Input v-model="password" type="password" placeholder="홈페이지 로그인 비밀번호" />
    </div>

    <div class="space-y-2">
      <Label>URL</Label>
      <Input v-model="url" placeholder="예: https://example.com" />
    </div>

    <div class="space-y-2">
      <Label>안전점검</Label>
      <textarea
        v-model="safetyCheck"
        placeholder="안전점검 내용"
        rows="5"
        class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>

    <div class="space-y-2">
      <Label>내일 작업 기준</Label>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" :value="1" v-model="tomorrowWorkMode" />
          다음 작업일
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" :value="2" v-model="tomorrowWorkMode" />
          내일
        </label>
      </div>
    </div>

    <Button @click="save">저장</Button>
  </div>
</template>
