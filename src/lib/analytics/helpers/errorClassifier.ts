import { ValidationError } from '@/api/client'

export type AuthErrorType = 'validation' | 'network' | 'server' | 'unknown'

export function getAuthErrorType(error: unknown): AuthErrorType {
  if (error instanceof ValidationError) {
    return 'validation'
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return 'network'
    }
    return 'server'
  }

  return 'unknown'
}

