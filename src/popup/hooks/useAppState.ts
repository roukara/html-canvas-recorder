import { useSyncExternalStore } from 'react'
import type { AppState } from '../state'
import { getState, subscribe } from '../state'

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
}
