import type { CanvasInfo, EncodingMode } from '../types'

export interface AppState {
  tabId: number | null
  fps: number
  bitratePreset: number
  mime: string
  encodingMode: EncodingMode
  pump: boolean
  autoStopSec: number
  startDelaySec: number
  settingsHost: string | null
  siteSettingsEnabled: boolean
  canvasList: CanvasInfo[]
  pickedCanvas: {
    id: string
    frameId: number
    width: number
    height: number
  } | null
  scanning: boolean
  picking: boolean
  recording: boolean
  paused: boolean
  lastSaved: string | null
  error: string | null
}

type Listener = (state: AppState) => void

let _state: AppState = {
  tabId: null,
  fps: 60,
  bitratePreset: 8_000_000,
  mime: '',
  encodingMode: 'mediarecorder',
  pump: false,
  autoStopSec: 0,
  startDelaySec: 0,
  settingsHost: null,
  siteSettingsEnabled: false,
  canvasList: [],
  pickedCanvas: null,
  scanning: false,
  picking: false,
  recording: false,
  paused: false,
  lastSaved: null,
  error: null,
}

const listeners = new Set<Listener>()

export function getState(): AppState {
  return _state
}

export function setState(patch: Partial<AppState>): void {
  _state = { ..._state, ...patch }
  for (const fn of listeners) fn(_state)
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
