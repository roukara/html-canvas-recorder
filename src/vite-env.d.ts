/// <reference types="vite/client" />

interface MediaStreamTrackProcessorInit {
  track: MediaStreamTrack
}

declare class MediaStreamTrackProcessor<T extends VideoFrame = VideoFrame> {
  constructor(init: MediaStreamTrackProcessorInit)
  readonly readable: ReadableStream<T>
}
