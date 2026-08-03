import { useEffect } from 'react'
import { useElapsedTime } from './hooks/useElapsedTime'
import { CanvasList } from './components/CanvasList'
import { ControlButtons } from './components/ControlButtons'
import { SettingsPanel } from './components/SettingsPanel'
import { useCanvasActions } from './hooks/useCanvasActions'
import { useAppState } from './hooks/useAppState'
import { usePopupLifecycle } from './hooks/usePopupLifecycle'
import { useRecordingActions } from './hooks/useRecordingActions'
import { useSettingsPersistence } from './hooks/useSettingsPersistence'
import { MIME_CHOICES } from './utils/constants'
import { t } from './utils/messages'

function getMimeSupport(): Record<string, boolean> {
  const s: Record<string, boolean> = {}
  for (const m of MIME_CHOICES.map((x) => x.value).filter(Boolean)) {
    s[m] =
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
  }
  return s
}

const mimeSupport = getMimeSupport()

export function App() {
  const state = useAppState()
  const elapsed = useElapsedTime(state.recording, state.paused)
  const settings = useSettingsPersistence()
  const { scan, pickCanvas, saveSnapshot, startPagePicker, armAndReload } =
    useCanvasActions()
  const { startRecording, stopRecording, pauseRecording, resumeRecording } =
    useRecordingActions()

  usePopupLifecycle(scan)

  useEffect(() => {
    document.title = t('extensionName')
  }, [])

  return (
    // Field: the full popup surface.
    <div className="popup">
      <div className="popup__inner">
        {/* CanvasStream */}
        <CanvasList
          canvasList={state.canvasList}
          pickedCanvas={state.pickedCanvas}
          scanning={state.scanning}
          recording={state.recording}
          picking={state.picking}
          paused={state.paused}
          elapsed={elapsed}
          lastSaved={state.lastSaved}
          error={state.error}
          onPick={pickCanvas}
          onSaveSnapshot={saveSnapshot}
          onScan={scan}
          onPickOnPage={startPagePicker}
        />

        {/* Rule */}
        <div className="popup__divider" />

        {/* RecordAction + ArmAction */}
        <ControlButtons
          recording={state.recording}
          paused={state.paused}
          pickedCanvas={state.pickedCanvas}
          onStart={startRecording}
          onStop={stopRecording}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onArmAndReload={armAndReload}
        />

        {/* Rule */}
        <div className="popup__divider" />

        {/* SettingsDrawer */}
        <SettingsPanel
          state={state}
          supported={mimeSupport}
          onSetFps={settings.setFps}
          onSetBitratePreset={settings.setBitratePreset}
          onSetMime={settings.setMime}
          onSetEncodingMode={settings.setEncodingMode}
          onSetPump={settings.setPump}
          onSetAutoStopSec={settings.setAutoStopSec}
          onSetStartDelaySec={settings.setStartDelaySec}
          onSetSiteSettingsEnabled={settings.setSiteSettingsEnabled}
        />
      </div>
    </div>
  )
}
