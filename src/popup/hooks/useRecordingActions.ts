import { useCallback } from 'react'
import type { FromContent } from '../../types'
import { toErrorMessage } from '../../utils/error'
import { getState, setState } from '../state'
import { sendToContent } from '../utils/chrome-api'
import { t } from '../utils/messages'

export function useRecordingActions() {
  const startRecording = useCallback(async () => {
    const {
      tabId,
      pickedCanvas,
      fps,
      mime,
      bitratePreset,
      encodingMode,
      pump,
      autoStopSec,
      startDelaySec,
    } = getState()
    if (!tabId || !pickedCanvas) {
      setState({ error: t('errorNoCanvasSelected') })
      return
    }
    setState({ error: null, recording: true, paused: false })
    try {
      const res = await sendToContent<FromContent>(
        tabId,
        {
          type: 'START',
          id: pickedCanvas.id,
          fps,
          mime: mime || undefined,
          videoBitsPerSecond: bitratePreset,
          pumpFrames: pump,
          maxDurationSec: autoStopSec > 0 ? autoStopSec : undefined,
          encodingMode,
          startDelaySec: startDelaySec > 0 ? startDelaySec : undefined,
        },
        pickedCanvas.frameId,
      )
      if (res.type === 'ERROR') {
        setState({ recording: false, paused: false, error: res.message })
      }
    } catch (err: unknown) {
      setState({ recording: false, paused: false, error: toErrorMessage(err) })
    }
  }, [])

  const pauseRecording = useCallback(async () => {
    const { tabId, pickedCanvas, recording, paused } = getState()
    if (!tabId || !pickedCanvas || !recording || paused) return
    setState({ error: null })
    try {
      const res = await sendToContent(
        tabId,
        { type: 'PAUSE' },
        pickedCanvas.frameId,
      )
      if (res.type === 'RECORDING_PAUSED') setState({ paused: true })
      if (res.type === 'ERROR') setState({ error: res.message })
    } catch (err: unknown) {
      setState({ error: toErrorMessage(err) })
    }
  }, [])

  const resumeRecording = useCallback(async () => {
    const { tabId, pickedCanvas, recording, paused } = getState()
    if (!tabId || !pickedCanvas || !recording || !paused) return
    setState({ error: null })
    try {
      const res = await sendToContent(
        tabId,
        { type: 'RESUME' },
        pickedCanvas.frameId,
      )
      if (res.type === 'RECORDING_RESUMED') setState({ paused: false })
      if (res.type === 'ERROR') setState({ error: res.message })
    } catch (err: unknown) {
      setState({ error: toErrorMessage(err) })
    }
  }, [])

  const stopRecording = useCallback(async () => {
    const { tabId } = getState()
    if (!tabId) return
    setState({ error: null })
    try {
      const { pickedCanvas } = getState()
      const res = await sendToContent(
        tabId,
        { type: 'STOP' },
        pickedCanvas?.frameId,
      )
      if (res.type === 'ERROR') setState({ error: res.message })
    } catch (err: unknown) {
      setState({ error: toErrorMessage(err) })
    }
  }, [])

  return { startRecording, stopRecording, pauseRecording, resumeRecording }
}
