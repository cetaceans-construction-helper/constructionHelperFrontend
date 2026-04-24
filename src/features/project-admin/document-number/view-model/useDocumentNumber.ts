import { ref } from 'vue'
import {
  docConfigApi,
  type DocConfigDocType,
  type DocConfigResponse,
  type UploadDocType,
} from '@/shared/network-core/apis/docConfig'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

type Prompts = Record<DocConfigDocType, string>
type CellRefs = Record<UploadDocType, string>
type CellRefFlags = Record<UploadDocType, boolean>

function emptyPrompts(): Prompts {
  return { MIR: '', CAT: '', CCST: '' }
}

function emptyCellRefs(): CellRefs {
  return { MIR: '', CAT: '', CCST: '', DR: '' }
}

function emptyCellRefFlags(): CellRefFlags {
  return { MIR: false, CAT: false, CCST: false, DR: false }
}

function prettify(json: string | null | undefined): string {
  if (!json) return ''
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

export function useDocumentNumber() {
  const isLoading = ref(false)
  const isSaving = ref<Record<DocConfigDocType, boolean>>({
    MIR: false,
    CAT: false,
    CCST: false,
  })
  const isSavingCellRef = ref<CellRefFlags>(emptyCellRefFlags())
  const isGeneratingCellRef = ref<CellRefFlags>(emptyCellRefFlags())
  const exists = ref(false)
  const prompts = ref<Prompts>(emptyPrompts())
  const cellRefs = ref<CellRefs>(emptyCellRefs())
  const mirTemplateUrl = ref<string | null>(null)

  function applyResponse(res: DocConfigResponse) {
    prompts.value = {
      MIR: res.mirDocNoPrompt ?? '',
      CAT: res.catDocNoPrompt ?? '',
      CCST: res.ccstDocNoPrompt ?? '',
    }
    cellRefs.value = {
      MIR: prettify(res.mirExcelCellRef),
      CAT: prettify(res.catExcelCellRef),
      CCST: prettify(res.ccstExcelCellRef),
      DR: prettify(res.drExcelCellRef),
    }
    mirTemplateUrl.value = res.mirTemplateUrl
  }

  async function load(projectId: string) {
    isLoading.value = true
    try {
      const res = await docConfigApi.getDocConfig(projectId)
      exists.value = true
      applyResponse(res)
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string }
      if (err.response?.status === 404 || err.response?.status === 400) {
        exists.value = false
        prompts.value = emptyPrompts()
        cellRefs.value = emptyCellRefs()
        mirTemplateUrl.value = null
      } else {
        console.error('문서번호 설정 로드 실패:', error)
        alert(err.response?.data?.message || err.message)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function ensureExists(projectId: string) {
    if (exists.value) return
    const res = await docConfigApi.createDocConfig(projectId)
    exists.value = true
    applyResponse(res)
  }

  async function save(projectId: string, docType: DocConfigDocType) {
    isSaving.value[docType] = true
    try {
      await ensureExists(projectId)
      const res = await docConfigApi.updateDocNoPrompt(projectId, {
        docType,
        prompt: prompts.value[docType],
      })
      applyResponse(res)
      analyticsClient.trackAction('admin_document_number', `save_${docType.toLowerCase()}_prompt`, 'success')
      alert('저장되었습니다.')
    } catch (error: unknown) {
      console.error('문서번호 프롬프트 저장 실패:', error)
      analyticsClient.trackAction('admin_document_number', `save_${docType.toLowerCase()}_prompt`, 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isSaving.value[docType] = false
    }
  }

  async function saveCellRef(projectId: string, docType: UploadDocType) {
    const raw = cellRefs.value[docType].trim()
    if (!raw) {
      alert('셀 좌표 JSON을 입력해주세요.')
      return
    }
    let minified: string
    try {
      minified = JSON.stringify(JSON.parse(raw))
    } catch {
      alert('유효하지 않은 JSON 형식입니다.')
      return
    }
    isSavingCellRef.value[docType] = true
    try {
      await ensureExists(projectId)
      const res = await docConfigApi.updateExcelCellRef(projectId, {
        docType,
        json: minified,
      })
      applyResponse(res)
      analyticsClient.trackAction('admin_document_number', `save_${docType.toLowerCase()}_cell_ref`, 'success')
      alert('셀 좌표가 저장되었습니다.')
    } catch (error: unknown) {
      console.error('셀 좌표 저장 실패:', error)
      analyticsClient.trackAction('admin_document_number', `save_${docType.toLowerCase()}_cell_ref`, 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isSavingCellRef.value[docType] = false
    }
  }

  async function generateCellRef(projectId: string, docType: UploadDocType) {
    isGeneratingCellRef.value[docType] = true
    try {
      const res = await docConfigApi.generateExcelCellRef(projectId, docType)
      cellRefs.value[docType] = prettify(res.json)
      analyticsClient.trackAction('admin_document_number', `generate_${docType.toLowerCase()}_cell_ref`, 'success')
      alert(
        res.converged
          ? `셀 좌표가 생성되었습니다. (iterations: ${res.iterations})`
          : `셀 좌표 생성이 수렴하지 않았습니다. 결과를 검토 후 수정·저장해주세요. (iterations: ${res.iterations})`,
      )
    } catch (error: unknown) {
      console.error('셀 좌표 생성 실패:', error)
      analyticsClient.trackAction('admin_document_number', `generate_${docType.toLowerCase()}_cell_ref`, 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isGeneratingCellRef.value[docType] = false
    }
  }

  async function uploadMirTemplate(projectId: string, file: File) {
    try {
      await ensureExists(projectId)
      const res = await docConfigApi.uploadTemplate(projectId, 'MIR', file)
      mirTemplateUrl.value = res.mirTemplateUrl
      analyticsClient.trackAction('admin_document_number', 'upload_mir_template', 'success')
      alert('템플릿이 업로드되었습니다.')
    } catch (error: unknown) {
      console.error('템플릿 업로드 실패:', error)
      analyticsClient.trackAction('admin_document_number', 'upload_mir_template', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  return {
    isLoading,
    isSaving,
    isSavingCellRef,
    isGeneratingCellRef,
    exists,
    prompts,
    cellRefs,
    mirTemplateUrl,
    load,
    save,
    saveCellRef,
    generateCellRef,
    uploadMirTemplate,
  }
}
