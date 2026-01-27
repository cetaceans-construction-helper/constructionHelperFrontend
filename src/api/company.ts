import axios from 'axios'
import type { Company } from '@/types/auth'

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const companyApi = {
  async getCompanies(): Promise<Company[]> {
    const { data } = await client.get<Company[]>('/company/getCompanyList')
    return data
  },
}
