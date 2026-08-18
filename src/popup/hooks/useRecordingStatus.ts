import { useCallback, useEffect, useRef } from 'react'
import type { FromContent, RecordingStatus } from '../../types'
import { getState, setState } from '../state'
import { getTabFrames, sendToContent } from '../utils/chrome-api'

/**
 * The recorder lives in the page, so the page is the only place that knows
 * whether frames are being captured. The popup asks; it never assumes.
 */
const POLL_INTERVAL_MS = 250

type FrameStatus = { frameId: number; status: RecordingStatus }

async function readStatusFromFrames(tabId: number): Promise<FrameStatus | null> {
  const frames = await getTabFrames(tabId)
  const responses = await Promise.allSettled(
    frames.map(async (frame): Promise<FrameStatus> => {
      const res = await sendToContent<FromContent>(
        tabId,
        { type: 'GET_RECORDING_STATUS' },
        frame.frameId,
      )
      if (res.type !== 'RECORDING_STATUS') {
        throw new Error('Unexpected response')
      }
      return { frameId: frame.frameId, status: res.status }
    }),
  )

  const answered = responses.flatMap((response) =>
    response.status === 'fulfilled' ? [response.value] : [],
  )
  // No frame answered: the page cannot be read, which is not the same as idle.
  if (answered.length === 0) return null
  return (
    answered.find((entry) => entry.status.phase !== 'idle') ?? {
      frameId: 0,
      status: { phase: 'idle' },
    }
  )
}

function applyStatus(entry: FrameStatus | null): void {
  if (!entry) return
  const { frameId, status } = entry
  if (status.phase === 'idle') {
    setState({
      phase: 'idle',
      recordingFrameId: null,
      pendingRemainingMs: 0,
      elapsedMs: null,
    })
    return
  }
  if (status.phase === 'pending') {
    setState({
      phase: 'pending',
      recordingFrameId: frameId,
      pendingRemainingMs: status.remainingMs,
      elapsedMs: null,
    })
    return
  }
  setState({
    phase: status.phase,
    recordingFrameId: frameId,
    pendingRemainingMs: 0,
    elapsedMs: status.elapsedMs,
  })
}

export function useRecordingStatus() {
  const inFlightRef = useRef(false)

  const refreshStatus = useCallback(async () => {
    const { tabId } = getState()
    if (!tabId || inFlightRef.current) return
    inFlightRef.current = true
    try {
      applyStatus(await readStatusFromFrames(tabId))
    } catch {
      // Leave the last known phase in place rather than claiming 'idle'.
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    const intervalId = setInterval(() => void refreshStatus(), POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [refreshStatus])

  return refreshStatus
}
