import { useCallback, useEffect, useRef } from 'react'
import type { EncodingMode } from '../../types'
import {
  coerceRecorderSettings,
  getHostFromUrl,
  normalizeRecorderSettingsStore,
  selectRecorderSettings,
  type RecorderSettings,
} from '../../settings'
import { getState, setState } from '../state'
import { STORAGE_KEY } from '../utils/constants'

function readSettingsStore(): Promise<ReturnType<typeof normalizeRecorderSettingsStore>> {
  return chrome.storage.local
    .get({ [STORAGE_KEY]: null })
    .then((obj) => normalizeRecorderSettingsStore(obj[STORAGE_KEY]))
}

function writeSettingsStore(
  store: ReturnType<typeof normalizeRecorderSettingsStore>,
): Promise<void> {
  return chrome.storage.local.set({ [STORAGE_KEY]: store })
}

function currentSettings(): RecorderSettings {
  const {
    fps,
    bitratePreset,
    mime,
    encodingMode,
    pump,
    autoStopSec,
    startDelaySec,
  } = getState()
  return coerceRecorderSettings({
    fps,
    bitratePreset,
    mime,
    encodingMode,
    pump,
    autoStopSec,
    startDelaySec,
  })
}

async function currentHost(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return getHostFromUrl(tabs[0]?.url)
}

function applySettings(settings: RecorderSettings): void {
  setState({
    fps: settings.fps,
    bitratePreset: settings.bitratePreset,
    mime: settings.mime,
    encodingMode: settings.encodingMode,
    pump: settings.pump,
    autoStopSec: settings.autoStopSec,
    startDelaySec: settings.startDelaySec,
  })
}

export function useSettingsPersistence() {
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    void (async () => {
      const host = await currentHost()
      const store = await readSettingsStore()
      const selected = selectRecorderSettings(store, host)
      setState({
        settingsHost: host,
        siteSettingsEnabled: selected.hasHostProfile,
      })
      applySettings(selected.settings)
    })()
  }, [])

  const scheduleSaveSettings = useCallback(() => {
    if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void (async () => {
        const { settingsHost, siteSettingsEnabled } = getState()
        const store = await readSettingsStore()
        if (settingsHost && siteSettingsEnabled) {
          store.hosts[settingsHost] = currentSettings()
        } else {
          store.global = currentSettings()
        }
        await writeSettingsStore(store)
      })()
    }, 200)
  }, [])

  const setFps = useCallback(
    (fps: number) => {
      setState({ fps })
      scheduleSaveSettings()
    },
    [scheduleSaveSettings],
  )

  const setBitratePreset = useCallback(
    (bitratePreset: number) => {
      setState({ bitratePreset })
      scheduleSaveSettings()
    },
    [scheduleSaveSettings],
  )

  const setMime = useCallback(
    (mime: string) => {
      setState({ mime })
      scheduleSaveSettings()
    },
    [scheduleSaveSettings],
  )

  const setEncodingMode = useCallback(
    (encodingMode: EncodingMode) => {
      setState({ encodingMode })
      scheduleSaveSettings()
    },
    [scheduleSaveSettings],
  )

  const setPump = useCallback(
    (pump: boolean) => {
      setState({ pump })
      scheduleSaveSettings()
    },
    [scheduleSaveSettings],
  )

  const setAutoStopSec = useCallback(
    (autoStopSec: number) => {
      setState({ autoStopSec })
      scheduleSaveSettings()
    },
    [scheduleSaveSettings],
  )

  const setStartDelaySec = useCallback(
    (startDelaySec: number) => {
      setState({ startDelaySec })
      scheduleSaveSettings()
    },
    [scheduleSaveSettings],
  )

  const setSiteSettingsEnabled = useCallback((enabled: boolean) => {
    void (async () => {
      const { settingsHost } = getState()
      if (!settingsHost) return
      const store = await readSettingsStore()
      if (enabled) {
        store.hosts[settingsHost] = currentSettings()
        setState({ siteSettingsEnabled: true })
      } else {
        delete store.hosts[settingsHost]
        setState({ siteSettingsEnabled: false })
        applySettings(store.global)
      }
      await writeSettingsStore(store)
    })()
  }, [])

  return {
    setFps,
    setBitratePreset,
    setMime,
    setEncodingMode,
    setPump,
    setAutoStopSec,
    setStartDelaySec,
    setSiteSettingsEnabled,
  }
}
