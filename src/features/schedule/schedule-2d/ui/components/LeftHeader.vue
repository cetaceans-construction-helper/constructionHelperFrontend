<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import type {
  RowLayout,
  WeeklyRowLayout,
  WorkTypeSection,
  SubWorkTypeSection,
} from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import { LEFT_HEADER_WIDTH } from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import { CHART_CONFIG } from '@/features/schedule/schedule-2d/view-model/chartConfigStore'
import type { IdNameResponse } from '@/shared/network-core/apis/reference'
import { Plus, Check, X } from 'lucide-vue-next'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/shared/ui/context-menu'

const props = defineProps<{
  rowLayout: RowLayout
  weeklyRowLayout?: WeeklyRowLayout | null
  weeklyMode: boolean
  viewportY: number
  zoom: number
  headerHeight: number
  divisions: IdNameResponse[]
}>()

const emit = defineEmits<{
  'add-division': [name: string]
  'update-division': [id: number, name: string]
  'delete-division': [id: number, name: string]
  'add-work-type': [divisionId: number, name: string, isStructure: boolean]
  'update-work-type': [id: number, name: string]
  'delete-work-type': [id: number, name: string]
  'add-sub-work-type': [workTypeId: number, name: string]
  'update-sub-work-type': [id: number, name: string]
  'delete-sub-work-type': [id: number, name: string]
  'reorder-divisions': [ids: number[]]
  'reorder-work-types': [divisionId: number, ids: number[]]
  'reorder-sub-work-types': [workTypeId: number, ids: number[]]
}>()

const ROW_UNIT = CHART_CONFIG.nodeHeight + 2 * CHART_CONFIG.nodePaddingY
const WEEKLY_ROW_UNIT = ROW_UNIT * 2

const DIV_WIDTH = 50
const WORK_TYPE_WIDTH = 100
const SUB_WORK_TYPE_WIDTH = 150
const OV_DIV_WIDTH = 50
const OV_WORK_TYPE_WIDTH = 100
const OV_ZONE_WIDTH = 75
const OV_FLOOR_WIDTH = 75

const BG_COLORS = [
  'rgba(59, 130, 246, 0.06)',
  'rgba(16, 185, 129, 0.06)',
  'rgba(245, 158, 11, 0.06)',
  'rgba(168, 85, 247, 0.06)',
  'rgba(236, 72, 153, 0.06)',
  'rgba(6, 182, 212, 0.06)',
]
const FALLBACK_BG = 'rgba(148, 163, 184, 0.06)'
const DIVISION_BG = 'transparent'

/** workTypeId 자체에 종속된 색상 — 재정렬/새로고침에도 안정. 충돌 시 팔레트 길이만큼 순환. */
function getWorkTypeColor(workTypeId: number): string {
  if (workTypeId === 0) return FALLBACK_BG
  return BG_COLORS[workTypeId % BG_COLORS.length]!
}

type CellType = 'division' | 'workType' | 'subWorkType' | 'zone' | 'floor' | 'emptyDivision' | 'emptySection'

interface HeaderCell {
  key: string
  type: CellType
  label: string
  x: number
  width: number
  top: number
  height: number
  bgColor: string
  entityId: number
  parentId: number
  parentLabel?: string
}

/** Division 컬럼: 연속된 같은 divisionId 섹션들을 병합 */
function buildDivisionCells(
  sections: { divisionId: number; divisionName: string; startRowIndex: number; totalRows: number }[],
  rowUnit: number,
  zoom: number,
  width: number,
): HeaderCell[] {
  const result: HeaderCell[] = []
  if (sections.length === 0) return result

  let groupStart = 0
  let groupRows = 0
  let prevDivId = sections[0]!.divisionId
  let prevDivName = sections[0]!.divisionName
  let groupStartRow = sections[0]!.startRowIndex

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!
    if (s.divisionId !== prevDivId) {
      result.push({
        key: `div-${prevDivId}-${groupStart}`,
        type: 'division',
        label: prevDivName,
        x: 0,
        width,
        top: groupStartRow * rowUnit * zoom,
        height: groupRows * rowUnit * zoom,
        bgColor: DIVISION_BG,
        entityId: prevDivId,
        parentId: 0,
      })
      groupStart = i
      groupRows = s.totalRows
      groupStartRow = s.startRowIndex
      prevDivId = s.divisionId
      prevDivName = s.divisionName
    } else {
      groupRows += s.totalRows
    }
  }
  result.push({
    key: `div-${prevDivId}-${groupStart}`,
    type: 'division',
    label: prevDivName,
    x: 0,
    width,
    top: groupStartRow * rowUnit * zoom,
    height: groupRows * rowUnit * zoom,
    bgColor: DIVISION_BG,
    entityId: prevDivId,
    parentId: 0,
  })
  return result
}

const cells = computed<HeaderCell[]>(() => {
  const result: HeaderCell[] = []
  const zoom = props.zoom

  // 주단위화면: 4-column (div / workType / zone / floor). CRUD 는 daily 전용.
  if (props.weeklyMode && props.weeklyRowLayout) {
    const layout = props.weeklyRowLayout
    for (let si = 0; si < layout.sections.length; si++) {
      const section = layout.sections[si]!
      const bgColor = BG_COLORS[si % BG_COLORS.length]!
      const sectionTop = section.startRowIndex * WEEKLY_ROW_UNIT * zoom
      const sectionHeight = section.totalRows * WEEKLY_ROW_UNIT * zoom

      // WorkType cell (col 2)
      result.push({
        key: `ov-wt-${si}`,
        type: 'workType',
        label: section.workType,
        x: OV_DIV_WIDTH,
        width: OV_WORK_TYPE_WIDTH,
        top: sectionTop,
        height: sectionHeight,
        bgColor,
        entityId: 0,
        parentId: 0,
      })

      // Zone + Floor cells (col 3 & 4)
      let zoneStart = 0
      let zoneCount = 0
      let prevZone = ''
      for (let zi = 0; zi < section.zoneFloorSections.length; zi++) {
        const zf = section.zoneFloorSections[zi]!
        if (zi === 0 || zf.zoneName !== prevZone) {
          if (zi > 0) {
            result.push({
              key: `ov-zone-${si}-${zoneStart}`,
              type: 'zone',
              label: prevZone,
              x: OV_DIV_WIDTH + OV_WORK_TYPE_WIDTH,
              width: OV_ZONE_WIDTH,
              top: (section.startRowIndex + zoneStart) * WEEKLY_ROW_UNIT * zoom,
              height: zoneCount * WEEKLY_ROW_UNIT * zoom,
              bgColor,
              entityId: 0,
              parentId: 0,
            })
          }
          zoneStart = zi
          zoneCount = 1
          prevZone = zf.zoneName
        } else {
          zoneCount++
        }

        result.push({
          key: `ov-floor-${si}-${zi}`,
          type: 'floor',
          label: zf.floorName,
          x: OV_DIV_WIDTH + OV_WORK_TYPE_WIDTH + OV_ZONE_WIDTH,
          width: OV_FLOOR_WIDTH,
          top: zf.startRowIndex * WEEKLY_ROW_UNIT * zoom,
          height: WEEKLY_ROW_UNIT * zoom,
          bgColor,
          entityId: 0,
          parentId: 0,
        })
      }
      if (section.zoneFloorSections.length > 0) {
        result.push({
          key: `ov-zone-${si}-${zoneStart}`,
          type: 'zone',
          label: prevZone,
          x: OV_DIV_WIDTH + OV_WORK_TYPE_WIDTH,
          width: OV_ZONE_WIDTH,
          top: (section.startRowIndex + zoneStart) * WEEKLY_ROW_UNIT * zoom,
          height: zoneCount * WEEKLY_ROW_UNIT * zoom,
          bgColor,
          entityId: 0,
          parentId: 0,
        })
      }
    }

    // Weekly 의 division 컬럼: 같은 workType 이 같은 division 에 속한다는 보장은 없으므로
    // weekly 에선 각 section 별로 별도 division 셀 렌더링 (merge 안함, 읽기 전용)
    // weekly 는 rowLayout 에 division 정보가 없으므로 빈 컬럼으로 둔다.
    return result
  }

  // 일단위화면: 3-column layout (division / workType / subWorkType) + 빈 division 추가 행
  const sections = displaySections.value
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]!
    const bgColor = getWorkTypeColor(section.workTypeId)
    const sectionTop = section.startRowIndex * ROW_UNIT * zoom
    const sectionHeight = section.totalRows * ROW_UNIT * zoom

    // WorkType cell (col 2, 섹션 전체 높이)
    result.push({
      key: `wt-${section.workTypeId}-${si}`,
      type: 'workType',
      label: section.workType,
      x: DIV_WIDTH,
      width: WORK_TYPE_WIDTH,
      top: sectionTop,
      height: sectionHeight,
      bgColor,
      entityId: section.workTypeId,
      parentId: section.divisionId,
      parentLabel: section.divisionName,
    })

    // SubWorkType cells (col 3)
    for (const sub of section.subSections) {
      const subTop = sub.startRowIndex * ROW_UNIT * zoom
      const subHeight = sub.subRowCount * ROW_UNIT * zoom

      result.push({
        key: `swt-${sub.subWorkTypeId}-${sub.startRowIndex}`,
        type: sub.subWorkTypeId === 0 ? 'emptySection' : 'subWorkType',
        label: sub.subWorkType,
        x: DIV_WIDTH + WORK_TYPE_WIDTH,
        width: SUB_WORK_TYPE_WIDTH,
        top: subTop,
        height: subHeight,
        bgColor,
        entityId: sub.subWorkTypeId,
        parentId: section.workTypeId,
        parentLabel: section.workType,
      })
    }
  }

  // Division column cells (병합)
  const divCells = buildDivisionCells(
    sections.map((s) => ({
      divisionId: s.divisionId,
      divisionName: s.divisionName,
      startRowIndex: s.startRowIndex,
      totalRows: s.totalRows,
    })),
    ROW_UNIT,
    zoom,
    DIV_WIDTH,
  )
  result.push(...divCells)

  // 비어있는 division (rowLayout 섹션에 없는 것) 을 아래쪽에 1행씩 추가 — displayDivisions 순서 적용
  const totalDisplayRows = sections.reduce((acc, s) => acc + s.totalRows, 0)
  const usedDivIds = new Set(sections.map((s) => s.divisionId))
  let extraTop = totalDisplayRows * ROW_UNIT * zoom
  const extraRowHeight = ROW_UNIT * zoom
  for (const div of displayDivisions.value) {
    if (usedDivIds.has(div.id)) continue
    result.push({
      key: `div-empty-${div.id}`,
      type: 'division',
      label: div.name,
      x: 0,
      width: DIV_WIDTH,
      top: extraTop,
      height: extraRowHeight,
      bgColor: DIVISION_BG,
      entityId: div.id,
      parentId: 0,
    })
    result.push({
      key: `wt-empty-${div.id}`,
      type: 'emptyDivision',
      label: '',
      x: DIV_WIDTH,
      width: WORK_TYPE_WIDTH + SUB_WORK_TYPE_WIDTH,
      top: extraTop,
      height: extraRowHeight,
      bgColor: FALLBACK_BG,
      entityId: 0,
      parentId: div.id,
      parentLabel: div.name,
    })
    extraTop += extraRowHeight
  }

  return result
})

// 드래그 앤 드롭 상태 (실시간 재정렬 미리보기 + 그룹 이동 시각화)
type DraggableType = 'division' | 'workType' | 'subWorkType'

type PreviewState =
  | { kind: 'division'; draggedId: number; order: number[] }
  | { kind: 'workType'; draggedId: number; divisionId: number; order: number[] }
  | { kind: 'subWorkType'; draggedId: number; workTypeId: number; order: number[] }
  | null

const dragState = ref<{
  type: DraggableType
  entityId: number
  parentId: number
  initialOrder: number[]
} | null>(null)
const previewState = ref<PreviewState>(null)

function isDraggableCell(cell: HeaderCell): boolean {
  if (cell.type !== 'division' && cell.type !== 'workType' && cell.type !== 'subWorkType') return false
  return cell.entityId !== 0
}

/** 드래그 중인 셀(div 전체 그룹, wt 전체 그룹, swt 단일)의 key 집합 — 시각화용 */
const draggingGroupEntityKeys = computed(() => {
  const s = dragState.value
  if (!s) return null
  return s
})

function reorderIds(ids: number[], draggedId: number, targetId: number, after: boolean): number[] {
  const filtered = ids.filter((id) => id !== draggedId)
  const targetIdx = filtered.indexOf(targetId)
  if (targetIdx < 0) return ids
  const insertIdx = after ? targetIdx + 1 : targetIdx
  filtered.splice(insertIdx, 0, draggedId)
  return filtered
}

/** 현재 props 기준의 sibling id 순서 계산 */
function getSiblingIds(type: DraggableType, parentId: number): number[] {
  if (type === 'division') return props.divisions.map((d) => d.id)
  if (type === 'workType') {
    return props.rowLayout.sections
      .filter((sec) => sec.divisionId === parentId && sec.workTypeId !== 0)
      .map((sec) => sec.workTypeId)
  }
  const section = props.rowLayout.sections.find((sec) => sec.workTypeId === parentId)
  if (!section) return []
  return section.subSections.filter((s) => s.subWorkTypeId !== 0).map((s) => s.subWorkTypeId)
}

function onDragStart(cell: HeaderCell, e: DragEvent) {
  if (!isDraggableCell(cell)) return
  const type = cell.type as DraggableType
  const siblings = getSiblingIds(type, cell.parentId)
  dragState.value = {
    type,
    entityId: cell.entityId,
    parentId: cell.parentId,
    initialOrder: [...siblings],
  }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(cell.entityId))
    // 기본 drag ghost 숨김 (실제 셀이 실시간으로 이동하므로 고스트 불필요)
    const empty = document.createElement('div')
    empty.style.width = '1px'
    empty.style.height = '1px'
    empty.style.opacity = '0'
    document.body.appendChild(empty)
    e.dataTransfer.setDragImage(empty, 0, 0)
    setTimeout(() => document.body.removeChild(empty), 0)
  }
  // 초기 미리보기 = 현재 순서
  if (type === 'division') {
    previewState.value = { kind: 'division', draggedId: cell.entityId, order: siblings }
  } else if (type === 'workType') {
    previewState.value = {
      kind: 'workType',
      draggedId: cell.entityId,
      divisionId: cell.parentId,
      order: siblings,
    }
  } else {
    previewState.value = {
      kind: 'subWorkType',
      draggedId: cell.entityId,
      workTypeId: cell.parentId,
      order: siblings,
    }
  }
}

/** LeftHeader 루트 dragover — 드래그 중 cursor 가 항상 'move' 로 보이도록 */
function onRootDragOver(e: DragEvent) {
  if (!dragState.value) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function canDrop(cell: HeaderCell): boolean {
  const s = dragState.value
  if (!s || !isDraggableCell(cell)) return false
  if (s.type !== cell.type) return false
  if (s.entityId === cell.entityId) return false
  if (cell.type === 'division') return true
  return s.parentId === cell.parentId
}

function onDragOver(cell: HeaderCell, e: DragEvent) {
  if (!canDrop(cell)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'

  // 타겟 셀의 상/하 절반 판정 — 아래 절반이면 '뒤에 삽입' → 맨 아래 이동 지원
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const insertAfter = e.clientY > rect.top + rect.height / 2

  const s = dragState.value!
  const ps = previewState.value
  if (!ps) return
  const newOrder = reorderIds(ps.order, s.entityId, cell.entityId, insertAfter)
  // 이미 같은 순서면 skip (반응형 재렌더 스킵)
  if (newOrder.length === ps.order.length && newOrder.every((v, i) => v === ps.order[i])) return

  if (ps.kind === 'division') {
    previewState.value = { ...ps, order: newOrder }
  } else if (ps.kind === 'workType') {
    previewState.value = { ...ps, order: newOrder }
  } else {
    previewState.value = { ...ps, order: newOrder }
  }
}

/** 드래그 종료 공통 처리 — drop 또는 dragend 어느 쪽에서 호출되어도 됨.
 *  preview order 가 초기 순서와 다르면 API 호출 emit, 같으면 no-op.
 */
function commitReorder() {
  const s = dragState.value
  const ps = previewState.value
  dragState.value = null
  if (!s || !ps) {
    previewState.value = null
    return
  }

  const changed =
    ps.order.length !== s.initialOrder.length ||
    ps.order.some((id, i) => id !== s.initialOrder[i])

  if (!changed) {
    previewState.value = null
    return
  }

  if (ps.kind === 'division') {
    emit('reorder-divisions', ps.order)
  } else if (ps.kind === 'workType') {
    emit('reorder-work-types', ps.divisionId, ps.order)
  } else {
    emit('reorder-sub-work-types', ps.workTypeId, ps.order)
  }
  // previewState 는 props 갱신 시 watch 로 클리어 → 시각적 snap-back 방지
}

function onDrop(cell: HeaderCell, e: DragEvent) {
  e.preventDefault()
  void cell
  commitReorder()
}

function onDragEnd() {
  // 드롭 여부와 무관하게 release 시점에 최종 order commit
  commitReorder()
}

// props 가 새 순서로 갱신되면 preview 제거
watch(
  () => [props.rowLayout.sections, props.divisions],
  () => {
    if (!dragState.value) previewState.value = null
  },
  { deep: false },
)

/** 미리보기 반영된 sections — startRowIndex / subSections.startRowIndex 재계산 */
const displaySections = computed<WorkTypeSection[]>(() => {
  const original = props.rowLayout.sections
  const ps = previewState.value
  let sections: WorkTypeSection[] = [...original]

  if (ps?.kind === 'division') {
    const byDiv = new Map<number, WorkTypeSection[]>()
    for (const sec of sections) {
      if (!byDiv.has(sec.divisionId)) byDiv.set(sec.divisionId, [])
      byDiv.get(sec.divisionId)!.push(sec)
    }
    const result: WorkTypeSection[] = []
    for (const divId of ps.order) {
      const secs = byDiv.get(divId)
      if (secs) {
        result.push(...secs)
        byDiv.delete(divId)
      }
    }
    for (const secs of byDiv.values()) result.push(...secs)
    sections = result
  } else if (ps?.kind === 'workType') {
    const before: WorkTypeSection[] = []
    const inDiv: WorkTypeSection[] = []
    const after: WorkTypeSection[] = []
    let phase: 'before' | 'in' | 'after' = 'before'
    for (const sec of sections) {
      if (sec.divisionId === ps.divisionId) {
        inDiv.push(sec)
        phase = 'in'
      } else if (phase === 'in') {
        after.push(sec)
      } else {
        before.push(sec)
      }
    }
    const byId = new Map(inDiv.map((s) => [s.workTypeId, s]))
    const reordered = ps.order.map((id) => byId.get(id)).filter(Boolean) as WorkTypeSection[]
    const extras = inDiv.filter((s) => !ps.order.includes(s.workTypeId))
    sections = [...before, ...reordered, ...extras, ...after]
  } else if (ps?.kind === 'subWorkType') {
    sections = sections.map((sec) => {
      if (sec.workTypeId !== ps.workTypeId) return sec
      const byId = new Map(sec.subSections.map((s) => [s.subWorkTypeId, s]))
      const reordered = ps.order.map((id) => byId.get(id)).filter(Boolean) as SubWorkTypeSection[]
      const extras = sec.subSections.filter((s) => !ps.order.includes(s.subWorkTypeId))
      return { ...sec, subSections: [...reordered, ...extras] }
    })
  }

  // startRowIndex 재계산
  let currentRow = 0
  return sections.map((sec) => {
    let subStart = currentRow
    const newSubs: SubWorkTypeSection[] = sec.subSections.map((s) => {
      const ns = { ...s, startRowIndex: subStart }
      subStart += s.subRowCount
      return ns
    })
    const totalRows = subStart - currentRow
    const ns = { ...sec, subSections: newSubs, totalRows, startRowIndex: currentRow }
    currentRow = subStart
    return ns
  })
})

/** 빈 division 목록도 preview order 반영 */
const displayDivisions = computed<IdNameResponse[]>(() => {
  const ps = previewState.value
  if (ps?.kind !== 'division') return props.divisions
  const byId = new Map(props.divisions.map((d) => [d.id, d]))
  const reordered = ps.order.map((id) => byId.get(id)).filter(Boolean) as IdNameResponse[]
  const extras = props.divisions.filter((d) => !ps.order.includes(d.id))
  return [...reordered, ...extras]
})

/** 드래그 중인 셀(분류의 경우 전체 자식 포함)의 key 판별 */
function isInDraggingGroup(cell: HeaderCell): boolean {
  const s = dragState.value
  if (!s) return false
  if (s.type === 'division') {
    if (cell.type === 'division' && cell.entityId === s.entityId) return true
    if (cell.type === 'workType' && cell.parentId === s.entityId) return true
    if (cell.type === 'subWorkType') {
      // subWorkType 셀의 parent workType 찾기 → 해당 workType 이 div 에 속하는지
      const section = displaySections.value.find((sec) => sec.workTypeId === cell.parentId)
      return !!section && section.divisionId === s.entityId
    }
    return false
  }
  if (s.type === 'workType') {
    if (cell.type === 'workType' && cell.entityId === s.entityId) return true
    if (cell.type === 'subWorkType' && cell.parentId === s.entityId) return true
    return false
  }
  // subWorkType
  return cell.type === 'subWorkType' && cell.entityId === s.entityId
}
// 사용되지 않지만 가독성 위해 명시 (향후 확장용)
void draggingGroupEntityKeys.value

// 인라인 편집 상태
const editingKey = ref<string | null>(null)
const editingValue = ref('')

function startRename(cell: HeaderCell) {
  editingKey.value = cell.key
  editingValue.value = cell.label
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>(`[data-edit-key="${cell.key}"]`)
    el?.focus()
    el?.select()
  })
}

function commitRename(cell: HeaderCell) {
  const newName = editingValue.value.trim()
  editingKey.value = null
  if (!newName || newName === cell.label) return
  if (cell.type === 'division') emit('update-division', cell.entityId, newName)
  else if (cell.type === 'workType') emit('update-work-type', cell.entityId, newName)
  else if (cell.type === 'subWorkType') emit('update-sub-work-type', cell.entityId, newName)
}

function cancelRename() {
  editingKey.value = null
  editingValue.value = ''
}

// 삭제 다이얼로그
const deleteDialogOpen = ref(false)
const deleteTarget = ref<{ type: CellType; id: number; name: string } | null>(null)

function startDelete(cell: HeaderCell) {
  deleteTarget.value = { type: cell.type, id: cell.entityId, name: cell.label }
  deleteDialogOpen.value = true
}

function confirmDelete() {
  const t = deleteTarget.value
  if (!t) return
  if (t.type === 'division') emit('delete-division', t.id, t.name)
  else if (t.type === 'workType') emit('delete-work-type', t.id, t.name)
  else if (t.type === 'subWorkType') emit('delete-sub-work-type', t.id, t.name)
  deleteDialogOpen.value = false
  deleteTarget.value = null
}

// 추가 다이얼로그
type AddMode = 'division' | 'work-type' | 'sub-work-type'
const addDialogOpen = ref(false)
const addMode = ref<AddMode>('division')
const addName = ref('')
const addParentId = ref(0)
const addParentLabel = ref('')
const addIsStructure = ref(false)

function startAddDivision() {
  addMode.value = 'division'
  addName.value = ''
  addParentId.value = 0
  addParentLabel.value = ''
  addIsStructure.value = false
  addDialogOpen.value = true
}

function startAddWorkType(cell: HeaderCell) {
  addMode.value = 'work-type'
  addName.value = ''
  addParentId.value = cell.entityId
  addParentLabel.value = cell.label
  addIsStructure.value = false
  addDialogOpen.value = true
}

// workType cell 에서 우클릭 → 같은 division 아래 새 workType 추가
function startAddWorkTypeSibling(cell: HeaderCell) {
  addMode.value = 'work-type'
  addName.value = ''
  addParentId.value = cell.parentId
  addParentLabel.value = cell.parentLabel ?? ''
  addIsStructure.value = false
  addDialogOpen.value = true
}

function startAddSubWorkType(cell: HeaderCell) {
  addMode.value = 'sub-work-type'
  addName.value = ''
  addParentId.value = cell.entityId
  addParentLabel.value = cell.label
  addIsStructure.value = false
  addDialogOpen.value = true
}

// subWorkType cell 에서 우클릭 → 같은 workType 아래 새 subWorkType 추가
function startAddSubWorkTypeSibling(cell: HeaderCell) {
  addMode.value = 'sub-work-type'
  addName.value = ''
  addParentId.value = cell.parentId
  addParentLabel.value = cell.parentLabel ?? ''
  addIsStructure.value = false
  addDialogOpen.value = true
}

const addDialogTitle = computed(() => {
  if (addMode.value === 'division') return '분류 추가'
  if (addMode.value === 'work-type') return `공종 추가 (${addParentLabel.value})`
  return `세부공종 추가 (${addParentLabel.value})`
})

const addInputWrapper = ref<HTMLElement | null>(null)

function onAddInputEnter(e: KeyboardEvent) {
  if (e.isComposing) return
  submitAdd()
}

function submitAdd() {
  const name = addName.value.trim()
  if (!name) return
  if (addMode.value === 'division') emit('add-division', name)
  else if (addMode.value === 'work-type') emit('add-work-type', addParentId.value, name, addIsStructure.value)
  else if (addMode.value === 'sub-work-type') emit('add-sub-work-type', addParentId.value, name)
  addDialogOpen.value = false
  addName.value = ''
}

// 다이얼로그 열릴 때 Input 자동 포커스 (reka-ui focus trap 을 우회하도록 다음 프레임에 포커스)
watch(addDialogOpen, (open) => {
  if (!open) return
  nextTick(() => {
    requestAnimationFrame(() => {
      const input = addInputWrapper.value?.querySelector<HTMLInputElement>('input')
      input?.focus()
      input?.select()
    })
  })
})

const isEmpty = computed(
  () => props.rowLayout.sections.length === 0 && props.divisions.length === 0 && !props.weeklyMode,
)

// 다이얼로그가 닫힐 때 입력 초기화
watch(addDialogOpen, (open) => {
  if (!open) addName.value = ''
})
</script>

<template>
  <div
    class="absolute top-0 left-0 z-20 overflow-hidden bg-background border-r border-border"
    data-left-header="true"
    :style="{
      width: `${LEFT_HEADER_WIDTH}px`,
      top: `${headerHeight}px`,
      bottom: '0px',
    }"
    @dragover="onRootDragOver"
  >
    <!-- 빈 상태: 분류/섹션 모두 없음 (daily only) -->
    <div
      v-if="isEmpty"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
    >
      <p class="text-xs text-muted-foreground">
        분류 · 공종 · 세부공종이 없습니다
      </p>
      <Button size="sm" @click="startAddDivision">
        <Plus class="w-4 h-4" />
        분류 추가
      </Button>
    </div>

    <div
      :style="{
        transform: `translateY(${viewportY}px)`,
        position: 'relative',
      }"
    >
      <template v-for="cell in cells" :key="cell.key">
        <!-- 편집 모드 (인라인 Input) -->
        <div
          v-if="editingKey === cell.key"
          class="absolute flex items-center justify-center border-b border-r border-border text-[11px] select-none overflow-hidden"
          :style="{
            left: `${cell.x}px`,
            width: `${cell.width}px`,
            top: `${cell.top}px`,
            height: `${cell.height}px`,
            backgroundColor: cell.bgColor,
          }"
        >
          <input
            :data-edit-key="cell.key"
            v-model="editingValue"
            class="w-full h-6 px-1 text-[11px] border border-primary rounded bg-background text-foreground"
            @keydown.enter.stop.prevent="commitRename(cell)"
            @keydown.esc.stop.prevent="cancelRename"
            @blur="commitRename(cell)"
            @click.stop
          />
        </div>

        <!-- 편집 가능 셀 (division / workType / subWorkType) — 우클릭 컨텍스트 메뉴 + 드래그 재정렬 -->
        <ContextMenu
          v-else-if="!weeklyMode && (cell.type === 'division' || cell.type === 'workType' || cell.type === 'subWorkType')"
        >
          <ContextMenuTrigger as-child>
            <div
              class="absolute flex items-center justify-center border-b border-r border-border text-[11px] select-none overflow-hidden outline-none transition-[top,left,height,opacity] duration-200 ease-out"
              :class="[
                cell.type === 'division' || cell.type === 'workType' ? 'font-medium' : '',
                isDraggableCell(cell) ? 'cursor-grab active:cursor-grabbing' : '',
                isInDraggingGroup(cell) ? 'opacity-60' : '',
              ]"
              :style="{
                left: `${cell.x}px`,
                width: `${cell.width}px`,
                top: `${cell.top}px`,
                height: `${cell.height}px`,
                backgroundColor: cell.bgColor,
              }"
              :draggable="isDraggableCell(cell)"
              @dragstart="onDragStart(cell, $event)"
              @dragover="onDragOver(cell, $event)"
              @drop="onDrop(cell, $event)"
              @dragend="onDragEnd"
            >
              <span class="px-1 text-center truncate pointer-events-none" :title="cell.label">
                {{ cell.label || '\u00A0' }}
              </span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <!-- Division -->
            <template v-if="cell.type === 'division'">
              <ContextMenuItem @select="startAddDivision">분류 추가</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem @select="startRename(cell)">이름 수정</ContextMenuItem>
              <ContextMenuItem class="text-destructive" @select="startDelete(cell)">삭제</ContextMenuItem>
            </template>
            <!-- WorkType -->
            <template v-else-if="cell.type === 'workType'">
              <ContextMenuItem
                :disabled="cell.parentId === 0"
                @select="startAddWorkTypeSibling(cell)"
              >
                공종 추가
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                :disabled="cell.entityId === 0"
                @select="startRename(cell)"
              >
                이름 수정
              </ContextMenuItem>
              <ContextMenuItem
                :disabled="cell.entityId === 0"
                class="text-destructive"
                @select="startDelete(cell)"
              >
                삭제
              </ContextMenuItem>
            </template>
            <!-- SubWorkType -->
            <template v-else>
              <ContextMenuItem @select="startAddSubWorkTypeSibling(cell)">세부공종 추가</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem @select="startRename(cell)">이름 수정</ContextMenuItem>
              <ContextMenuItem class="text-destructive" @select="startDelete(cell)">삭제</ContextMenuItem>
            </template>
          </ContextMenuContent>
        </ContextMenu>

        <!-- 빈 division (공종 없음) — 하위 개념(공종) 추가 -->
        <div
          v-else-if="!weeklyMode && cell.type === 'emptyDivision' && cell.parentId !== 0"
          class="absolute flex items-center justify-center gap-1 border-b border-r border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-[top,left,background-color,color] duration-200 ease-out cursor-pointer select-none"
          :style="{
            left: `${cell.x}px`,
            width: `${cell.width}px`,
            top: `${cell.top}px`,
            height: `${cell.height}px`,
            backgroundColor: cell.bgColor,
          }"
          @click="startAddWorkType({ ...cell, entityId: cell.parentId, label: cell.parentLabel ?? '' } as HeaderCell)"
        >
          <Plus class="w-3 h-3 pointer-events-none" />
          <span class="pointer-events-none">공종 추가</span>
        </div>

        <!-- 빈 세부공종 (공종에 세부공종 없음) — 하위 개념(세부공종) 추가 -->
        <div
          v-else-if="!weeklyMode && cell.type === 'emptySection' && cell.parentId !== 0"
          class="absolute flex items-center justify-center gap-1 border-b border-r border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-[top,left,background-color,color] duration-200 ease-out cursor-pointer select-none"
          :style="{
            left: `${cell.x}px`,
            width: `${cell.width}px`,
            top: `${cell.top}px`,
            height: `${cell.height}px`,
            backgroundColor: cell.bgColor,
          }"
          @click="startAddSubWorkType({ ...cell, entityId: cell.parentId, label: cell.parentLabel ?? '' } as HeaderCell)"
        >
          <Plus class="w-3 h-3 pointer-events-none" />
          <span class="pointer-events-none">세부공종 추가</span>
        </div>

        <!-- 비상호작용 셀 (weekly zone/floor, 미분류 emptySection 등) -->
        <div
          v-else
          class="absolute flex items-center justify-center border-b border-r border-border text-[11px] select-none overflow-hidden transition-[top,left,height] duration-200 ease-out"
          :class="[
            cell.type === 'workType' ? 'font-medium' : '',
            cell.type === 'emptySection' || cell.type === 'emptyDivision' ? 'italic text-muted-foreground' : '',
          ]"
          :style="{
            left: `${cell.x}px`,
            width: `${cell.width}px`,
            top: `${cell.top}px`,
            height: `${cell.height}px`,
            backgroundColor: cell.bgColor,
          }"
        >
          <span class="px-1 text-center truncate" :title="cell.label">
            {{ cell.label || '\u00A0' }}
          </span>
        </div>
      </template>
    </div>

    <!-- 삭제 확인 다이얼로그 -->
    <AlertDialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTarget?.name }}' 을(를) 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 추가 다이얼로그 (division / workType / subWorkType 공용) -->
    <AlertDialog :open="addDialogOpen" @update:open="addDialogOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ addDialogTitle }}</AlertDialogTitle>
        </AlertDialogHeader>
        <div ref="addInputWrapper" class="space-y-3">
          <Input
            v-model="addName"
            placeholder="이름 입력"
            @keydown.enter.stop.prevent="onAddInputEnter"
          />
          <div v-if="addMode === 'work-type'" class="flex gap-2">
            <Button
              type="button"
              :variant="addIsStructure ? 'default' : 'outline'"
              size="sm"
              class="flex-1"
              @click="addIsStructure = true"
            >
              <Check v-if="addIsStructure" class="w-3 h-3" />
              구조
            </Button>
            <Button
              type="button"
              :variant="!addIsStructure ? 'default' : 'outline'"
              size="sm"
              class="flex-1"
              @click="addIsStructure = false"
            >
              <Check v-if="!addIsStructure" class="w-3 h-3" />
              비구조
            </Button>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <X class="w-3 h-3" />
            취소
          </AlertDialogCancel>
          <AlertDialogAction :disabled="!addName.trim()" @click="submitAdd">
            추가
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
