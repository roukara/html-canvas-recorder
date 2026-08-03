import { COUNTDOWN_ID } from '../utils/dom'

let countdownContainer: HTMLDivElement | null = null

const ensureCountdownContainer = () => {
  if (countdownContainer) return
  countdownContainer = document.getElementById(
    COUNTDOWN_ID,
  ) as HTMLDivElement | null
  if (!countdownContainer) {
    const div = document.createElement('div')
    div.id = COUNTDOWN_ID
    div.setAttribute('role', 'status')
    div.setAttribute('aria-live', 'polite')
    Object.assign(div.style, {
      position: 'fixed',
      inset: '0',
      display: 'grid',
      placeItems: 'center',
      pointerEvents: 'none',
      zIndex: '2147483647',
      fontFamily: 'ui-sans-serif, system-ui, Arial',
    } as CSSStyleDeclaration)

    const badge = document.createElement('div')
    badge.dataset.role = 'countdown-value'
    Object.assign(badge.style, {
      minWidth: '4.5rem',
      height: '4.5rem',
      display: 'grid',
      placeItems: 'center',
      borderRadius: '9999px',
      background: 'rgba(17, 24, 39, .92)',
      color: '#fff',
      fontSize: '2rem',
      fontWeight: '700',
      lineHeight: '1',
      fontVariantNumeric: 'tabular-nums',
      boxShadow: '0 8px 24px rgba(0, 0, 0, .28)',
    } as CSSStyleDeclaration)
    div.appendChild(badge)

    document.documentElement.appendChild(div)
    countdownContainer = div
  }
}

export const showCountdown = (remainingSec: number) => {
  ensureCountdownContainer()
  const badge = countdownContainer?.firstElementChild as HTMLDivElement | null
  if (!badge) return
  const display = String(Math.max(1, Math.ceil(remainingSec)))
  badge.textContent = display
  countdownContainer?.setAttribute(
    'aria-label',
    `Recording starts in ${display} seconds`,
  )
}

export const hideCountdown = () => {
  countdownContainer?.remove()
  countdownContainer = null
}
