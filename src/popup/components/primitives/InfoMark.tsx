import { useId, useRef, useState } from 'react'
import { Info } from '../../icons'
import { t } from '../../utils/messages'

interface InfoMarkProps {
  content: string
}

export function InfoMark({ content }: InfoMarkProps) {
  const tooltipId = useId()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  const show = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(true), 300)
  }
  const showNow = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    setVisible(true)
  }
  const hide = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <span className="info-mark" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-label={t('moreInfo')}
        aria-describedby={visible ? tooltipId : undefined}
        aria-expanded={visible}
        className="button button--icon button--ghost-icon button--static info-mark__button"
        onClick={showNow}
        onFocus={showNow}
        onBlur={hide}
      >
        <Info size={12} />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        data-open={visible}
        className="info-mark__tooltip"
      >
        {content}
      </span>
    </span>
  )
}
