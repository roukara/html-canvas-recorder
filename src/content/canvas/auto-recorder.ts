import type { AutoArmConfig } from '../../types'
import { AUTO_ARM_KEY } from '../../types'
import { startRecording } from './recorder'
import {
  ensureCanvasIds,
  getCanvasRecorderId,
  getLargestCanvas,
  hasPositiveCanvasSize,
  queryCanvases,
} from './dom'

const AUTO_ARM_TTL_MS = 30 * 60 * 1000

export function initAutoArmBoot() {
  chrome.storage.local.get({ [AUTO_ARM_KEY]: null }, (obj) => {
    const cfg = obj[AUTO_ARM_KEY] as AutoArmConfig | null
    if (!cfg?.enabled) return
    if (cfg.host && location.host !== cfg.host) return
    if (cfg.ts && Date.now() - cfg.ts > AUTO_ARM_TTL_MS) {
      chrome.storage.local.set({ [AUTO_ARM_KEY]: { ...cfg, enabled: false } })
      return
    }
    autoStartWithConfig(cfg)
  })
}

function autoStartWithConfig(cfg: AutoArmConfig) {
  let resizeObserver: ResizeObserver | null = null
  let timeoutId: number | null = null
  let stopped = false

  const pickCanvas = (): HTMLCanvasElement | null => {
    ensureCanvasIds()
    if (cfg.selector) {
      const found = queryCanvases().filter((canvas) =>
        canvas.matches(cfg.selector || ''),
      )
      if (found.length) {
        const vis = found.filter(hasPositiveCanvasSize)
        return vis.length ? getLargestCanvas(vis) : getLargestCanvas(found)
      }
      if (cfg.strategy === 'css') return null
    }
    const all = queryCanvases()
    if (!all.length) return null
    if (cfg.strategy === 'first') return all[0] || null
    const vis = all.filter(hasPositiveCanvasSize)
    return vis.length ? getLargestCanvas(vis) : getLargestCanvas(all)
  }

  const mo = new MutationObserver(tryStart)
  mo.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('DOMContentLoaded', tryStart, { once: true })
  window.addEventListener('pagehide', cleanup, { once: true })
  timeoutId = window.setTimeout(cleanup, getRemainingArmMs(cfg))
  tryStart()

  function tryStart() {
    if (stopped) return
    const el = pickCanvas()
    if (!el) return
    if (!hasPositiveCanvasSize(el)) {
      resizeObserver?.disconnect()
      resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect?.width && entries[0]?.contentRect?.height) {
          startNow(el)
        }
      })
      resizeObserver.observe(el)
      return
    }
    startNow(el)
  }

  function startNow(el: HTMLCanvasElement) {
    if (stopped) return
    cleanup()
    chrome.storage.local.set({ [AUTO_ARM_KEY]: { ...cfg, enabled: false } })

    ensureCanvasIds()
    const id = getCanvasRecorderId(el)
    if (!id) {
      console.warn('[canvas-recorder] auto-arm failed: canvas id was missing')
      return
    }

    startRecording(
      id,
      cfg.fps,
      cfg.mime,
      cfg.videoBitsPerSecond,
      cfg.pumpFrames,
      cfg.maxDurationSec,
    ).catch((error: unknown) => {
      console.warn('[canvas-recorder] auto-arm failed to start recording', error)
    })
  }

  function cleanup() {
    if (stopped) return
    stopped = true
    mo.disconnect()
    resizeObserver?.disconnect()
    resizeObserver = null
    window.removeEventListener('DOMContentLoaded', tryStart)
    window.removeEventListener('pagehide', cleanup)
    if (timeoutId != null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
}

function getRemainingArmMs(cfg: AutoArmConfig): number {
  return Math.max(0, AUTO_ARM_TTL_MS - (cfg.ts ? Date.now() - cfg.ts : 0))
}
