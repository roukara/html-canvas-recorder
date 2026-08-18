import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { fileFromBlob, saveViaAnchor } from '../utils/save'

type VideoTrackWithRequest = MediaStreamTrack & { requestFrame?: () => void }
type CanvasWithCapture = HTMLCanvasElement & {
  captureStream?: HTMLCanvasElement['captureStream']
}

export interface WebCodecsRecordingFile {
  fileName: string
  mime: 'video/mp4'
}

interface WebCodecsRecorderOptions {
  canvas: CanvasWithCapture
  id: string
  fps: number
  videoBitsPerSecond?: number
  maxDurationSec?: number
  onStop: (file: WebCodecsRecordingFile) => void
  onError: (error: unknown) => void
}

const MP4_MIME = 'video/mp4' as const

/** See the matching constants in recorder.ts: a canvas that is not redrawn
    yields no frames, so the recorder drives them rather than asking. */
const FRAME_STARVATION_MS = 1000
const STARVATION_POLL_MS = 250

export class WebCodecsCanvasRecorder {
  private readonly stream: MediaStream
  private readonly track: VideoTrackWithRequest
  private readonly reader: ReadableStreamDefaultReader<VideoFrame>
  private readonly encoder: VideoEncoder
  private readonly muxer: Muxer<ArrayBufferTarget>
  private readonly target = new ArrayBufferTarget()
  private readonly frameDurationUs: number
  private readonly fileName: string
  private readonly onStop: (file: WebCodecsRecordingFile) => void
  private readonly onError: (error: unknown) => void
  private pumpTimer: number | null = null
  private starvationWatchdog: number | null = null
  private lastFrameAtMs = 0
  private pumpEngaged = false
  private stopTimer: number | null = null
  private stopTimerStartedAtMs: number | null = null
  private stopRemainingMs: number | null = null
  private encodedFrames = 0
  private stopped = false
  private paused = false

  constructor(options: WebCodecsRecorderOptions) {
    if (typeof VideoEncoder === 'undefined') {
      throw new Error('WebCodecs VideoEncoder is not available')
    }
    if (typeof MediaStreamTrackProcessor === 'undefined') {
      throw new Error('MediaStreamTrackProcessor is not available')
    }

    const width = options.canvas.width || Math.round(options.canvas.clientWidth)
    const height =
      options.canvas.height || Math.round(options.canvas.clientHeight)
    if (!width || !height) throw new Error('Canvas has no size')

    const stream = options.canvas.captureStream?.(options.fps)
    if (!stream) throw new Error('E_NO_CAPTURE_STREAM')
    const track = stream.getVideoTracks()[0] as VideoTrackWithRequest | undefined
    if (!track) throw new Error('Canvas stream has no video track')

    this.stream = stream
    this.track = track
    this.onStop = options.onStop
    this.onError = options.onError
    this.frameDurationUs = Math.round(1_000_000 / Math.max(1, options.fps))
    const timestamp = new Date().toISOString().replaceAll(':', '-')
    this.fileName = `canvas-${options.id}-${timestamp}.mp4`

    this.muxer = new Muxer({
      target: this.target,
      video: {
        codec: 'avc',
        width,
        height,
        frameRate: options.fps,
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    })

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (error) => this.fail(error),
    })
    this.encoder.configure({
      codec: 'avc1.42001f',
      width,
      height,
      bitrate: options.videoBitsPerSecond,
      framerate: options.fps,
      latencyMode: 'realtime',
    })

    const processor = new MediaStreamTrackProcessor<VideoFrame>({ track })
    this.reader = processor.readable.getReader()
    this.startStarvationWatchdog()
    this.scheduleAutoStop(options.maxDurationSec)
    void this.readFrames()
  }

  pause(): void {
    if (this.stopped) throw new Error('Not recording')
    if (this.paused) throw new Error('Recording is already paused')
    this.paused = true
    this.stopStarvationWatchdog()
    this.stopFramePump()
    this.pauseStopTimer()
  }

  resume(): void {
    if (this.stopped) throw new Error('Not recording')
    if (!this.paused) throw new Error('Recording is not paused')
    this.paused = false
    // Already pumping before the pause: nothing left to detect, so resume it.
    if (this.pumpEngaged) this.startFramePump(1_000_000 / this.frameDurationUs)
    else this.startStarvationWatchdog()
    this.scheduleStopTimer()
  }

  stop(): void {
    if (this.stopped) throw new Error('Not recording')
    this.stopped = true
    this.cleanupTimers()
    this.track.stop()
    void this.reader.cancel().catch(() => {})
  }

  private async readFrames(): Promise<void> {
    try {
      while (!this.stopped) {
        const result = await this.reader.read()
        if (result.done) break
        const frame = result.value
        if (this.paused) {
          frame.close()
          continue
        }
        const encodedFrame = new VideoFrame(frame, {
          timestamp: this.encodedFrames * this.frameDurationUs,
        })
        frame.close()
        this.encoder.encode(encodedFrame, {
          keyFrame: this.encodedFrames % 120 === 0,
        })
        encodedFrame.close()
        this.encodedFrames++
        this.lastFrameAtMs = performance.now()
      }
      await this.finish()
    } catch (error: unknown) {
      if (!this.stopped) this.fail(error)
      else await this.finish()
    }
  }

  private async finish(): Promise<void> {
    try {
      this.stopped = true
      this.cleanupTimers()
      this.stream.getTracks().forEach((track) => track.stop())
      await this.encoder.flush()
      this.encoder.close()
      this.muxer.finalize()
      const blob = new Blob([this.target.buffer], { type: MP4_MIME })
      saveViaAnchor(fileFromBlob(blob, this.fileName))
      this.onStop({ fileName: this.fileName, mime: MP4_MIME })
    } catch (error: unknown) {
      this.fail(error)
    }
  }

  private fail(error: unknown): void {
    this.stopped = true
    this.cleanupTimers()
    this.stream.getTracks().forEach((track) => track.stop())
    this.onError(error)
  }

  private startStarvationWatchdog(): void {
    this.stopStarvationWatchdog()
    this.lastFrameAtMs = performance.now()
    this.starvationWatchdog = window.setInterval(() => {
      if (this.paused || this.stopped) return
      if (this.pumpTimer != null) {
        this.stopStarvationWatchdog()
        return
      }
      if (performance.now() - this.lastFrameAtMs < FRAME_STARVATION_MS) return
      this.startFramePump(1_000_000 / this.frameDurationUs)
      this.stopStarvationWatchdog()
    }, STARVATION_POLL_MS)
  }

  private stopStarvationWatchdog(): void {
    if (this.starvationWatchdog != null) {
      clearInterval(this.starvationWatchdog)
      this.starvationWatchdog = null
    }
  }

  private startFramePump(fps: number): void {
    if (!this.track.requestFrame) return
    this.stopFramePump()
    this.pumpEngaged = true
    const interval = Math.max(4, Math.round(1000 / Math.max(1, fps)))
    this.pumpTimer = window.setInterval(() => {
      try {
        this.track.requestFrame?.()
      } catch {
        // ignore individual request failures
      }
    }, interval)
  }

  private stopFramePump(): void {
    if (this.pumpTimer != null) {
      clearInterval(this.pumpTimer)
      this.pumpTimer = null
    }
  }

  private scheduleAutoStop(maxDurationSec?: number): void {
    this.stopRemainingMs =
      maxDurationSec && maxDurationSec > 0
        ? Math.round(maxDurationSec * 1000)
        : null
    this.scheduleStopTimer()
  }

  private scheduleStopTimer(): void {
    this.clearStopTimer()
    if (!this.stopRemainingMs || this.stopRemainingMs <= 0) return
    this.stopTimerStartedAtMs = performance.now()
    this.stopTimer = window.setTimeout(() => {
      try {
        this.stop()
      } catch {
        // already stopped
      }
    }, this.stopRemainingMs)
  }

  private pauseStopTimer(): void {
    if (this.stopTimer == null || this.stopTimerStartedAtMs == null) return
    this.stopRemainingMs = Math.max(
      0,
      (this.stopRemainingMs ?? 0) -
        (performance.now() - this.stopTimerStartedAtMs),
    )
    this.clearStopTimer()
  }

  private clearStopTimer(): void {
    if (this.stopTimer != null) {
      clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    this.stopTimerStartedAtMs = null
  }

  private cleanupTimers(): void {
    this.stopStarvationWatchdog()
    this.stopFramePump()
    this.clearStopTimer()
  }
}
