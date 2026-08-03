import type { ReactNode } from 'react'
import { Pause, Play, RotateCcw, Square, Video } from '../icons'
import { t } from '../utils/messages'

interface Props {
  recording: boolean
  paused: boolean
  pickedCanvas: { id: string } | null
  onStart: () => void
  onStop: () => void
  onPause: () => void
  onResume: () => void
  onArmAndReload: () => void
}

function DisabledHint({
  hint,
  children,
}: {
  hint: string | null
  children: ReactNode
}) {
  if (!hint) return children

  return (
    <span tabIndex={0} aria-label={hint} className="disabled-hint">
      {children}
      <span role="tooltip" className="disabled-hint__tooltip">
        {hint}
      </span>
    </span>
  )
}

// RecordAction: primary control for starting and stopping recording.
// ArmAction: secondary control for recording immediately after page reload.
export function ControlButtons({
  recording,
  paused,
  pickedCanvas,
  onStart,
  onStop,
  onPause,
  onResume,
  onArmAndReload,
}: Props) {
  const primaryDisabled = !pickedCanvas && !recording
  const armDisabled = !pickedCanvas || recording
  const primaryHint = primaryDisabled ? t('selectCanvasFirst') : null
  const armHint = !pickedCanvas
    ? t('selectCanvasFirst')
    : recording
      ? t('stopRecordingBeforeReload')
      : null

  return (
    <div className="record-controls">
      {/* RecordAction: primary action */}
      <DisabledHint hint={primaryHint}>
        <button
          type="button"
          aria-pressed={recording}
          disabled={primaryDisabled}
          onClick={recording ? onStop : onStart}
          className={[
            'button button--wide button--primary',
            recording ? 'button--recording' : '',
          ].join(' ')}
        >
          {recording ? (
            <>
              <Square size={13} />
              <span>{t('stopAndSave')}</span>
            </>
          ) : (
            <>
              <Video size={13} />
              <span>{t('startRecording')}</span>
            </>
          )}
        </button>
      </DisabledHint>

      {recording && (
        <button
          type="button"
          aria-pressed={paused}
          onClick={paused ? onResume : onPause}
          className="button button--wide button--secondary"
        >
          {paused ? (
            <>
              <Play size={11} />
              <span>{t('resumeRecording')}</span>
            </>
          ) : (
            <>
              <Pause size={11} />
              <span>{t('pauseRecording')}</span>
            </>
          )}
        </button>
      )}

      {/* ArmAction: secondary reload-start action */}
      <DisabledHint hint={armHint}>
        <button
          type="button"
          disabled={armDisabled}
          onClick={onArmAndReload}
          className="button button--wide button--secondary"
        >
          <RotateCcw size={11} />
          <span>{t('armSelectedReload')}</span>
        </button>
      </DisabledHint>
    </div>
  )
}
