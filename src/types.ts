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

// ==== Message Types ====
// Popup → Content
export type ToContent =
  | { type: 'GET_CANVASES' }
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
      pumpFrames?: boolean
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
  | { type: 'RECORDING_PENDING' }
  | { type: 'RECORDING_STARTED' }
  | { type: 'RECORDING_PAUSED' }
  | { type: 'RECORDING_RESUMED' }
  | { type: 'RECORDING_CANCELLED' }
  | { type: 'RECORDING_STOPPED'; fileName: string; mime: string }
  | { type: 'SNAPSHOT_SAVED'; fileName: string }
  | { type: 'CANVAS_PICKED'; canvas: CanvasInfo }
  | { type: 'PICKER_CANCELLED' }
  | { type: 'ERROR'; message: string }
  | { type: 'ACK' }

type WithType<T extends string> = { type: T }

export const isFromContentMessage = (value: unknown): value is FromContent => {
  if (!value || typeof value !== 'object') return false
  const type = (value as WithType<string>).type
  switch (type) {
    case 'CANVASES':
      return Array.isArray((value as { canvases?: unknown }).canvases)
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
  pumpFrames?: boolean
  maxDurationSec?: number // Auto-stop (optional)
  ts?: number // Reservation timestamp
}

export const AUTO_ARM_KEY = 'auto_arm'
