import { useCallback } from 'react'
import type { FromContent } from '../../types'
import { toErrorMessage } from '../../utils/error'
import { clearError, getState, isBusy, isCapturing, setError } from '../state'
import { sendToContent } from '../utils/chrome-api'
import { t } from '../utils/messages'

/**
 * These actions never set the recording phase themselves. They ask the page to
 * act, then re-read the recorder's own status, so the popup can never claim a
 * recording that is not running.
 */
export function useRecordingActions(refreshStatus: () => Promise<void>) {
  const startRecording = useCallback(async () => {
    const {
      tabId,
      pickedCanvas,
      fps,
      mime,
      bitratePreset,
      encodingMode,
      autoStopSec,
      startDelaySec,
    } = getState()
    if (!tabId || !pickedCanvas) {
      setError(t('errorNoCanvasSelected'), 'no-canvas-selected')
      return
    }
    clearError()
    try {
      const res = await sendToContent<FromContent>(
        tabId,
        {
          type: 'START',
          id: pickedCanvas.id,
          fps,
          mime: mime || undefined,
          videoBitsPerSecond: bitratePreset,
          maxDurationSec: autoStopSec > 0 ? autoStopSec : undefined,
          encodingMode,
          startDelaySec: startDelaySec > 0 ? startDelaySec : undefined,
        },
        pickedCanvas.frameId,
      )
      if (res.type === 'ERROR') setError(res.message, res.code)
    } catch (err: unknown) {
      setError(toErrorMessage(err))
    } finally {
      await refreshStatus()
    }
  }, [refreshStatus])

  const pauseRecording = useCallback(async () => {
    const state = getState()
    const { tabId, recordingFrameId } = state
    if (!tabId || !isCapturing(state) || state.phase === 'paused') return
    clearError()
    try {
      const res = await sendToContent(
        tabId,
        { type: 'PAUSE' },
        recordingFrameId ?? undefined,
      )
      if (res.type === 'ERROR') setError(res.message, res.code)
    } catch (err: unknown) {
      setError(toErrorMessage(err))
    } finally {
      await refreshStatus()
    }
  }, [refreshStatus])

  const resumeRecording = useCallback(async () => {
    const state = getState()
    const { tabId, recordingFrameId } = state
    if (!tabId || state.phase !== 'paused') return
    clearError()
    try {
      const res = await sendToContent(
        tabId,
        { type: 'RESUME' },
        recordingFrameId ?? undefined,
      )
      if (res.type === 'ERROR') setError(res.message, res.code)
    } catch (err: unknown) {
      setError(toErrorMessage(err))
    } finally {
      await refreshStatus()
    }
  }, [refreshStatus])

  const stopRecording = useCallback(async () => {
    const state = getState()
    const { tabId, recordingFrameId, pickedCanvas } = state
    if (!tabId || !isBusy(state)) return
    clearError()
    try {
      const res = await sendToContent(
        tabId,
        { type: 'STOP' },
        recordingFrameId ?? pickedCanvas?.frameId,
      )
      if (res.type === 'ERROR') setError(res.message, res.code)
    } catch (err: unknown) {
      setError(toErrorMessage(err))
    } finally {
      await refreshStatus()
    }
  }, [refreshStatus])

  return { startRecording, stopRecording, pauseRecording, resumeRecording }
}
