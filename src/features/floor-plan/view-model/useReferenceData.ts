import { ref, onMounted } from 'vue'
import { referenceApi, type IdNameResponse, type ComponentCodeResponse, type ComponentTypeResponse } from '@/shared/network-core/apis/reference'

const zones = ref<IdNameResponse[]>([])
const floors = ref<IdNameResponse[]>([])
const componentTypes = ref<ComponentTypeResponse[]>([])
const componentCodes = ref<ComponentCodeResponse[]>([])

let loaded = false

export function useReferenceData() {
  onMounted(async () => {
    if (loaded) return
    loaded = true
    try {
      const [z, f] = await Promise.all([
        referenceApi.getZoneList(),
        referenceApi.getFloorList(),
      ])
      zones.value = z
      floors.value = f
    } catch (e) {
      console.error('참조 데이터 로딩 실패:', e)
    }
  })

  async function loadComponentTypes(isStructure: boolean) {
    try {
      componentTypes.value = await referenceApi.getComponentTypeList(isStructure)
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
    componentTypes,
    componentCodes,
    loadComponentTypes,
    loadComponentCodes,
  }
}
