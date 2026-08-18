export const STORAGE_KEY = 'recorder_settings'

export const ENCODING_CHOICES = [
  { labelKey: 'encodingMediaRecorder', value: 'mediarecorder' },
  { labelKey: 'encodingWebCodecsMp4', value: 'webcodecs' },
] as const

export const MIME_CHOICES = [
  { labelKey: 'mimeAutoWebm', value: '' },
  { labelKey: 'mimeWebmVp9', value: 'video/webm;codecs=vp9' },
  { labelKey: 'mimeWebmVp8', value: 'video/webm;codecs=vp8' },
  {
    labelKey: 'mimeMp4Native',
    value: 'video/mp4;codecs=avc1.42E01E',
  },
]

// Bitrate is PRESET-ONLY
export const PRESET_BPS = [1e6, 2e6, 4e6, 6e6, 8e6, 10e6, 12e6, 16e6]

export const FPS_CHOICES = [15, 24, 30, 45, 60, 90, 120]

/** Committed to state when auto-stop is switched on, so the field never
    shows a number that is not stored. */
export const AUTO_STOP_DEFAULT_SEC = 10
