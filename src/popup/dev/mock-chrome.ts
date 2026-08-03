/*
  Minimal Chrome API mock to preview the popup via Vite dev server.
  Provides just enough behavior used by the popup hooks/components.
*/

import type { FromContent, ToContent } from '../../types'

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

function createTabs(runtime: ReturnType<typeof createRuntime>) {
  const activeTab: MockTab = { id: 999, url: 'https://example.com/' }
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
        case 'PAUSE':
          runtime.__emit({ type: 'RECORDING_PAUSED' })
          return { type: 'RECORDING_PAUSED' }
        case 'RESUME':
          runtime.__emit({ type: 'RECORDING_RESUMED' })
          return { type: 'RECORDING_RESUMED' }
        case 'START': {
          // Notify popup as if recording started, then stopped shortly after
          setTimeout(() => runtime.__emit({ type: 'RECORDING_STARTED' }), 200)
          setTimeout(
            () =>
              runtime.__emit({
                type: 'RECORDING_STOPPED',
                fileName: `mock-${nowStamp()}.webm`,
                mime: 'video/webm',
              }),
            1500,
          )
          return { type: 'RECORDING_STARTED' }
        }
        case 'STOP': {
          // Stop immediately
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
