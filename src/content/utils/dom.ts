/** DOM constants */
export const CANVAS_ATTR = 'data-canvas-recorder-id'
export const HIGHLIGHT_ID = '__crx_canvas_highlight__'
export const BADGES_CONTAINER_ID = '__crx_canvas_badges__'
export const COUNTDOWN_ID = '__crx_canvas_countdown__'

/** utils */
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n))

export const getMeta = (
  el: HTMLCanvasElement,
  rect: DOMRectReadOnly = el.getBoundingClientRect(),
) => {
  const cs = getComputedStyle(el)
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    zIndex: cs.zIndex || '',
    domId: el.id || '',
    classes: Array.from(el.classList).slice(0, 4),
    role: el.getAttribute('role'),
    ariaLabel: el.getAttribute('aria-label'),
  }
}

export const makeThumbAndDetectTaint = (
  el: HTMLCanvasElement,
  rect: DOMRectReadOnly = el.getBoundingClientRect(),
): { thumb: string | null; tainted: boolean } => {
  try {
    const w = el.width || Math.round(rect.width)
    const h = el.height || Math.round(rect.height)
    if (!w || !h) return { thumb: null, tainted: false }
    const maxW = 160,
      maxH = 100
    const scale = Math.min(maxW / w, maxH / h, 1)
    const tw = clamp(Math.round(w * scale), 1, maxW)
    const th = clamp(Math.round(h * scale), 1, maxH)
    const c = document.createElement('canvas')
    c.width = tw
    c.height = th
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return { thumb: null, tainted: false }
    ctx.drawImage(el, 0, 0, tw, th)
    return { thumb: c.toDataURL('image/webp', 0.6), tainted: false }
  } catch {
    return { thumb: null, tainted: true }
  }
}
