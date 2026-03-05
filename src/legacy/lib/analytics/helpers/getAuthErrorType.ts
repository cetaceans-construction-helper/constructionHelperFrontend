import { ValidationError } from '@/api/client'

export type AuthErrorType = 'validation' | 'network' | 'server' | 'unknown'

export const getAuthErrorType = (error: unknown): AuthErrorType => {
  if (error instanceof ValidationError) return 'validation'

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('network') || message.includes('timeout')) {
      return 'network'
    }

    if (
      message.includes('server') ||
      message.includes('internal') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return 'server'
    }
  }

  return 'unknown'
}
