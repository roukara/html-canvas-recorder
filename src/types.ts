// ==== Canvas Information ====
export type CanvasInfo = {
  id: string
  frameId?: number
  frameUrl?: string
  width: number
  height: number
  isVisible: boolean
  x: number
  y: number
  zIndex?: string
  domId?: string
  classes?: string[]
  role?: string | null
  ariaLabel?: string | null
  thumb?: string | null
  tainted?: boolean
}

export type EncodingMode = 'mediarecorder' | 'webcodecs'

/**
 * Why something failed, decided where the failure happens. The popup used to
 * guess this by matching substrings of the message, which produced confident
 * advice for causes nobody had established.
 */
export type ErrorCode =
  | 'canvas-missing'
  | 'capture-unsupported'
  | 'encoder-unavailable'
  | 'cross-origin-tainted'
  | 'no-canvas-selected'
  | 'no-content-script'
  | 'already-recording'
  | 'not-recording'
  | 'save-failed'

// ==== Recording Status ====
// The recorder distinguishes these phases; the popup must not collapse them.
// 'pending' = start delay is running, nothing has been captured yet.
export type RecordingPhase = 'idle' | 'pending' | 'recording' | 'paused'

export type RecordingStatus =
  | { phase: 'idle' }
  | { phase: 'pending'; id: string; remainingMs: number }
  | { phase: 'recording'; id: string; elapsedMs: number }
  | { phase: 'paused'; id: string; elapsedMs: number }

// ==== Message Types ====
// Popup → Content
export type ToContent =
  | { type: 'GET_CANVASES' }
  | { type: 'GET_RECORDING_STATUS' }
  | { type: 'HIGHLIGHT'; id: string | null }
  | { type: 'SHOW_BADGES'; show: boolean }
  | { type: 'START_PICKER' }
  | { type: 'STOP_PICKER' }
  | { type: 'SAVE_SNAPSHOT'; id: string }
  | {
      type: 'START'
      id: string
      fps: number
      mime?: string
      videoBitsPerSecond?: number
      maxDurationSec?: number
      encodingMode?: EncodingMode
      startDelaySec?: number
    }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }

// Content → Popup
export type FromContent =
  | { type: 'CANVASES'; canvases: CanvasInfo[] }
  | { type: 'RECORDING_STATUS'; status: RecordingStatus }
  | { type: 'RECORDING_PENDING' }
  | { type: 'RECORDING_STARTED' }
  | { type: 'RECORDING_PAUSED' }
  | { type: 'RECORDING_RESUMED' }
  | { type: 'RECORDING_CANCELLED' }
  | { type: 'RECORDING_STOPPED'; fileName: string; mime: string }
  | { type: 'SNAPSHOT_SAVED'; fileName: string }
  | { type: 'CANVAS_PICKED'; canvas: CanvasInfo }
  | { type: 'PICKER_CANCELLED' }
  | { type: 'ERROR'; message: string; code?: ErrorCode }
  | { type: 'ACK' }

type WithType<T extends string> = { type: T }

const isRecordingStatus = (value: unknown): value is RecordingStatus => {
  if (!value || typeof value !== 'object') return false
  const payload = value as {
    phase?: unknown
    id?: unknown
    remainingMs?: unknown
    elapsedMs?: unknown
  }
  switch (payload.phase) {
    case 'idle':
      return true
    case 'pending':
      return (
        typeof payload.id === 'string' && typeof payload.remainingMs === 'number'
      )
    case 'recording':
    case 'paused':
      return (
        typeof payload.id === 'string' && typeof payload.elapsedMs === 'number'
      )
    default:
      return false
  }
}

export const isFromContentMessage = (value: unknown): value is FromContent => {
  if (!value || typeof value !== 'object') return false
  const type = (value as WithType<string>).type
  switch (type) {
    case 'CANVASES':
      return Array.isArray((value as { canvases?: unknown }).canvases)
    case 'RECORDING_STATUS':
      return isRecordingStatus((value as { status?: unknown }).status)
    case 'RECORDING_PENDING':
      return true
    case 'RECORDING_STARTED':
      return true
    case 'RECORDING_PAUSED':
      return true
    case 'RECORDING_RESUMED':
      return true
    case 'RECORDING_CANCELLED':
      return true
    case 'RECORDING_STOPPED': {
      const payload = value as { fileName?: unknown; mime?: unknown }
      return (
        typeof payload.fileName === 'string' && typeof payload.mime === 'string'
      )
    }
    case 'ERROR':
      return typeof (value as { message?: unknown }).message === 'string'
    case 'SNAPSHOT_SAVED':
      return typeof (value as { fileName?: unknown }).fileName === 'string'
    case 'CANVAS_PICKED':
      return !!(value as { canvas?: unknown }).canvas
    case 'PICKER_CANCELLED':
      return true
    case 'ACK':
      return true
    default:
      return false
  }
}

// ==== Auto-Recording (ARM: Auto-Record on next page load) ====
export type AutoArmConfig = {
  enabled: boolean // Reservation ON
  once?: boolean // One time only
  host?: string // Target host restriction
  selector?: string // CSS selector (fallback if empty)
  strategy?: 'css' | 'largest' | 'first'
  fps: number
  mime?: string
  videoBitsPerSecond?: number
  maxDurationSec?: number // Auto-stop (optional)
  ts?: number // Reservation timestamp
}

export const AUTO_ARM_KEY = 'auto_arm'
