// Lucide-style inline SVG React components (stroke-based, viewBox 0 0 24 24)

interface IconProps {
  size?: number
}

function SvgIcon({
  size = 24,
  children,
}: {
  size?: number
  children: React.ReactNode
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function Layers({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </SvgIcon>
  )
}

export function RefreshCcw({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </SvgIcon>
  )
}

export function MousePointer2({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="m4 4 7.07 16.97 2.51-7.39 7.39-2.51L4 4z" />
      <path d="m13.58 13.58 4.24 4.24" />
    </SvgIcon>
  )
}

export function Settings2({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </SvgIcon>
  )
}

export function ChevronDown({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="m6 9 6 6 6-6" />
    </SvgIcon>
  )
}

export function ChevronUp({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="m18 15-6-6-6 6" />
    </SvgIcon>
  )
}

export function Minus({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="M5 12h14" />
    </SvgIcon>
  )
}

export function Plus({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </SvgIcon>
  )
}

export function ImageDown({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10.3" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      <circle cx="9" cy="9" r="2" />
      <path d="M19 16v6" />
      <path d="m22 19-3 3-3-3" />
    </SvgIcon>
  )
}

export function Pause({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="M10 4v16" />
      <path d="M14 4v16" />
    </SvgIcon>
  )
}

export function Play({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="m6 3 14 9-14 9V3z" />
    </SvgIcon>
  )
}

export function Square({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    </SvgIcon>
  )
}

export function Video({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="m22 8-6 4 6 4V8z" />
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </SvgIcon>
  )
}

export function RotateCcw({ size = 24 }: IconProps) {
  return (
    <SvgIcon size={size}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </SvgIcon>
  )
}
