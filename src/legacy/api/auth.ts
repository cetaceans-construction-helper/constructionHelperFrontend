import client, { setAccessToken } from './client'
import type { LoginCredentials, SignupCredentials, TokenResponse, User } from '@/types/auth'

export const authApi = {
  async login(credentials: LoginCredentials): Promise<User> {
    // 로그인 → 토큰 저장 → 사용자 정보 조회
    const { data: tokenData } = await client.post<TokenResponse>('/login', credentials)
    setAccessToken(tokenData.accessToken)
    const { data: user } = await client.get<User>('/me')
    return user
  },

  async signup(credentials: SignupCredentials): Promise<TokenResponse> {
    const { data } = await client.post<TokenResponse>('/signup', credentials)
    return data
  },

  async logout(): Promise<void> {
    await client.post('/logout')
    setAccessToken(null)
  },

  async refresh(): Promise<TokenResponse> {
    const { data } = await client.post<TokenResponse>('/refresh')
    setAccessToken(data.accessToken)
    return data
  },

  async me(): Promise<User> {
    const { data } = await client.get<User>('/me')
    return data
  },
}
