import { useEffect, useState } from 'react'

export function useElapsedTime(active: boolean, paused = false): string {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (active) return
    const resetId = setTimeout(() => setElapsed(0), 0)
    return () => clearTimeout(resetId)
  }, [active])

  useEffect(() => {
    if (!active) return
    if (paused) return

    const intervalId = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(intervalId)
  }, [active, paused])

  const displayElapsed = active ? elapsed : 0
  const m = Math.floor(displayElapsed / 60)
  const s = displayElapsed % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
