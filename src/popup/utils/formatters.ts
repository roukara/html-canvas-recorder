export const fmtMbps = (bps: number) => (bps / 1e6).toFixed(1)

/** m:ss from the recorder's own elapsed time. Never counts on its own. */
export const fmtElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Whole seconds left in the start delay, rounded up so 0 means "now". */
export const fmtCountdownSec = (ms: number) =>
  String(Math.max(0, Math.ceil(ms / 1000)))
