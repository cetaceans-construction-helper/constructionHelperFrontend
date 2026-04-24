import apiClient from '@/shared/network-core/apiClient'

export const fileApi = {
  async downloadByKey(key: string): Promise<Blob> {
    const { data } = await apiClient.get<Blob>('/file/downloadFile', {
      params: { key },
      responseType: 'blob',
    })
    return data
  },

  async objectUrlByKey(key: string): Promise<string> {
    const blob = await fileApi.downloadByKey(key)
    return URL.createObjectURL(blob)
  },
}
