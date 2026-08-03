import type { CanvasInfo, FromContent } from '../../types'
import { getMeta, makeThumbAndDetectTaint } from '../utils/dom'
import { ensureCanvasIds, getCanvasRecorderId } from './dom'
import { startHighlight, stopHighlight } from './highlighter'

let active = false
let hoveredId: string | null = null
let previousCursor = ''

function canvasFromEvent(event: Event): HTMLCanvasElement | null {
  const path = event.composedPath()
  return (
    path.find((node): node is HTMLCanvasElement => node instanceof HTMLCanvasElement) ??
    null
  )
}

function infoForCanvas(canvas: HTMLCanvasElement): CanvasInfo | null {
  const id = getCanvasRecorderId(canvas)
  if (!id) return null
  const rect = canvas.getBoundingClientRect()
  const meta = getMeta(canvas, rect)
  const isVisible = rect.width > 0 && rect.height > 0
  const probe = isVisible
    ? makeThumbAndDetectTaint(canvas, rect)
    : { thumb: null, tainted: undefined }
  return {
    id,
    width: canvas.width || Math.round(rect.width),
    height: canvas.height || Math.round(rect.height),
    isVisible,
    x: meta.x,
    y: meta.y,
    zIndex: meta.zIndex,
    domId: meta.domId,
    classes: meta.classes,
    role: meta.role,
    ariaLabel: meta.ariaLabel,
    thumb: probe.thumb,
    tainted: probe.tainted,
  }
}

function sendMessage(message: FromContent): void {
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // popup/background may be unavailable
  }
}

function setHoveredCanvas(canvas: HTMLCanvasElement | null): void {
  const id = canvas ? getCanvasRecorderId(canvas) : null
  if (id === hoveredId) return
  hoveredId = id
  if (id) startHighlight(id)
  else stopHighlight()
}

function handlePointerMove(event: PointerEvent): void {
  if (!active) return
  setHoveredCanvas(canvasFromEvent(event))
}

function handleClick(event: MouseEvent): void {
  if (!active) return
  ensureCanvasIds()
  const canvas = canvasFromEvent(event)
  if (!canvas) return
  const info = infoForCanvas(canvas)
  if (!info) return
  event.preventDefault()
  event.stopPropagation()
  stopCanvasPicker()
  sendMessage({ type: 'CANVAS_PICKED', canvas: info })
}

function handleKeyDown(event: KeyboardEvent): void {
  if (!active || event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  stopCanvasPicker()
  sendMessage({ type: 'PICKER_CANCELLED' })
}

export function startCanvasPicker(): void {
  if (active) return
  ensureCanvasIds()
  active = true
  hoveredId = null
  previousCursor = document.documentElement.style.cursor
  document.documentElement.style.cursor = 'crosshair'
  document.addEventListener('pointermove', handlePointerMove, true)
  document.addEventListener('click', handleClick, true)
  document.addEventListener('keydown', handleKeyDown, true)
}

export function stopCanvasPicker(): void {
  if (!active) return
  active = false
  hoveredId = null
  document.documentElement.style.cursor = previousCursor
  document.removeEventListener('pointermove', handlePointerMove, true)
  document.removeEventListener('click', handleClick, true)
  document.removeEventListener('keydown', handleKeyDown, true)
  stopHighlight()
}
