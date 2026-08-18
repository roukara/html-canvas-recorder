import type { EncodingMode } from '../../types'

export const STORAGE_KEY = 'recorder_settings'

/**
 * One list instead of an encoder choice crossed with a container choice. The
 * two were never independent — the WebCodecs path ignores `mime` entirely —
 * so pairing them left a select that changed nothing. Storage still holds
 * both fields; they are derived from this single choice.
 */
export interface FormatChoice {
  value: string
  labelKey: string
  encodingMode: EncodingMode
  mime: string
}

export const FORMAT_CHOICES: readonly FormatChoice[] = [
  {
    value: 'webm-auto',
    labelKey: 'mimeAutoWebm',
    encodingMode: 'mediarecorder',
    mime: '',
  },
  {
    value: 'webm-vp9',
    labelKey: 'mimeWebmVp9',
    encodingMode: 'mediarecorder',
    mime: 'video/webm;codecs=vp9',
  },
  {
    value: 'webm-vp8',
    labelKey: 'mimeWebmVp8',
    encodingMode: 'mediarecorder',
    mime: 'video/webm;codecs=vp8',
  },
  {
    value: 'mp4-native',
    labelKey: 'mimeMp4Native',
    encodingMode: 'mediarecorder',
    mime: 'video/mp4;codecs=avc1.42E01E',
  },
  {
    value: 'mp4-webcodecs',
    labelKey: 'formatWebCodecsMp4',
    encodingMode: 'webcodecs',
    mime: '',
  },
]

export function findFormatChoice(
  encodingMode: EncodingMode,
  mime: string,
): FormatChoice {
  return (
    FORMAT_CHOICES.find(
      (choice) =>
        choice.encodingMode === encodingMode &&
        (encodingMode === 'webcodecs' || choice.mime === mime),
    ) ?? FORMAT_CHOICES[0]
  )
}

// Bitrate is PRESET-ONLY
export const PRESET_BPS = [1e6, 2e6, 4e6, 6e6, 8e6, 10e6, 12e6, 16e6]

export const FPS_CHOICES = [15, 24, 30, 45, 60, 90, 120]

/** Committed to state when auto-stop is switched on, so the field never
    shows a number that is not stored. */
export const AUTO_STOP_DEFAULT_SEC = 10
