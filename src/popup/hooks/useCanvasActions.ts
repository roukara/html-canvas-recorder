import { useCallback, useRef } from 'react'
import type { AutoArmConfig, CanvasInfo } from '../../types'
import { AUTO_ARM_KEY } from '../../types'
import {
  RecorderError,
  errorCodeOf,
  toErrorMessage,
} from '../../utils/error'
import { clearError, getState, isBusy, setError, setState } from '../state'
import {
  getTabFrames,
  sendToAllContentFrames,
  sendToContent,
} from '../utils/chrome-api'
import { t } from '../utils/messages'

function cssString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

function selectorForCanvas(canvas: CanvasInfo): string {
  if (canvas.domId) return `canvas[id="${cssString(canvas.domId)}"]`
  return `canvas[data-canvas-recorder-id="${cssString(canvas.id)}"]`
}

function getFrameId(canvas: CanvasInfo): number {
  return canvas.frameId ?? 0
}

function isSameCanvas(
  a: { id?: string; frameId?: number } | null | undefined,
  b: CanvasInfo,
): boolean {
  return !!a && a.id === b.id && (a.frameId ?? 0) === getFrameId(b)
}

export function useCanvasActions() {
  const minLoadTimerRef = useRef<number | null>(null)

  const scan = useCallback(async () => {
    const { tabId, pickedCanvas } = getState()
    if (!tabId) return
    clearError()
    setState({ scanning: true })

    const minTime = new Promise<void>((resolve) => {
      minLoadTimerRef.current = setTimeout(resolve, 300)
    })

    try {
      await Promise.all([
        (async () => {
          const frames = await getTabFrames(tabId)
          const responses = await Promise.allSettled(
            frames.map(async (frame) => {
              const res = await sendToContent(
                tabId,
                { type: 'GET_CANVASES' },
                frame.frameId,
              )
              if (res.type === 'ERROR') throw new Error(res.message)
              if (res.type !== 'CANVASES') {
                throw new Error(t('errorUnexpectedContentResponse'))
              }
              return res.canvases.map((canvas) => ({
                ...canvas,
                frameId: frame.frameId,
                frameUrl: frame.url,
              }))
            }),
          )
          const canvases = responses.flatMap((response) =>
            response.status === 'fulfilled' ? response.value : [],
          )
          // Three outcomes, kept apart: every frame answered; some frames
          // could not be read; nothing answered at all.
          const answered = responses.filter((r) => r.status === 'fulfilled')
          const unreadableFrames = responses.length - answered.length
          if (answered.length > 0) {
            setState({ canvasList: canvases, unreadableFrames })
            await sendToAllContentFrames(tabId, {
              type: 'SHOW_BADGES',
              show: true,
            })
            if (!pickedCanvas) {
              try {
                const stored = await chrome.storage.local.get({
                  selectedCanvas: null,
                })
                const sel = (
                  stored as {
                    selectedCanvas: { id?: string; frameId?: number } | null
                  }
                ).selectedCanvas
                if (sel?.id) {
                  const exists = canvases.find((c) => isSameCanvas(sel, c))
                  if (exists) {
                    setState({
                      pickedCanvas: {
                        id: exists.id,
                        frameId: getFrameId(exists),
                        width: exists.width,
                        height: exists.height,
                      },
                    })
                    try {
                      await sendToContent(
                        tabId,
                        {
                          type: 'HIGHLIGHT',
                          id: exists.id,
                        },
                        getFrameId(exists),
                      )
                    } catch {
                      // The page outline is a convenience; the selection the
                      // popup shows is already correct, so failing to draw it
                      // costs nothing worth interrupting the scan for.
                    }
                  }
                }
              } catch {
                // No stored selection could be read, so nothing is restored
                // and the list simply opens unselected. Nothing is lost that
                // picking a canvas does not fix.
              }
            }
          } else {
            // Nothing could be read, so nothing is known: keeping the previous
            // list on screen would present canvases we just failed to confirm.
            setState({ canvasList: [], unreadableFrames })
            throw new RecorderError(
              t('errorNoContentScript'),
              'no-content-script',
            )
          }
        })(),
        minTime,
      ])
    } catch (err: unknown) {
      await minTime
      setError(toErrorMessage(err), errorCodeOf(err))
    } finally {
      if (minLoadTimerRef.current !== null) {
        clearTimeout(minLoadTimerRef.current)
        minLoadTimerRef.current = null
      }
      setState({ scanning: false })
    }
  }, [])

  const pickCanvas = useCallback(async (c: CanvasInfo) => {
    const state = getState()
    const { tabId } = state
    if (isBusy(state)) return
    const frameId = getFrameId(c)
    setState({
      pickedCanvas: { id: c.id, frameId, width: c.width, height: c.height },
    })
    if (tabId) {
      await sendToAllContentFrames(tabId, { type: 'HIGHLIGHT', id: null })
      await sendToContent(tabId, { type: 'HIGHLIGHT', id: c.id }, frameId)
    }
    chrome.storage.local.set({
      selectedCanvas: {
        id: c.id,
        frameId,
        width: c.width,
        height: c.height,
        ts: Date.now(),
      },
    })
  }, [])

  const saveSnapshot = useCallback(async (c: CanvasInfo) => {
    const state = getState()
    const { tabId } = state
    if (!tabId || isBusy(state)) return
    if (c.tainted) {
      setError(t('errorSnapshotTainted'), 'cross-origin-tainted')
      return
    }
    clearError()
    try {
      const res = await sendToContent(
        tabId,
        { type: 'SAVE_SNAPSHOT', id: c.id },
        getFrameId(c),
      )
      if (res.type === 'SNAPSHOT_SAVED') {
        setState({ lastSaved: res.fileName })
      } else if (res.type === 'ERROR') {
        setError(res.message, res.code)
      }
    } catch (err: unknown) {
      setError(toErrorMessage(err), errorCodeOf(err))
    }
  }, [])

  const startPagePicker = useCallback(async () => {
    const state = getState()
    const { tabId } = state
    if (!tabId || isBusy(state)) return
    clearError()
    setState({ picking: true })
    try {
      await sendToAllContentFrames(tabId, { type: 'START_PICKER' })
    } catch (err: unknown) {
      setState({ picking: false })
      setError(toErrorMessage(err), errorCodeOf(err))
    }
  }, [])

  const armAndReload = useCallback(async () => {
    const {
      tabId,
      pickedCanvas,
      canvasList,
      fps,
      mime,
      bitratePreset,
      autoStopSec,
    } = getState()
    if (!tabId || !pickedCanvas) {
      setError(t('errorNoCanvasSelected'), 'no-canvas-selected')
      return
    }
    clearError()

    const targetCanvas = canvasList.find((c) => isSameCanvas(pickedCanvas, c))
    if (!targetCanvas) {
      setError(t('errorSelectedCanvasUnavailable'), 'canvas-missing')
      return
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const targetUrl = targetCanvas.frameUrl || tabs[0]?.url
    const url = targetUrl ? new URL(targetUrl) : null
    const host = url?.host

    const cfg: AutoArmConfig = {
      enabled: true,
      once: true,
      host: host || undefined,
      selector: selectorForCanvas(targetCanvas),
      strategy: 'css',
      fps,
      mime: mime || undefined,
      videoBitsPerSecond: bitratePreset,
      maxDurationSec: autoStopSec > 0 ? autoStopSec : undefined,
      ts: Date.now(),
    }
    await chrome.storage.local.set({ [AUTO_ARM_KEY]: cfg })
    await chrome.tabs.reload(tabId)
  }, [])

  return { scan, pickCanvas, saveSnapshot, startPagePicker, armAndReload }
}
