import type { ReactNode } from 'react'
import { ChevronDown } from '../../icons'

interface FieldSelectProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  children: ReactNode
}

export function FieldSelect({
  label,
  id,
  value,
  onChange,
  disabled,
  children,
}: FieldSelectProps) {
  return (
    <label className="field-select" htmlFor={id}>
      <span className="field-select__label">{label}</span>
      <div className="field-select__control-wrap">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="field-select__control"
        >
          {children}
        </select>
        <span aria-hidden="true" className="field-select__icon">
          <ChevronDown size={10} />
        </span>
      </div>
    </label>
  )
}
