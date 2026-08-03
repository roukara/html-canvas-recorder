import { useCallback, useRef } from 'react'
import type { AutoArmConfig, CanvasInfo } from '../../types'
import { AUTO_ARM_KEY } from '../../types'
import { toErrorMessage } from '../../utils/error'
import { getState, setState } from '../state'
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
    setState({ error: null, scanning: true })

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
          if (
            canvases.length > 0 ||
            responses.some((r) => r.status === 'fulfilled')
          ) {
            setState({ canvasList: canvases })
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
                      /* ignore */
                    }
                  }
                }
              } catch {
                /* ignore */
              }
            }
          } else {
            throw new Error(t('errorNoContentScript'))
          }
        })(),
        minTime,
      ])
    } catch (err: unknown) {
      await minTime
      setState({ error: toErrorMessage(err) })
    } finally {
      if (minLoadTimerRef.current !== null) {
        clearTimeout(minLoadTimerRef.current)
        minLoadTimerRef.current = null
      }
      setState({ scanning: false })
    }
  }, [])

  const pickCanvas = useCallback(async (c: CanvasInfo) => {
    const { tabId, recording } = getState()
    if (recording) return
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
    const { tabId, recording } = getState()
    if (!tabId || recording) return
    if (c.tainted) {
      setState({
        error: t('errorSnapshotTainted'),
      })
      return
    }
    setState({ error: null })
    try {
      const res = await sendToContent(
        tabId,
        { type: 'SAVE_SNAPSHOT', id: c.id },
        getFrameId(c),
      )
      if (res.type === 'SNAPSHOT_SAVED') {
        setState({ lastSaved: res.fileName })
      } else if (res.type === 'ERROR') {
        setState({ error: res.message })
      }
    } catch (err: unknown) {
      setState({ error: toErrorMessage(err) })
    }
  }, [])

  const startPagePicker = useCallback(async () => {
    const { tabId, recording } = getState()
    if (!tabId || recording) return
    setState({ error: null, picking: true })
    try {
      await sendToAllContentFrames(tabId, { type: 'START_PICKER' })
    } catch (err: unknown) {
      setState({ picking: false, error: toErrorMessage(err) })
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
      pump,
      autoStopSec,
    } = getState()
    if (!tabId || !pickedCanvas) {
      setState({ error: t('errorNoCanvasSelected') })
      return
    }
    setState({ error: null })

    const targetCanvas = canvasList.find((c) => isSameCanvas(pickedCanvas, c))
    if (!targetCanvas) {
      setState({ error: t('errorSelectedCanvasUnavailable') })
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
      pumpFrames: pump,
      maxDurationSec: autoStopSec > 0 ? autoStopSec : undefined,
      ts: Date.now(),
    }
    await chrome.storage.local.set({ [AUTO_ARM_KEY]: cfg })
    await chrome.tabs.reload(tabId)
  }, [])

  return { scan, pickCanvas, saveSnapshot, startPagePicker, armAndReload }
}
