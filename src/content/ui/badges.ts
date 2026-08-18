import {
  ensureCanvasIds,
  getCanvasRecorderId,
  queryTrackedCanvases,
} from '../canvas/dom'
import { BADGES_CONTAINER_ID } from '../utils/dom'
import { OVERLAY_HALO, OVERLAY_ON_DARK, OVERLAY_SELECTED } from './palette'

/** badges (number labels) */
let badgesContainer: HTMLDivElement | null = null
let badgesVisible = false
let badgeEntries: Array<{
  el: HTMLCanvasElement
  badge: HTMLDivElement
}> = []

const ensureBadgesContainer = () => {
  if (badgesContainer) return
  badgesContainer = document.getElementById(
    BADGES_CONTAINER_ID,
  ) as HTMLDivElement | null
  if (!badgesContainer) {
    const div = document.createElement('div')
    div.id = BADGES_CONTAINER_ID
    Object.assign(div.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2147483646',
    } as CSSStyleDeclaration)
    document.documentElement.appendChild(div)
    badgesContainer = div
  }
}

const clearBadges = () => {
  badgesContainer?.remove()
  badgesContainer = null
  badgeEntries = []
}

export const updateBadgesPositions = () => {
  if (!badgesContainer) return
  if (!badgesVisible) return
  badgeEntries.forEach(({ el, badge }) => {
    if (!el.isConnected) {
      badge.style.display = 'none'
      return
    }
    const r = el.getBoundingClientRect()
    const x = Math.max(0, r.left),
      y = Math.max(0, r.top)
    badge.style.transform = `translate(${x + 4}px, ${y + 4}px)`
    badge.style.display = r.width > 0 && r.height > 0 ? 'block' : 'none'
  })
}

export const showBadges = (show: boolean) => {
  badgesVisible = show
  if (!show) {
    clearBadges()
    return
  }
  ensureCanvasIds()
  ensureBadgesContainer()
  if (!badgesContainer) return
  // Captured so the null check still holds inside the callback below.
  const container = badgesContainer
  container.innerHTML = ''
  badgeEntries = []
  const nodes = queryTrackedCanvases()
  nodes.forEach((el) => {
    const id = getCanvasRecorderId(el)
    if (!id) return
    const r = el.getBoundingClientRect()
    const badge = document.createElement('div')
    badge.dataset.cid = id
    badge.textContent = `#${id}`
    Object.assign(badge.style, {
      position: 'absolute',
      transform: `translate(${Math.max(0, r.left) + 4}px, ${Math.max(0, r.top) + 4}px)`,
      background: OVERLAY_SELECTED,
      color: OVERLAY_ON_DARK,
      fontSize: '12px',
      lineHeight: '18px',
      padding: '0 6px',
      borderRadius: '9999px',
      fontFamily: 'ui-sans-serif, system-ui, Arial',
      pointerEvents: 'none',
      boxShadow: `0 0 0 1px ${OVERLAY_HALO}`,
    } as CSSStyleDeclaration)
    container.appendChild(badge)
    badgeEntries.push({ el, badge })
  })
  // Note: addGlobalListeners will be handled by highlighter module
  updateBadgesPositions()
}
