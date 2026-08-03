import type { FromContent, ToContent } from '../types'
import { toErrorMessage } from '../utils/error'
import { initAutoArmBoot } from './canvas/auto-recorder'
import {
  setHighlightPulsing,
  startHighlight,
  stopHighlight,
} from './canvas/highlighter'
import {
  pauseRecording,
  resumeRecording,
  startRecording,
  stopRecording,
} from './canvas/recorder'
import { listCanvases } from './canvas/scanner'
import { startCanvasPicker, stopCanvasPicker } from './canvas/picker'
import { saveCanvasSnapshot } from './canvas/snapshot'
import { showBadges } from './ui/badges'

/** ARM: Auto-start on next reload */
initAutoArmBoot()

/** message router */
chrome.runtime.onMessage.addListener(
  (msg: ToContent, _sender, sendResponse) => {
    try {
      switch (msg.type) {
        case 'GET_CANVASES': {
          const response: FromContent = {
            type: 'CANVASES',
            canvases: listCanvases(),
          }
          sendResponse(response)
          break
        }
        case 'HIGHLIGHT': {
          if (msg.id == null) stopHighlight()
          else startHighlight(msg.id)
          sendResponse({ type: 'ACK' } satisfies FromContent)
          break
        }
        case 'SHOW_BADGES': {
          showBadges(msg.show)
          sendResponse({ type: 'ACK' } satisfies FromContent)
          break
        }
        case 'START_PICKER': {
          startCanvasPicker()
          sendResponse({ type: 'ACK' } satisfies FromContent)
          break
        }
        case 'STOP_PICKER': {
          stopCanvasPicker()
          sendResponse({ type: 'ACK' } satisfies FromContent)
          break
        }
        case 'SAVE_SNAPSHOT': {
          try {
            const fileName = saveCanvasSnapshot(msg.id)
            sendResponse({
              type: 'SNAPSHOT_SAVED',
              fileName,
            } satisfies FromContent)
          } catch (error: unknown) {
            sendResponse({
              type: 'ERROR',
              message: 'Failed to save snapshot: ' + toErrorMessage(error),
            } satisfies FromContent)
          }
          break
        }
        case 'START': {
          startRecording(
            msg.id,
            msg.fps,
            msg.mime,
            msg.videoBitsPerSecond,
            msg.pumpFrames,
            msg.maxDurationSec,
            msg.encodingMode,
            msg.startDelaySec,
          )
            .then((result) => {
              if (result === 'started') {
                setHighlightPulsing(true)
                sendResponse({
                  type: 'RECORDING_STARTED',
                } satisfies FromContent)
                return
              }
              sendResponse({ type: 'ACK' } satisfies FromContent)
            })
            .catch((error: unknown) =>
              sendResponse({
                type: 'ERROR',
                message: 'Failed to start recording: ' + toErrorMessage(error),
              } satisfies FromContent),
            )
          return true
        }
        case 'PAUSE': {
          try {
            pauseRecording()
            setHighlightPulsing(false)
            sendResponse({ type: 'RECORDING_PAUSED' } satisfies FromContent)
          } catch (error: unknown) {
            sendResponse({
              type: 'ERROR',
              message: toErrorMessage(error),
            } satisfies FromContent)
          }
          break
        }
        case 'RESUME': {
          try {
            resumeRecording()
            setHighlightPulsing(true)
            sendResponse({ type: 'RECORDING_RESUMED' } satisfies FromContent)
          } catch (error: unknown) {
            sendResponse({
              type: 'ERROR',
              message: toErrorMessage(error),
            } satisfies FromContent)
          }
          break
        }
        case 'STOP': {
          try {
            stopRecording()
            setHighlightPulsing(false)
            sendResponse({ type: 'ACK' } satisfies FromContent)
          } catch (error: unknown) {
            sendResponse({
              type: 'ERROR',
              message: toErrorMessage(error),
            } satisfies FromContent)
          }
          break
        }
      }
    } catch (error: unknown) {
      sendResponse({
        type: 'ERROR',
        message: toErrorMessage(error),
      } satisfies FromContent)
    }
    return true
  },
)

import { ensureCanvasIds } from './canvas/dom'

// Initialize: assign IDs
ensureCanvasIds()
