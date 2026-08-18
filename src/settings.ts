import type { EncodingMode } from './types'

export interface RecorderSettings {
  fps: number
  bitratePreset: number
  mime: string
  encodingMode: EncodingMode
  autoStopSec: number
  startDelaySec: number
}

export interface RecorderSettingsStore {
  global: RecorderSettings
  hosts: Record<string, RecorderSettings>
}

export const DEFAULT_RECORDER_SETTINGS: RecorderSettings = {
  fps: 60,
  bitratePreset: 8_000_000,
  mime: '',
  encodingMode: 'mediarecorder',
  autoStopSec: 0,
  startDelaySec: 0,
}

type PartialSettings = Partial<RecorderSettings>

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function getHostFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.host
      : null
  } catch {
    return null
  }
}

export function coerceRecorderSettings(value: unknown): RecorderSettings {
  const raw = isObject(value) ? (value as PartialSettings) : {}
  return {
    fps: raw.fps ?? DEFAULT_RECORDER_SETTINGS.fps,
    bitratePreset:
      raw.bitratePreset ?? DEFAULT_RECORDER_SETTINGS.bitratePreset,
    mime: raw.mime ?? DEFAULT_RECORDER_SETTINGS.mime,
    encodingMode: raw.encodingMode ?? DEFAULT_RECORDER_SETTINGS.encodingMode,
    autoStopSec: raw.autoStopSec ?? DEFAULT_RECORDER_SETTINGS.autoStopSec,
    startDelaySec:
      raw.startDelaySec ?? DEFAULT_RECORDER_SETTINGS.startDelaySec,
  }
}

export function normalizeRecorderSettingsStore(
  value: unknown,
): RecorderSettingsStore {
  if (!isObject(value)) {
    return { global: DEFAULT_RECORDER_SETTINGS, hosts: {} }
  }

  const maybeStore = value as {
    global?: unknown
    hosts?: unknown
  }
  if ('global' in maybeStore || 'hosts' in maybeStore) {
    const hosts: Record<string, RecorderSettings> = {}
    if (isObject(maybeStore.hosts)) {
      for (const [host, settings] of Object.entries(maybeStore.hosts)) {
        hosts[host] = coerceRecorderSettings(settings)
      }
    }
    return {
      global: coerceRecorderSettings(maybeStore.global),
      hosts,
    }
  }

  return {
    global: coerceRecorderSettings(value),
    hosts: {},
  }
}

export function selectRecorderSettings(
  store: RecorderSettingsStore,
  host: string | null,
): { settings: RecorderSettings; hasHostProfile: boolean } {
  if (host && store.hosts[host]) {
    return { settings: store.hosts[host], hasHostProfile: true }
  }
  return { settings: store.global, hasHostProfile: false }
}
