/*
  Minimal Chrome API mock to preview the popup via Vite dev server.
  Provides just enough behavior used by the popup hooks/components.
*/

import type { FromContent, RecordingStatus, ToContent } from '../../types'

type RuntimeMessage = FromContent
type RuntimeListener = (msg: RuntimeMessage) => void

function createRuntime() {
  const listeners = new Set<RuntimeListener>()
  return {
    onMessage: {
      addListener(fn: RuntimeListener) {
        listeners.add(fn)
      },
      removeListener(fn: RuntimeListener) {
        listeners.delete(fn)
      },
    },
    // helper for this mock to emit messages to popup
    __emit(msg: RuntimeMessage) {
      for (const fn of Array.from(listeners)) {
        try {
          fn(msg)
        } catch {
          // individual listeners are sandboxed
        }
      }
    },
  }
}

type StorageGetKeys =
  | string
  | string[]
  | Record<string, unknown>
  | null
  | undefined
type StorageGetCallback = (items: Record<string, unknown>) => void

function createStorage() {
  const ns = 'mock.chrome.storage.local.'
  const getVal = (k: string): unknown => {
    const v = localStorage.getItem(ns + k)
    return v ? JSON.parse(v) : undefined
  }
  const setVal = (k: string, v: unknown) => {
    localStorage.setItem(ns + k, JSON.stringify(v))
  }
  return {
    local: {
      async get(keys: StorageGetKeys, cb?: StorageGetCallback) {
        const out: Record<string, unknown> = {}
        if (Array.isArray(keys)) {
          for (const k of keys) out[k] = getVal(k)
        } else if (typeof keys === 'string') {
          out[keys] = getVal(keys)
        } else if (keys && typeof keys === 'object') {
          for (const k of Object.keys(keys)) {
            const stored = getVal(k)
            out[k] =
              stored === undefined
                ? (keys as Record<string, unknown>)[k]
                : stored
          }
        }
        cb?.(out)
        return out
      },
      async set(items: Record<string, unknown>, cb?: () => void) {
        for (const [k, v] of Object.entries(items)) setVal(k, v)
        cb?.()
      },
    },
  }
}

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

type MockTab = { id: number; url: string }
type QueryInfo = { active?: boolean; currentWindow?: boolean }
type SendMessageOptions = { frameId?: number }

/**
 * Mirrors the real recorder's phases so the preview cannot show a state the
 * extension could never be in.
 */
type MockRecorder = {
  phase: 'idle' | 'pending' | 'recording' | 'paused'
  startsAtMs: number
  startedAtMs: number
  pausedAtMs: number
  totalPausedMs: number
  id: string
}

const RECORDER_KEY = 'mock_recorder'

const idleRecorder = (): MockRecorder => ({
  phase: 'idle',
  startsAtMs: 0,
  startedAtMs: 0,
  pausedAtMs: 0,
  totalPausedMs: 0,
  id: '',
})

/**
 * The real recorder lives in the page and keeps running while the popup is
 * closed, so the mock survives a reload too. Reloading the preview is the
 * closest thing to closing and reopening the popup.
 */
function loadRecorder(): MockRecorder {
  try {
    const raw = sessionStorage.getItem(RECORDER_KEY)
    return raw ? { ...idleRecorder(), ...JSON.parse(raw) } : idleRecorder()
  } catch {
    return idleRecorder()
  }
}

function createTabs(runtime: ReturnType<typeof createRuntime>) {
  const activeTab: MockTab = { id: 999, url: 'https://example.com/' }
  const recorder: MockRecorder = loadRecorder()

  const saveRecorder = () => {
    try {
      sessionStorage.setItem(RECORDER_KEY, JSON.stringify(recorder))
    } catch {
      // preview only; ignore
    }
  }

  const resetRecorder = () => {
    Object.assign(recorder, idleRecorder())
    saveRecorder()
  }

  const recorderStatus = (): RecordingStatus => {
    // A pending start becomes a real recording once its delay elapses.
    if (recorder.phase === 'pending' && Date.now() >= recorder.startsAtMs) {
      recorder.phase = 'recording'
      recorder.startedAtMs = recorder.startsAtMs
      saveRecorder()
      runtime.__emit({ type: 'RECORDING_STARTED' })
    }
    switch (recorder.phase) {
      case 'idle':
        return { phase: 'idle' }
      case 'pending':
        return {
          phase: 'pending',
          id: recorder.id,
          remainingMs: Math.max(0, recorder.startsAtMs - Date.now()),
        }
      default: {
        const pausedNowMs =
          recorder.phase === 'paused' ? Date.now() - recorder.pausedAtMs : 0
        return {
          phase: recorder.phase,
          id: recorder.id,
          elapsedMs: Math.max(
            0,
            Date.now() -
              recorder.startedAtMs -
              recorder.totalPausedMs -
              pausedNowMs,
          ),
        }
      }
    }
  }

  return {
    async query(_queryInfo: QueryInfo, cb?: (tabs: MockTab[]) => void) {
      const result = [activeTab]
      cb?.(result)
      return result
    },
    async sendMessage(
      _tabId: number,
      msg: ToContent,
      options?: SendMessageOptions,
    ): Promise<FromContent> {
      const frameId = options?.frameId ?? 0
      // Simulate content-script responses
      switch (msg.type) {
        case 'GET_RECORDING_STATUS':
          return { type: 'RECORDING_STATUS', status: recorderStatus() }
        case 'GET_CANVASES':
          return {
            type: 'CANVASES',
            canvases:
              frameId === 0
                ? [
                    {
                      id: 'c1',
                      width: 800,
                      height: 450,
                      isVisible: true,
                      x: 20,
                      y: 40,
                      zIndex: '10',
                      domId: 'game',
                      classes: ['main', 'playfield'],
                      role: null,
                      ariaLabel: null,
                      thumb: null,
                      tainted: false,
                    },
                  ]
                : [
                    {
                      id: 'c1',
                      width: 300,
                      height: 150,
                      isVisible: true,
                      x: 120,
                      y: 140,
                      zIndex: 'auto',
                      domId: undefined,
                      classes: ['hud'],
                      role: 'img',
                      ariaLabel: 'preview',
                      thumb: null,
                      tainted: false,
                    },
                  ],
          }
        case 'HIGHLIGHT':
        case 'SHOW_BADGES':
        case 'START_PICKER':
        case 'STOP_PICKER':
          return { type: 'ACK' }
        case 'SAVE_SNAPSHOT':
          return {
            type: 'SNAPSHOT_SAVED',
            fileName: `mock-${nowStamp()}.png`,
          }
        case 'PAUSE': {
          if (recorder.phase !== 'recording') {
            return { type: 'ERROR', message: 'Not recording' }
          }
          recorder.phase = 'paused'
          recorder.pausedAtMs = Date.now()
          saveRecorder()
          runtime.__emit({ type: 'RECORDING_PAUSED' })
          return { type: 'RECORDING_PAUSED' }
        }
        case 'RESUME': {
          if (recorder.phase !== 'paused') {
            return { type: 'ERROR', message: 'Not paused' }
          }
          recorder.totalPausedMs += Date.now() - recorder.pausedAtMs
          recorder.pausedAtMs = 0
          recorder.phase = 'recording'
          saveRecorder()
          runtime.__emit({ type: 'RECORDING_RESUMED' })
          return { type: 'RECORDING_RESUMED' }
        }
        case 'START': {
          if (recorder.phase !== 'idle') {
            return { type: 'ERROR', message: 'Already recording' }
          }
          const delayMs = Math.max(0, Math.round((msg.startDelaySec ?? 0) * 1000))
          recorder.id = msg.id
          recorder.totalPausedMs = 0
          recorder.pausedAtMs = 0
          if (delayMs > 0) {
            recorder.phase = 'pending'
            recorder.startsAtMs = Date.now() + delayMs
            saveRecorder()
            runtime.__emit({ type: 'RECORDING_PENDING' })
            return { type: 'RECORDING_PENDING' }
          }
          recorder.phase = 'recording'
          recorder.startedAtMs = Date.now()
          saveRecorder()
          runtime.__emit({ type: 'RECORDING_STARTED' })
          return { type: 'RECORDING_STARTED' }
        }
        case 'STOP': {
          if (recorder.phase === 'idle') {
            return { type: 'ERROR', message: 'Not recording' }
          }
          // Cancelling a pending start produces no file.
          if (recorder.phase === 'pending') {
            resetRecorder()
            runtime.__emit({ type: 'RECORDING_CANCELLED' })
            return { type: 'ACK' }
          }
          resetRecorder()
          const payload: FromContent = {
            type: 'RECORDING_STOPPED',
            fileName: `mock-${nowStamp()}.webm`,
            mime: 'video/webm',
          }
          runtime.__emit(payload)
          return payload
        }
        default:
          return { type: 'ACK' }
      }
    },
    reload(_tabId?: number) {
      // no-op in preview
    },
  }
}

function createWebNavigation() {
  return {
    getAllFrames(
      _details: { tabId: number },
      cb: (frames?: Array<{ frameId: number; url: string }>) => void,
    ) {
      cb([
        { frameId: 0, url: 'https://example.com/' },
        { frameId: 7, url: 'https://embed.example.com/' },
      ])
    },
  }
}

type ChromeMock = {
  runtime: ReturnType<typeof createRuntime>
  storage: ReturnType<typeof createStorage>
  tabs: ReturnType<typeof createTabs>
  webNavigation: ReturnType<typeof createWebNavigation>
}

type GlobalWithMock = Omit<typeof globalThis, 'chrome'> & {
  chrome?: ChromeMock
}
;(function installMock() {
  const g = globalThis as unknown as GlobalWithMock
  const hasRealExtensionApis =
    typeof g.chrome !== 'undefined' &&
    typeof g.chrome?.tabs?.query === 'function' &&
    typeof g.chrome?.runtime?.onMessage?.addListener === 'function' &&
    typeof g.chrome?.storage?.local?.get === 'function'
  if (hasRealExtensionApis) return
  const runtime = createRuntime()
  const storage = createStorage()
  const tabs = createTabs(runtime)
  const webNavigation = createWebNavigation()
  g.chrome = { runtime, storage, tabs, webNavigation }
  console.info('[popup-dev] chrome API mocked for preview')
})()
