import { ref, onMounted } from 'vue'
import { referenceApi, type IdNameResponse, type ComponentCodeResponse } from '@/shared/network-core/apis/reference'

const zones = ref<IdNameResponse[]>([])
const floors = ref<IdNameResponse[]>([])
const componentDivisions = ref<IdNameResponse[]>([])
const componentTypes = ref<IdNameResponse[]>([])
const componentCodes = ref<ComponentCodeResponse[]>([])

let loaded = false

export function useReferenceData() {
  onMounted(async () => {
    if (loaded) return
    loaded = true
    try {
      const [z, f, cd] = await Promise.all([
        referenceApi.getZoneList(),
        referenceApi.getFloorList(),
        referenceApi.getComponentDivisionList(),
      ])
      zones.value = z
      floors.value = f
      componentDivisions.value = cd
    } catch (e) {
      console.error('참조 데이터 로딩 실패:', e)
    }
  })

  async function loadComponentTypes(divisionId: number) {
    try {
      componentTypes.value = await referenceApi.getComponentTypeList(divisionId)
      componentCodes.value = []
    } catch (e) {
      console.error('부재타입 로딩 실패:', e)
    }
  }

  async function loadComponentCodes(typeId: number) {
    try {
      componentCodes.value = await referenceApi.getComponentCodeList(typeId)
    } catch (e) {
      console.error('부재코드 로딩 실패:', e)
    }
  }

  return {
    zones,
    floors,
    componentDivisions,
    componentTypes,
    componentCodes,
    loadComponentTypes,
    loadComponentCodes,
  }
}
