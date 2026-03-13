import { ref, onMounted } from 'vue'
import type { HomepageCredentials, TomorrowWorkMode } from '@/features/project-admin/homepage-setting/model/homepage-setting-types'
import { HOMEPAGE_CREDENTIALS_KEY } from '@/features/project-admin/homepage-setting/model/homepage-setting-types'

export const useHomepageSetting = () => {
  const id = ref('')
  const password = ref('')
  const url = ref('')
  const safetyCheck = ref('')
  const tomorrowWorkMode = ref<TomorrowWorkMode>(1)
  const isSaved = ref(false)

  const load = () => {
    const raw = localStorage.getItem(HOMEPAGE_CREDENTIALS_KEY)
    if (!raw) return
    try {
      const creds: HomepageCredentials = JSON.parse(raw)
      id.value = creds.id
      password.value = creds.password
      url.value = creds.url
      safetyCheck.value = creds.safetyCheck ?? ''
      tomorrowWorkMode.value = creds.tomorrowWorkMode ?? 1
      isSaved.value = true
    } catch {
      // ignore parse errors
    }
  }

  const save = () => {
    const creds: HomepageCredentials = {
      id: id.value,
      password: password.value,
      url: url.value,
      safetyCheck: safetyCheck.value,
      tomorrowWorkMode: tomorrowWorkMode.value,
    }
    localStorage.setItem(HOMEPAGE_CREDENTIALS_KEY, JSON.stringify(creds))
    isSaved.value = true
    alert('저장되었습니다.')
  }

  onMounted(() => {
    load()
  })

  return { id, password, url, safetyCheck, tomorrowWorkMode, isSaved, save }
}
