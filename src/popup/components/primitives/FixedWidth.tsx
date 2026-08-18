import type { ReactNode } from 'react'

interface FixedWidthProps {
  /**
   * Every string this slot can ever hold. The widest one sets the width, so
   * the slot never resizes and never moves what sits next to it. Enumerating
   * them is the point: a slot whose contents cannot be listed cannot be
   * reserved.
   */
  options: readonly string[]
  children: ReactNode
}

export function FixedWidth({ options, children }: FixedWidthProps) {
  return (
    <span className="fixed-width">
      <span className="fixed-width__value">{children}</span>
      {options.map((option) => (
        <span key={option} aria-hidden="true" className="fixed-width__ghost">
          {option}
        </span>
      ))}
    </span>
  )
}
