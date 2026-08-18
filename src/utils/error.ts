import type { ErrorCode } from '../types'

/** Carries the reason with the failure, so no one downstream has to infer it. */
export class RecorderError extends Error {
  readonly code: ErrorCode

  constructor(message: string, code: ErrorCode) {
    super(message)
    this.name = 'RecorderError'
    this.code = code
  }
}

export const errorCodeOf = (error: unknown): ErrorCode | undefined =>
  error instanceof RecorderError ? error.code : undefined

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
