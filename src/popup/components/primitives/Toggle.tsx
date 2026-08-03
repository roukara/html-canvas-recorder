interface ToggleProps {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}

export function Toggle({ label, checked, disabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={['toggle', checked ? 'toggle--checked' : ''].join(' ')}
    >
      <span className="toggle__knob" />
    </button>
  )
}
