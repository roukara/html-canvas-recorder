import type { MouseEvent } from 'react'
import { Minus, Plus } from '../../icons'
import { t } from '../../utils/messages'

interface StepInputProps {
  id: string
  label: string
  /** null renders an empty field: nothing is set, and nothing is implied. */
  value: number | null
  min?: number
  step?: number
  shiftStep?: number
  disabled?: boolean
  onChange: (value: number) => void
}

export function StepInput({
  id,
  label,
  value,
  min,
  step = 1,
  shiftStep = 5,
  disabled,
  onChange,
}: StepInputProps) {
  const clamp = (n: number) => (min !== undefined ? Math.max(min, n) : n)
  const getStep = (event: MouseEvent) => (event.shiftKey ? shiftStep : step)
  const current = value ?? min ?? 0

  return (
    <div className="step-input">
      <button
        type="button"
        aria-label={t('decrease')}
        disabled={disabled}
        className="button button--step button--step-decrease"
        onClick={(event) => onChange(clamp(current - getStep(event)))}
      >
        <Minus size={12} />
      </button>
      <div className="step-input__field-wrap">
        <input
          type="number"
          id={id}
          aria-label={label}
          value={value === null ? '' : value}
          min={min}
          disabled={disabled}
          onChange={(e) => onChange(+e.target.value || 0)}
          className="step-input__field"
        />
      </div>
      <button
        type="button"
        aria-label={t('increase')}
        disabled={disabled}
        className="button button--step button--step-increase"
        onClick={(event) => onChange(clamp(current + getStep(event)))}
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
