import { useEffect } from 'react'
import type { CanvasInfo } from '../../types'
import { isFromContentMessage } from '../../types'
import { getState, setState } from '../state'
import { sendToAllContentFrames, sendToContent } from '../utils/chrome-api'

function getFrameId(sender: chrome.runtime.MessageSender): number {
  return sender.frameId ?? 0
}

function upsertCanvas(canvasList: CanvasInfo[], canvas: CanvasInfo): CanvasInfo[] {
  const frameId = canvas.frameId ?? 0
  const index = canvasList.findIndex(
    (item) => item.id === canvas.id && (item.frameId ?? 0) === frameId,
  )
  if (index < 0) return [canvas, ...canvasList]
  return canvasList.map((item, itemIndex) =>
    itemIndex === index
      ? {
          ...canvas,
          thumb: canvas.thumb ?? item.thumb,
          tainted: canvas.tainted ?? item.tainted,
        }
      : item,
  )
}

export function usePopupLifecycle(scan: () => Promise<void>) {
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs[0]
      if (t?.id != null) {
        setState({ tabId: t.id })
        void scan()
      }
    })

    const listener = (msg: unknown, sender: chrome.runtime.MessageSender) => {
      if (isFromContentMessage(msg)) {
        switch (msg.type) {
          case 'RECORDING_PENDING':
            setState({ recording: true, paused: false })
            break
          case 'RECORDING_STARTED':
            setState({ recording: true, paused: false })
            break
          case 'RECORDING_PAUSED':
            setState({ paused: true })
            break
          case 'RECORDING_RESUMED':
            setState({ paused: false })
            break
          case 'RECORDING_CANCELLED':
            setState({ recording: false, paused: false })
            break
          case 'RECORDING_STOPPED':
            setState({ recording: false, paused: false, lastSaved: msg.fileName })
            break
          case 'CANVAS_PICKED': {
            const frameId = getFrameId(sender)
            const picked = {
              ...msg.canvas,
              frameId,
              frameUrl: sender.url,
            }
            const { tabId, canvasList } = getState()
            setState({
              picking: false,
              canvasList: upsertCanvas(canvasList, picked),
              pickedCanvas: {
                id: picked.id,
                frameId,
                width: picked.width,
                height: picked.height,
              },
            })
            chrome.storage.local.set({
              selectedCanvas: {
                id: picked.id,
                frameId,
                width: picked.width,
                height: picked.height,
                ts: Date.now(),
              },
            })
            if (tabId) {
              void sendToAllContentFrames(tabId, { type: 'STOP_PICKER' })
              void sendToAllContentFrames(tabId, { type: 'HIGHLIGHT', id: null })
              void sendToContent(tabId, { type: 'HIGHLIGHT', id: picked.id }, frameId)
            }
            break
          }
          case 'PICKER_CANCELLED': {
            const { tabId, pickedCanvas } = getState()
            setState({ picking: false })
            if (tabId) {
              void sendToAllContentFrames(tabId, { type: 'STOP_PICKER' })
              if (pickedCanvas) {
                void sendToContent(
                  tabId,
                  { type: 'HIGHLIGHT', id: pickedCanvas.id },
                  pickedCanvas.frameId,
                )
              }
            }
            break
          }
          case 'ERROR':
            setState({ recording: false, paused: false, error: msg.message })
            break
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        const { tabId, recording, picking } = getState()
        if (!tabId || recording || picking) return
        try {
          void sendToAllContentFrames(tabId, { type: 'STOP_PICKER' })
        } catch {
          /* ignore */
        }
        try {
          void sendToAllContentFrames(tabId, { type: 'HIGHLIGHT', id: null })
        } catch {
          /* ignore */
        }
        try {
          void sendToAllContentFrames(tabId, {
            type: 'SHOW_BADGES',
            show: false,
          })
        } catch {
          /* ignore */
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      chrome.runtime.onMessage.removeListener(listener)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [scan])
}
