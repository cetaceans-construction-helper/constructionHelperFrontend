// GET /api/auth/me 응답
export interface User {
  id: string
  userEmail: string
  userName: string
  systemRole: string
  profileImageUrl: string | null
  jobTitle: string | null
  companyName: string | null
}

// POST /api/auth/login 요청 (RSA 암호화 전송)
export interface LoginCredentials {
  encryptedEmail: string
  encryptedPassword: string
}

// POST /api/auth/signup 요청 (RSA 암호화 전송)
export interface SignupCredentials {
  encryptedEmail: string
  encryptedPassword: string
  encryptedPasswordConfirm: string
  userName: string
  phoneNumber: string
  jobTitle?: string
  companyId?: string
}

// GET /api/company/companyList 응답
export interface Company {
  id: string
  companyName: string
}

// POST /api/auth/login, /api/auth/signup, /api/auth/refresh 응답
export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  jobTitle: string | null
  companyName: string | null
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

export type FieldErrors = Record<string, string>
