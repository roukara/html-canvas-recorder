import type { CanvasInfo } from '../../types'
import { getMeta, makeThumbAndDetectTaint } from '../utils/dom'
import {
  ensureCanvasIds,
  getCanvasRecorderId,
  queryTrackedCanvases,
} from './dom'

type CanvasEntry = {
  el: HTMLCanvasElement
  rect: DOMRectReadOnly
  isVisible: boolean
}

export const listCanvases = (): CanvasInfo[] => {
  ensureCanvasIds()
  const entries = queryTrackedCanvases().map((el): CanvasEntry => {
    const rect = el.getBoundingClientRect()
    return {
      el,
      rect,
      isVisible: rect.width > 0 && rect.height > 0,
    }
  })
  const visibles: CanvasEntry[] = [],
    hiddens: CanvasEntry[] = []
  entries.forEach((entry) => {
    ;(entry.isVisible ? visibles : hiddens).push(entry)
  })
  const order = [...visibles, ...hiddens]

  const thumbsQuota = 12
  const out: CanvasInfo[] = []
  for (let i = 0; i < order.length; i++) {
    const { el, rect, isVisible } = order[i]
    const id = getCanvasRecorderId(el)
    if (!id) continue
    const meta = getMeta(el, rect)
    let thumb: string | null = null
    let tainted: boolean | undefined
    if (i < thumbsQuota && isVisible) {
      const probe = makeThumbAndDetectTaint(el, rect)
      thumb = probe.thumb
      tainted = probe.tainted
    }
    out.push({
      id,
      width: el.width || Math.round(rect.width),
      height: el.height || Math.round(rect.height),
      isVisible,
      x: meta.x,
      y: meta.y,
      zIndex: meta.zIndex,
      domId: meta.domId,
      classes: meta.classes,
      role: meta.role,
      ariaLabel: meta.ariaLabel,
      thumb,
      tainted,
    })
  }
  return out
}
