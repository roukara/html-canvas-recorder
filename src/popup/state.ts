import type {
  CanvasInfo,
  EncodingMode,
  ErrorCode,
  RecordingPhase,
} from '../types'

export interface AppState {
  tabId: number | null
  fps: number
  bitratePreset: number
  mime: string
  encodingMode: EncodingMode
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
  /** Read from the recorder itself, never inferred from the popup's own actions. */
  phase: RecordingPhase
  /** Frame the recorder is running in; null when nothing is running. */
  recordingFrameId: number | null
  /** Remaining start delay in ms. Only meaningful while phase is 'pending'. */
  pendingRemainingMs: number
  /** Real captured duration in ms, from the recorder. Null when nothing is captured. */
  elapsedMs: number | null
  lastSaved: string | null
  error: string | null
  /** Null when the cause is genuinely unknown; never guessed from the text. */
  errorCode: ErrorCode | null
  /** Frames that did not answer the last scan. */
  unreadableFrames: number
}

type Listener = (state: AppState) => void

let _state: AppState = {
  tabId: null,
  fps: 60,
  bitratePreset: 8_000_000,
  mime: '',
  encodingMode: 'mediarecorder',
  autoStopSec: 0,
  startDelaySec: 0,
  settingsHost: null,
  siteSettingsEnabled: false,
  canvasList: [],
  pickedCanvas: null,
  scanning: false,
  picking: false,
  phase: 'idle',
  recordingFrameId: null,
  pendingRemainingMs: 0,
  elapsedMs: null,
  lastSaved: null,
  error: null,
  errorCode: null,
  unreadableFrames: 0,
}

const listeners = new Set<Listener>()

export function getState(): AppState {
  return _state
}

export function setState(patch: Partial<AppState>): void {
  _state = { ..._state, ...patch }
  for (const fn of listeners) fn(_state)
}

/** Message and cause move together, so a stale code can never outlive its error. */
export function setError(message: string, code?: ErrorCode): void {
  setState({ error: message, errorCode: code ?? null })
}

export function clearError(): void {
  setState({ error: null, errorCode: null })
}

/** phase !== 'idle': a recording is armed or running, so selection is locked. */
export function isBusy(state: AppState): boolean {
  return state.phase !== 'idle'
}

/** Frames are actually being captured (or a capture is paused mid-way). */
export function isCapturing(state: AppState): boolean {
  return state.phase === 'recording' || state.phase === 'paused'
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
