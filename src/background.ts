import {
  getHostFromUrl,
  normalizeRecorderSettingsStore,
  selectRecorderSettings,
} from './settings'
import type { FromContent, ToContent } from './types'
import { isFromContentMessage } from './types'

const SETTINGS_KEY = 'recorder_settings'
const ACTIVE_RECORDING_KEY = 'active_recording'
const SELECTED_CANVAS_KEY = 'selectedCanvas'

interface StoredCanvasSelection {
  id?: string
  frameId?: number
}

interface ActiveRecording {
  tabId: number
  frameId: number
  startedAt: number
  paused?: boolean
  pending?: boolean
}

chrome.runtime.onInstalled.addListener(() => {
  void clearRecordingBadge()
})

chrome.runtime.onStartup.addListener(() => {
  void restoreRecordingBadge()
})

chrome.runtime.onMessage.addListener((msg: unknown, sender) => {
  if (!isFromContentMessage(msg)) return
  void handleContentMessage(msg, sender)
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-recording') void toggleRecordingFromCommand()
  if (command === 'stop-recording') void stopActiveRecording()
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void clearRecordingForClosedTab(tabId)
})

async function handleContentMessage(
  msg: FromContent,
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  if (msg.type === 'RECORDING_PENDING' || msg.type === 'RECORDING_STARTED') {
    const tabId = sender.tab?.id
    if (tabId == null) return
    const active: ActiveRecording = {
      tabId,
      frameId: sender.frameId ?? 0,
      startedAt: Date.now(),
      pending: msg.type === 'RECORDING_PENDING',
    }
    await chrome.storage.local.set({ [ACTIVE_RECORDING_KEY]: active })
    await setRecordingBadge(msg.type === 'RECORDING_PENDING' ? 'WAIT' : 'REC')
  } else if (msg.type === 'RECORDING_PAUSED') {
    await updateActiveRecording({ paused: true })
    await setRecordingBadge('PAU')
  } else if (msg.type === 'RECORDING_RESUMED') {
    await updateActiveRecording({ paused: false })
    await setRecordingBadge('REC')
  } else if (msg.type === 'RECORDING_CANCELLED') {
    await chrome.storage.local.remove(ACTIVE_RECORDING_KEY)
    await clearRecordingBadge()
  } else if (msg.type === 'RECORDING_STOPPED') {
    await chrome.storage.local.remove(ACTIVE_RECORDING_KEY)
    await clearRecordingBadge()
  } else if (msg.type === 'ERROR') {
    await chrome.storage.local.remove(ACTIVE_RECORDING_KEY)
    await clearRecordingBadge()
  } else if (msg.type === 'CANVAS_PICKED') {
    await chrome.storage.local.set({
      [SELECTED_CANVAS_KEY]: {
        id: msg.canvas.id,
        frameId: sender.frameId ?? 0,
        width: msg.canvas.width,
        height: msg.canvas.height,
        ts: Date.now(),
      },
    })
    const tabId = sender.tab?.id
    if (tabId != null) await stopPickerInTab(tabId)
  } else if (msg.type === 'PICKER_CANCELLED') {
    const tabId = sender.tab?.id
    if (tabId != null) await stopPickerInTab(tabId)
  }
}

async function toggleRecordingFromCommand(): Promise<void> {
  const active = await getActiveRecording()
  if (active) {
    await stopActiveRecording(active)
    return
  }
  await startSelectedRecording()
}

async function startSelectedRecording(): Promise<void> {
  const tab = await getActiveTab()
  if (tab?.id == null) return

  const stored = await chrome.storage.local.get({
    [SELECTED_CANVAS_KEY]: null,
    [SETTINGS_KEY]: null,
  })
  const selected = stored[SELECTED_CANVAS_KEY] as StoredCanvasSelection | null
  if (!selected?.id) {
    console.warn('[canvas-recorder] command ignored: no selected canvas')
    return
  }

  const store = normalizeRecorderSettingsStore(stored[SETTINGS_KEY])
  const host = getHostFromUrl(tab.url)
  const { settings } = selectRecorderSettings(store, host)
  const message: ToContent = {
    type: 'START',
    id: selected.id,
    fps: settings.fps,
    mime: settings.mime || undefined,
    videoBitsPerSecond: settings.bitratePreset,
    maxDurationSec:
      settings.autoStopSec > 0 ? settings.autoStopSec : undefined,
    encodingMode: settings.encodingMode,
    startDelaySec:
      settings.startDelaySec > 0 ? settings.startDelaySec : undefined,
  }
  try {
    const response = await sendToContent(tab.id, message, selected.frameId ?? 0)
    if (response.type === 'ERROR') {
      console.warn(
        '[canvas-recorder] command failed to start recording',
        response,
      )
    }
  } catch (error: unknown) {
    console.warn('[canvas-recorder] command could not reach content script', error)
  }
}

async function stopActiveRecording(active?: ActiveRecording): Promise<void> {
  const target = active ?? (await getActiveRecording())
  if (!target) {
    console.warn('[canvas-recorder] command ignored: no active recording')
    return
  }
  try {
    const response = await sendToContent(
      target.tabId,
      { type: 'STOP' },
      target.frameId,
    )
    if (response.type === 'ERROR') {
      console.warn('[canvas-recorder] command failed to stop recording', response)
    }
  } catch (error: unknown) {
    console.warn('[canvas-recorder] command could not stop recording', error)
  }
}

async function getActiveRecording(): Promise<ActiveRecording | null> {
  const stored = await chrome.storage.local.get({ [ACTIVE_RECORDING_KEY]: null })
  return stored[ACTIVE_RECORDING_KEY] as ActiveRecording | null
}

async function clearRecordingForClosedTab(tabId: number): Promise<void> {
  const active = await getActiveRecording()
  if (active?.tabId !== tabId) return
  await chrome.storage.local.remove(ACTIVE_RECORDING_KEY)
  await clearRecordingBadge()
}

async function updateActiveRecording(
  patch: Partial<ActiveRecording>,
): Promise<void> {
  const active = await getActiveRecording()
  if (!active) return
  await chrome.storage.local.set({
    [ACTIVE_RECORDING_KEY]: { ...active, ...patch },
  })
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0]
}

async function sendToContent(
  tabId: number,
  msg: ToContent,
  frameId: number,
): Promise<FromContent> {
  return chrome.tabs.sendMessage(tabId, msg, { frameId }) as Promise<FromContent>
}

async function stopPickerInTab(tabId: number): Promise<void> {
  const frames = await chrome.webNavigation.getAllFrames({ tabId })
  await Promise.allSettled(
    (frames ?? [{ frameId: 0 }]).map((frame) =>
      sendToContent(tabId, { type: 'STOP_PICKER' }, frame.frameId),
    ),
  )
}

async function restoreRecordingBadge(): Promise<void> {
  const active = await getActiveRecording()
  if (active) {
    await setRecordingBadge(active.pending ? 'WAIT' : active.paused ? 'PAU' : 'REC')
  }
  else await clearRecordingBadge()
}

async function setRecordingBadge(text: 'REC' | 'PAU' | 'WAIT'): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: '#ff383c' })
  await chrome.action.setBadgeText({ text })
}

async function clearRecordingBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' })
}
