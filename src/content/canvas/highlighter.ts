import { updateBadgesPositions } from '../ui/badges'
import { HIGHLIGHT_ID } from '../utils/dom'
import { ensureCanvasIds, findCanvasByRecorderId } from './dom'
import { RecorderError } from '../../utils/error'
import {
  OVERLAY_HALO,
  OVERLAY_RECORDING,
  OVERLAY_RECORDING_DIM,
  OVERLAY_SELECTED,
} from '../ui/palette'

/** UI state (content) */
let box: HTMLDivElement | null = null
let targetEl: HTMLCanvasElement | null = null
let raf = 0 as number
let resizeObs: ResizeObserver | null = null
let mutationObs: MutationObserver | null = null
let listening = false
let scheduled = false

// recording pulse state
let pulsing = false
let styleEl: HTMLStyleElement | null = null

/** highlight */
const ensureBox = () => {
  if (box) return
  box = document.getElementById(HIGHLIGHT_ID) as HTMLDivElement | null
  if (!box) {
    box = document.createElement('div')
    box.id = HIGHLIGHT_ID
    Object.assign(box.style, {
      position: 'fixed',
      border: `2px solid ${OVERLAY_SELECTED}`,
      borderRadius: '8px',
      pointerEvents: 'none',
      zIndex: '2147483647',
      boxShadow: `0 0 0 2px ${OVERLAY_HALO}`,
    } as CSSStyleDeclaration)
    document.documentElement.appendChild(box)
  }
  applyBoxStyle()
}

const ensurePulseStyles = () => {
  if (styleEl) return
  styleEl = document.createElement('style')
  styleEl.textContent = `
@keyframes __crx_recording_border_pulse {
  0%, 100% { border-color: ${OVERLAY_RECORDING}; }
  50% { border-color: ${OVERLAY_RECORDING_DIM}; }
}`
  document.documentElement.appendChild(styleEl)
}

const applyBoxStyle = () => {
  if (!box) return
  if (pulsing) {
    ensurePulseStyles()
    box.style.border = `2px solid ${OVERLAY_RECORDING}`
    box.style.boxShadow = `0 0 0 2px ${OVERLAY_HALO}`
    box.style.animation = '__crx_recording_border_pulse 2s ease infinite'
  } else {
    box.style.border = `2px solid ${OVERLAY_SELECTED}`
    box.style.boxShadow = `0 0 0 2px ${OVERLAY_HALO}`
    box.style.animation = ''
  }
}

const updateBox = () => {
  if (!box || !targetEl) return
  const r = targetEl.getBoundingClientRect()
  const visible = r.width > 0 && r.height > 0
  box.style.display = visible ? 'block' : 'none'
  if (!visible) return
  box.style.transform = `translate(${r.left}px, ${r.top}px)`
  box.style.width = r.width + 'px'
  box.style.height = r.height + 'px'
}

const addGlobalListeners = () => {
  if (listening) return
  listening = true
  document.addEventListener('scroll', scheduleUpdate, {
    capture: true,
    passive: true,
  })
  window.addEventListener('resize', scheduleUpdate, { passive: true })
  if (window.visualViewport) {
    window.visualViewport.addEventListener('scroll', scheduleUpdate, {
      passive: true,
    })
    window.visualViewport.addEventListener('resize', scheduleUpdate, {
      passive: true,
    })
  }
  mutationObs = new MutationObserver(scheduleUpdate)
  mutationObs.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}

const removeGlobalListeners = () => {
  if (!listening) return
  listening = false
  document.removeEventListener('scroll', scheduleUpdate, true)
  window.removeEventListener('resize', scheduleUpdate)
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('scroll', scheduleUpdate)
    window.visualViewport.removeEventListener('resize', scheduleUpdate)
  }
  mutationObs?.disconnect()
  mutationObs = null
}

const observeTarget = (el: Element | null) => {
  resizeObs?.disconnect()
  resizeObs = null
  if (!el) return
  const ro = new ResizeObserver(scheduleUpdate)
  resizeObs = ro
  ro.observe(el)
}

const scheduleUpdate = () => {
  if (scheduled) return
  scheduled = true
  raf = requestAnimationFrame(() => {
    raf = 0 as number
    scheduled = false
    updateBox()
    updateBadgesPositions()
  })
}

export const startHighlight = (id: string) => {
  ensureCanvasIds()
  const el = findCanvasByRecorderId(id)
  if (!el) throw new RecorderError('Canvas not found', 'canvas-missing')
  ensureBox()
  targetEl = el
  addGlobalListeners()
  observeTarget(el)
  cancelAnimationFrame(raf)
  raf = 0 as number
  scheduled = false
  updateBox()
  applyBoxStyle()
}

export const stopHighlight = () => {
  cancelAnimationFrame(raf)
  raf = 0 as number
  scheduled = false
  observeTarget(null)
  removeGlobalListeners()
  targetEl = null
  box?.remove()
  box = null
}

export const setHighlightPulsing = (on: boolean) => {
  pulsing = on
  applyBoxStyle()
}
