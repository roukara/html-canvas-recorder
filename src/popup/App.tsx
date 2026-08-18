import { useEffect } from 'react'
import { CanvasList } from './components/CanvasList'
import { ControlButtons } from './components/ControlButtons'
import { SettingsPanel } from './components/SettingsPanel'
import { useCanvasActions } from './hooks/useCanvasActions'
import { useAppState } from './hooks/useAppState'
import { usePopupLifecycle } from './hooks/usePopupLifecycle'
import { useRecordingActions } from './hooks/useRecordingActions'
import { useRecordingStatus } from './hooks/useRecordingStatus'
import { useSettingsPersistence } from './hooks/useSettingsPersistence'
import { FORMAT_CHOICES } from './utils/constants'
import { t } from './utils/messages'

function getFormatSupport(): Record<string, boolean> {
  const support: Record<string, boolean> = {}
  for (const choice of FORMAT_CHOICES) {
    if (choice.encodingMode === 'webcodecs') {
      support[choice.value] = typeof VideoEncoder !== 'undefined'
    } else if (choice.mime) {
      support[choice.value] =
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported(choice.mime)
    } else {
      support[choice.value] = true
    }
  }
  return support
}

const formatSupport = getFormatSupport()

export function App() {
  const state = useAppState()
  const refreshStatus = useRecordingStatus()
  const settings = useSettingsPersistence()
  const { scan, pickCanvas, saveSnapshot, startPagePicker, armAndReload } =
    useCanvasActions()
  const { startRecording, stopRecording, pauseRecording, resumeRecording } =
    useRecordingActions(refreshStatus)

  usePopupLifecycle(scan, refreshStatus)

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
          picking={state.picking}
          phase={state.phase}
          pendingRemainingMs={state.pendingRemainingMs}
          elapsedMs={state.elapsedMs}
          lastSaved={state.lastSaved}
          error={state.error}
          errorCode={state.errorCode}
          unreadableFrames={state.unreadableFrames}
          onPick={pickCanvas}
          onSaveSnapshot={saveSnapshot}
          onScan={scan}
          onPickOnPage={startPagePicker}
        />

        {/* Rule */}
        <div className="popup__divider" />

        {/* RecordAction + ArmAction */}
        <ControlButtons
          phase={state.phase}
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
          supported={formatSupport}
          onSetFps={settings.setFps}
          onSetBitratePreset={settings.setBitratePreset}
          onSetFormat={settings.setFormat}
          onSetAutoStopSec={settings.setAutoStopSec}
          onSetStartDelaySec={settings.setStartDelaySec}
          onSetSiteSettingsEnabled={settings.setSiteSettingsEnabled}
        />
      </div>
    </div>
  )
}
