import fixWebmDuration from 'fix-webm-duration'
import type { EncodingMode, FromContent, RecordingStatus } from '../../types'
import { toErrorMessage } from '../../utils/error'
import { extFromMime, pickMime } from '../utils/media'
import { fileFromBlob, saveViaAnchor as saveFileViaAnchor } from '../utils/save'
import { hideCountdown, showCountdown } from '../ui/countdown'
import { findCanvasByRecorderId } from './dom'
import { WebCodecsCanvasRecorder } from './webcodecs-recorder'

type VideoTrackWithRequest = MediaStreamTrack & { requestFrame?: () => void }
type CanvasWithCapture = HTMLCanvasElement & {
  captureStream?: HTMLCanvasElement['captureStream']
}

interface RecordingFile {
  blob: Blob
  fileName: string
  mime: string
}

type StartRecordingResult = 'started' | 'cancelled'

interface PendingStart {
  id: string
  endsAtMs: number
  timer: number
  countdownTimer: number
  resolve: (result: StartRecordingResult) => void
}

/** recorder state */
let mediaRecorder: MediaRecorder | null = null
let webCodecsRecorder: WebCodecsCanvasRecorder | null = null
let pendingStart: PendingStart | null = null
let chunks: BlobPart[] = []
let currentMime = 'video/webm'
let pumpTimer: number | null = null
let capturedTrack: VideoTrackWithRequest | null = null
let stopTimer: number | null = null
let recordingStartedAtMs: number | null = null
let pausedStartedAtMs: number | null = null
let totalPausedMs = 0
let currentRecordingId: string | null = null
let currentFps = 60
let pumpEngaged = false
let navigationFlushStarted = false
let navigationFlushListenersInstalled = false
let stopRemainingMs: number | null = null
let stopTimerStartedAtMs: number | null = null
let lastFrameAtMs: number | null = null
let starvationWatchdog: number | null = null

/**
 * A canvas that is not being redrawn produces no frames, and the recording
 * comes out empty. Rather than asking the user to predict that, watch for the
 * starvation and drive the frames ourselves. Once engaged the pump stays on:
 * while it is running, real frames are indistinguishable from pumped ones, so
 * there is nothing left to detect.
 */
const FRAME_STARVATION_MS = 1000
const STARVATION_POLL_MS = 250

function getCanvasForRecording(id: string): CanvasWithCapture {
  const el = findCanvasByRecorderId(id) as CanvasWithCapture | null
  if (!el) throw new Error('Canvas not found')
  if (typeof el.captureStream !== 'function') {
    throw new Error('E_NO_CAPTURE_STREAM')
  }
  return el
}

function createRecorder(
  stream: MediaStream,
  mime: string,
  videoBitsPerSecond?: number,
): MediaRecorder {
  return new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond,
  })
}

function startFramePump(
  track: VideoTrackWithRequest | null,
  fps: number,
): void {
  if (!track?.requestFrame || pumpTimer != null) return
  pumpEngaged = true
  const interval = Math.max(4, Math.round(1000 / Math.max(1, fps)))
  pumpTimer = window.setInterval(() => {
    try {
      track.requestFrame?.()
    } catch {
      // ignore individual request failures
    }
  }, interval)
}

function clearFramePump(): void {
  stopStarvationWatchdog()
  stopFramePump()
  capturedTrack = null
}

function stopStarvationWatchdog(): void {
  if (starvationWatchdog != null) {
    clearInterval(starvationWatchdog)
    starvationWatchdog = null
  }
}

/** Restarts the starvation clock: used at start and on resume. */
function markFrameActivity(): void {
  lastFrameAtMs = performance.now()
}

function startStarvationWatchdog(): void {
  stopStarvationWatchdog()
  markFrameActivity()
  starvationWatchdog = window.setInterval(() => {
    if (pausedStartedAtMs != null) return
    if (pumpTimer != null) {
      stopStarvationWatchdog()
      return
    }
    if (lastFrameAtMs == null) return
    if (performance.now() - lastFrameAtMs < FRAME_STARVATION_MS) return
    startFramePump(capturedTrack, currentFps)
    stopStarvationWatchdog()
  }, STARVATION_POLL_MS)
}

function stopFramePump(): void {
  if (pumpTimer != null) {
    clearInterval(pumpTimer)
    pumpTimer = null
  }
}

function clearStopTimer(): void {
  if (stopTimer != null) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  stopTimerStartedAtMs = null
}

function clearPendingStart(): void {
  if (!pendingStart) return
  clearTimeout(pendingStart.timer)
  clearInterval(pendingStart.countdownTimer)
  pendingStart = null
  hideCountdown()
}

function cleanupRecordingState(): void {
  mediaRecorder = null
  webCodecsRecorder = null
  clearPendingStart()
  chunks = []
  recordingStartedAtMs = null
  pausedStartedAtMs = null
  totalPausedMs = 0
  currentRecordingId = null
  pumpEngaged = false
  lastFrameAtMs = null
  stopRemainingMs = null
  stopTimerStartedAtMs = null
  navigationFlushStarted = false
  removeNavigationFlushListeners()
}

/** Elapsed capture time, excluding paused spans. Null when nothing is captured. */
function getRecordedElapsedMs(): number | null {
  if (recordingStartedAtMs == null) return null
  const pausedNowMs =
    pausedStartedAtMs == null ? 0 : performance.now() - pausedStartedAtMs
  return Math.max(
    0,
    performance.now() - recordingStartedAtMs - totalPausedMs - pausedNowMs,
  )
}

/** The recorder's own view of what is happening, for the popup to read. */
export function getRecordingStatus(): RecordingStatus {
  if (pendingStart) {
    return {
      phase: 'pending',
      id: pendingStart.id,
      remainingMs: Math.max(0, pendingStart.endsAtMs - performance.now()),
    }
  }
  if (!currentRecordingId) return { phase: 'idle' }
  const elapsedMs = getRecordedElapsedMs()
  // Armed and wired up, but the encoder has not delivered a first frame yet.
  if (elapsedMs == null) {
    return { phase: 'pending', id: currentRecordingId, remainingMs: 0 }
  }
  return {
    phase: pausedStartedAtMs == null ? 'recording' : 'paused',
    id: currentRecordingId,
    elapsedMs,
  }
}

function scheduleAutoStop(maxDurationSec?: number): void {
  clearStopTimer()
  stopRemainingMs =
    maxDurationSec && maxDurationSec > 0
      ? Math.round(maxDurationSec * 1000)
      : null
  scheduleStopTimer()
}

function scheduleStopTimer(): void {
  clearStopTimer()
  if (!stopRemainingMs || stopRemainingMs <= 0) return
  stopTimerStartedAtMs = performance.now()
  stopTimer = window.setTimeout(
    () => {
      try {
        stopRecording()
      } catch {
        // already stopped
      }
    },
    stopRemainingMs,
  )
}

function pauseStopTimer(): void {
  if (stopTimer == null || stopTimerStartedAtMs == null) return
  stopRemainingMs = Math.max(
    0,
    (stopRemainingMs ?? 0) - (performance.now() - stopTimerStartedAtMs),
  )
  clearStopTimer()
}

async function buildRecordingFile(
  id: string,
  durationMs: number | null,
): Promise<RecordingFile> {
  const blob = await buildRecordingBlob(durationMs)
  const timestamp = new Date().toISOString().replaceAll(':', '-')
  const extension = extFromMime(currentMime)
  return {
    blob,
    fileName: `canvas-${id}-${timestamp}.${extension}`,
    mime: currentMime,
  }
}

async function buildRecordingBlob(durationMs: number | null): Promise<Blob> {
  const blob = new Blob(chunks, { type: currentMime })
  if (!currentMime.startsWith('video/webm') || !durationMs || durationMs <= 0) {
    return blob
  }
  return fixWebmDuration(blob, Math.round(durationMs), { logger: false })
}

function buildRawRecordingFile(id: string): RecordingFile {
  const blob = new Blob(chunks, { type: currentMime })
  const timestamp = new Date().toISOString().replaceAll(':', '-')
  const extension = extFromMime(currentMime)
  return {
    blob,
    fileName: `canvas-${id}-${timestamp}.${extension}`,
    mime: currentMime,
  }
}

function saveRecordingViaAnchor(file: RecordingFile): void {
  saveFileViaAnchor(fileFromBlob(file.blob, file.fileName))
}

function saveRecording(file: RecordingFile): boolean {
  try {
    saveRecordingViaAnchor(file)
    return true
  } catch (error: unknown) {
    notifySaveError(error)
    return false
  }
}

function notifyRecordingStarted(): void {
  recordingStartedAtMs = performance.now()
  const message: FromContent = { type: 'RECORDING_STARTED' }
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // popup may be closed; ignore
  }
}

function notifyRecordingPending(): void {
  const message: FromContent = { type: 'RECORDING_PENDING' }
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // popup may be closed; ignore
  }
}

function notifyRecordingPaused(): void {
  const message: FromContent = { type: 'RECORDING_PAUSED' }
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // popup may be closed; ignore
  }
}

function notifyRecordingResumed(): void {
  const message: FromContent = { type: 'RECORDING_RESUMED' }
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // popup may be closed; ignore
  }
}

function notifyRecordingCancelled(): void {
  const message: FromContent = { type: 'RECORDING_CANCELLED' }
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // popup may be closed; ignore
  }
}

function notifyRecordingStopped(fileName: string, mime: string): void {
  const message: FromContent = {
    type: 'RECORDING_STOPPED',
    fileName,
    mime,
  }
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // page may be unloading; ignore
  }
}

function notifySaveError(error: unknown): void {
  const message: FromContent = {
    type: 'ERROR',
    message: 'Failed to save: ' + toErrorMessage(error),
  }
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // page may be unloading; ignore
  }
}

function flushRecordingBeforeNavigation(): void {
  if (pendingStart && !navigationFlushStarted) {
    navigationFlushStarted = true
    clearPendingStart()
    return
  }
  if (webCodecsRecorder && !navigationFlushStarted) {
    navigationFlushStarted = true
    try {
      webCodecsRecorder.stop()
    } catch {
      cleanupRecordingState()
    }
    return
  }
  if (!mediaRecorder || navigationFlushStarted) return
  navigationFlushStarted = true
  clearStopTimer()
  clearFramePump()

  try {
    if (mediaRecorder.state === 'recording') mediaRecorder.requestData()
  } catch {
    // Best effort only; existing timeslice chunks are still preserved below.
  }

  const id = currentRecordingId
  if (id && chunks.length > 0) {
    const file = buildRawRecordingFile(id)
    if (saveRecording(file)) notifyRecordingStopped(file.fileName, file.mime)
  }

  const recorder = mediaRecorder
  recorder.onstop = null
  try {
    if (recorder.state !== 'inactive') recorder.stop()
  } catch {
    // recorder may already be stopping
  } finally {
    cleanupRecordingState()
  }
}

function addNavigationFlushListeners(): void {
  if (navigationFlushListenersInstalled) return
  window.addEventListener('pagehide', flushRecordingBeforeNavigation)
  window.addEventListener('beforeunload', flushRecordingBeforeNavigation)
  navigationFlushListenersInstalled = true
}

function removeNavigationFlushListeners(): void {
  if (!navigationFlushListenersInstalled) return
  window.removeEventListener('pagehide', flushRecordingBeforeNavigation)
  window.removeEventListener('beforeunload', flushRecordingBeforeNavigation)
  navigationFlushListenersInstalled = false
}

async function handleRecordingStop(id: string): Promise<void> {
  try {
    clearStopTimer()
    clearFramePump()

    const durationMs = getRecordedElapsedMs()
    const file = await buildRecordingFile(id, durationMs)
    const saved = saveRecording(file)
    if (saved) notifyRecordingStopped(file.fileName, file.mime)
  } catch (error: unknown) {
    notifySaveError(error)
  } finally {
    cleanupRecordingState()
  }
}

export async function startRecording(
  id: string,
  fps: number,
  mime?: string,
  videoBitsPerSecond?: number,
  maxDurationSec?: number,
  encodingMode: EncodingMode = 'mediarecorder',
  startDelaySec = 0,
): Promise<StartRecordingResult> {
  if (pendingStart) throw new Error('Already recording')
  const delayMs = Math.max(0, Math.round(startDelaySec * 1000))
  if (delayMs > 0) {
    const startedAt = performance.now()
    showCountdown(startDelaySec)
    notifyRecordingPending()
    return new Promise<StartRecordingResult>((resolve, reject) => {
      const countdownTimer = window.setInterval(() => {
        const elapsedSec = (performance.now() - startedAt) / 1000
        showCountdown(Math.max(0, startDelaySec - elapsedSec))
      }, 100)
      const timer = window.setTimeout(() => {
        clearInterval(countdownTimer)
        pendingStart = null
        hideCountdown()
        startRecording(
          id,
          fps,
          mime,
          videoBitsPerSecond,
          maxDurationSec,
          encodingMode,
          0,
        )
          .then(resolve)
          .catch(reject)
      }, delayMs)
      pendingStart = {
        id,
        endsAtMs: startedAt + delayMs,
        timer,
        countdownTimer,
        resolve,
      }
    })
  }

  const el = getCanvasForRecording(id)
  if (mediaRecorder || webCodecsRecorder) throw new Error('Already recording')

  if (encodingMode === 'webcodecs') {
    currentRecordingId = id
    navigationFlushStarted = false
    addNavigationFlushListeners()
    webCodecsRecorder = new WebCodecsCanvasRecorder({
      canvas: el,
      id,
      fps,
      videoBitsPerSecond,
      maxDurationSec,
      onStop: (file) => {
        notifyRecordingStopped(file.fileName, file.mime)
        cleanupRecordingState()
      },
      onError: (error) => {
        notifySaveError(error)
        cleanupRecordingState()
      },
    })
    notifyRecordingStarted()
    return 'started'
  }

  const stream = el.captureStream(fps)
  if (!stream) throw new Error('E_NO_CAPTURE_STREAM')

  const track = stream.getVideoTracks()[0] as VideoTrackWithRequest | undefined
  capturedTrack = track ?? null
  currentFps = fps

  currentMime = pickMime(mime)
  chunks = []
  pausedStartedAtMs = null
  totalPausedMs = 0
  currentRecordingId = id
  navigationFlushStarted = false
  mediaRecorder = createRecorder(stream, currentMime, videoBitsPerSecond)
  scheduleAutoStop(maxDurationSec)
  addNavigationFlushListeners()

  mediaRecorder.onstart = () => {
    notifyRecordingStarted()
    startStarvationWatchdog()
  }

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data)
      markFrameActivity()
    }
  }

  mediaRecorder.onstop = () => {
    void handleRecordingStop(id)
  }

  mediaRecorder.start(250) // 250ms timeslice
  return 'started'
}

export const stopRecording = () => {
  if (pendingStart) {
    const pending = pendingStart
    clearPendingStart()
    pending.resolve('cancelled')
    notifyRecordingCancelled()
    return
  }
  if (webCodecsRecorder) {
    webCodecsRecorder.stop()
    return
  }
  if (!mediaRecorder) throw new Error('Not recording')
  clearStopTimer()
  mediaRecorder.stop()
}

export const pauseRecording = () => {
  if (webCodecsRecorder) {
    webCodecsRecorder.pause()
    pausedStartedAtMs = performance.now()
    notifyRecordingPaused()
    return
  }
  if (!mediaRecorder) throw new Error('Not recording')
  if (mediaRecorder.state !== 'recording') {
    throw new Error('Recording is not active')
  }
  mediaRecorder.pause()
  pausedStartedAtMs = performance.now()
  stopStarvationWatchdog()
  stopFramePump()
  pauseStopTimer()
  notifyRecordingPaused()
}

export const resumeRecording = () => {
  if (webCodecsRecorder) {
    webCodecsRecorder.resume()
    if (pausedStartedAtMs != null) {
      totalPausedMs += performance.now() - pausedStartedAtMs
      pausedStartedAtMs = null
    }
    notifyRecordingResumed()
    return
  }
  if (!mediaRecorder) throw new Error('Not recording')
  if (mediaRecorder.state !== 'paused') {
    throw new Error('Recording is not paused')
  }
  mediaRecorder.resume()
  if (pausedStartedAtMs != null) {
    totalPausedMs += performance.now() - pausedStartedAtMs
    pausedStartedAtMs = null
  }
  // Already pumping before the pause: nothing left to detect, so resume it.
  if (pumpEngaged) startFramePump(capturedTrack, currentFps)
  else startStarvationWatchdog()
  scheduleStopTimer()
  notifyRecordingResumed()
}
