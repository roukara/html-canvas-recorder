import { CANVAS_ATTR } from '../utils/dom'

function walkOpenRoots(root: Document | ShadowRoot): HTMLCanvasElement[] {
  const canvases = Array.from(
    root.querySelectorAll('canvas'),
  ) as HTMLCanvasElement[]
  const shadowHosts = Array.from(root.querySelectorAll('*')).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && !!el.shadowRoot,
  )
  for (const host of shadowHosts) {
    if (host.shadowRoot) canvases.push(...walkOpenRoots(host.shadowRoot))
  }
  return canvases
}

export function queryCanvases(): HTMLCanvasElement[] {
  return walkOpenRoots(document)
}

export function ensureCanvasIds(): void {
  queryCanvases().forEach((canvas, index) => {
    if (!canvas.hasAttribute(CANVAS_ATTR)) {
      canvas.setAttribute(CANVAS_ATTR, String(index))
    }
  })
}

export function queryTrackedCanvases(): HTMLCanvasElement[] {
  return queryCanvases().filter((canvas) => canvas.hasAttribute(CANVAS_ATTR))
}

export function getCanvasRecorderId(canvas: HTMLCanvasElement): string | null {
  return canvas.getAttribute(CANVAS_ATTR)
}

export function findCanvasByRecorderId(
  id: string,
): HTMLCanvasElement | null {
  return (
    queryTrackedCanvases().find(
      (canvas) => canvas.getAttribute(CANVAS_ATTR) === id,
    ) ?? null
  )
}

export function hasPositiveCanvasSize(canvas: HTMLCanvasElement): boolean {
  const rect = canvas.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

export function getCanvasArea(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect()
  const width = canvas.width || Math.round(rect.width)
  const height = canvas.height || Math.round(rect.height)
  return width * height
}

export function getLargestCanvas(
  canvases: HTMLCanvasElement[],
): HTMLCanvasElement | null {
  return (
    canvases.slice().sort((a, b) => getCanvasArea(b) - getCanvasArea(a))[0] ??
    null
  )
}
