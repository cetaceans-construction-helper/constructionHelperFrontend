<script setup lang="ts">
import { onMounted } from 'vue'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import { useSchedule2dRebuildPage } from '@/features/schedule/schedule-2d-rebuild/view-model/useSchedule2dRebuildPage'

const {
  snapshot,
  isLoading,
  errorMessage,
  summary,
  selectionState,
  contextMenuState,
  previewRows,
  previewItems,
  previewDependencies,
  loadSnapshot,
} = useSchedule2dRebuildPage()

onMounted(() => {
  loadSnapshot()
})
</script>

<template>
  <PageContainer title="2D공정표 Rebuild">
    <AreaCard height="flex-1" min-height="800px">
      <div class="flex h-full flex-col gap-6 overflow-auto">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="space-y-1">
            <h2 class="text-xl font-semibold">Schedule 2D Rebuild Batch 1</h2>
            <p class="text-sm text-muted-foreground">
              새 feature 골격, 내부 도메인 모델, work/path adapter, row tree snapshot을 검증하는 단계다.
            </p>
          </div>

          <Button variant="outline" size="sm" :disabled="isLoading" @click="loadSnapshot">
            {{ isLoading ? '불러오는 중...' : 'Snapshot 다시 불러오기' }}
          </Button>
        </div>

        <div
          v-if="errorMessage"
          class="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {{ errorMessage }}
        </div>

        <div class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div class="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">Rows</p>
            <p class="mt-1 text-2xl font-semibold">{{ summary.rows }}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">Items</p>
            <p class="mt-1 text-2xl font-semibold">{{ summary.items }}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">Dependencies</p>
            <p class="mt-1 text-2xl font-semibold">{{ summary.dependencies }}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">Groups</p>
            <p class="mt-1 text-2xl font-semibold">{{ summary.groups }}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">Milestones</p>
            <p class="mt-1 text-2xl font-semibold">{{ summary.milestones }}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">Pending Contracts</p>
            <p class="mt-1 text-2xl font-semibold">{{ summary.pendingContracts }}</p>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <section class="rounded-lg border border-border">
            <div class="border-b border-border px-4 py-3">
              <h3 class="font-medium">Pending Contracts</h3>
            </div>
            <div class="space-y-3 px-4 py-3">
              <div
                v-for="pendingContract in snapshot?.pendingContracts ?? []"
                :key="pendingContract.id"
                class="rounded-md border border-amber-300/60 bg-amber-50/60 px-3 py-2"
              >
                <p class="text-sm font-medium text-amber-950">{{ pendingContract.title }}</p>
                <p class="mt-1 text-xs text-amber-900/80">{{ pendingContract.description }}</p>
              </div>
              <p v-if="!snapshot?.pendingContracts.length" class="text-sm text-muted-foreground">
                현재 pending contract 없음
              </p>
            </div>
          </section>

          <section class="rounded-lg border border-border">
            <div class="border-b border-border px-4 py-3">
              <h3 class="font-medium">Row Preview</h3>
            </div>
            <div class="space-y-2 px-4 py-3 text-sm">
              <div v-for="row in previewRows" :key="row.id" class="rounded-md border border-border px-3 py-2">
                <p class="font-medium">{{ row.name }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ row.kind }} / depth {{ row.depth }} / order {{ row.order }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  source: {{ row.source.derivedFrom }}
                </p>
              </div>
            </div>
          </section>

          <section class="rounded-lg border border-border">
            <div class="border-b border-border px-4 py-3">
              <h3 class="font-medium">Dependency Preview</h3>
            </div>
            <div class="space-y-2 px-4 py-3 text-sm">
              <div
                v-for="dependency in previewDependencies"
                :key="dependency.id"
                class="rounded-md border border-border px-3 py-2"
              >
                <p class="font-medium">{{ dependency.sourceItemId }} → {{ dependency.targetItemId }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  path {{ dependency.pathId }} / lag {{ dependency.lagDays ?? 0 }} / critical {{ dependency.isCriticalCandidate }}
                </p>
              </div>
              <p v-if="!previewDependencies.length" class="text-sm text-muted-foreground">
                표시할 dependency 없음
              </p>
            </div>
          </section>
        </div>

        <section class="rounded-lg border border-border">
          <div class="border-b border-border px-4 py-3">
            <h3 class="font-medium">Item Preview</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th class="px-4 py-3 font-medium">Work</th>
                  <th class="px-4 py-3 font-medium">Row</th>
                  <th class="px-4 py-3 font-medium">Date</th>
                  <th class="px-4 py-3 font-medium">Duration</th>
                  <th class="px-4 py-3 font-medium">Appearance</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in previewItems" :key="item.id" class="border-t border-border">
                  <td class="px-4 py-3">
                    <p class="font-medium">{{ item.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ item.workType }} / {{ item.subWorkType }}</p>
                  </td>
                  <td class="px-4 py-3 font-mono text-xs">{{ item.rowId }}</td>
                  <td class="px-4 py-3">{{ item.startDate }} ~ {{ item.endDate }}</td>
                  <td class="px-4 py-3">{{ item.durationDays }}일</td>
                  <td class="px-4 py-3">{{ item.appearance }}</td>
                </tr>
                <tr v-if="!previewItems.length">
                  <td colspan="5" class="px-4 py-8 text-center text-sm text-muted-foreground">
                    표시할 item 없음
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-lg border border-border px-4 py-3">
          <h3 class="font-medium">Interaction State Seeds</h3>
          <p class="mt-2 text-sm text-muted-foreground">
            selection items: {{ selectionState.itemIds.length }},
            context menu open: {{ contextMenuState.open ? 'yes' : 'no' }}
          </p>
          <p v-if="snapshot" class="mt-2 text-xs text-muted-foreground">
            generated at {{ snapshot.metadata.generatedAt }} / source {{ snapshot.metadata.source }}
          </p>
        </section>
      </div>
    </AreaCard>
  </PageContainer>
</template>
