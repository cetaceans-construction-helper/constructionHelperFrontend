import client, { setAccessToken } from './auth-client'
import type {
  SignupCredentials,
  TokenResponse,
  User,
} from '@/features/auth/model/auth-types'
import { importPublicKey, rsaEncrypt } from '@/shared/utils/rsa-encrypt'

export const authApi = {
  async getPublicKey(): Promise<string> {
    const { data } = await client.get<string>('/getPublicKey')
    return data
  },

  async login(email: string, password: string): Promise<User> {
    // 공개키 조회 → RSA 암호화 → 로그인 → 토큰 저장 → 사용자 정보 조회
    const publicKeyPem = await this.getPublicKey()
    const cryptoKey = await importPublicKey(publicKeyPem)

    const body = {
      encryptedEmail: await rsaEncrypt(cryptoKey, email),
      encryptedPassword: await rsaEncrypt(cryptoKey, password),
    }

    const { data: tokenData } = await client.post<TokenResponse>('/login', body)
    setAccessToken(tokenData.accessToken)
    const { data: user } = await client.get<User>('/me')
    return user
  },

  async signup(params: {
    email: string
    password: string
    passwordConfirm: string
    userName: string
    phoneNumber: string
    jobTitle?: string
    companyId?: string
  }): Promise<TokenResponse> {
    const publicKeyPem = await this.getPublicKey()
    const cryptoKey = await importPublicKey(publicKeyPem)

    const body: SignupCredentials = {
      encryptedEmail: await rsaEncrypt(cryptoKey, params.email),
      encryptedPassword: await rsaEncrypt(cryptoKey, params.password),
      encryptedPasswordConfirm: await rsaEncrypt(cryptoKey, params.passwordConfirm),
      userName: params.userName,
      phoneNumber: params.phoneNumber,
      jobTitle: params.jobTitle,
      companyId: params.companyId,
    }

    const { data } = await client.post<TokenResponse>('/signup', body)
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
