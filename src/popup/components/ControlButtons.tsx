import type { ReactNode } from 'react'
import type { RecordingPhase } from '../../types'
import { Pause, Play, RotateCcw, Square, Video } from '../icons'
import { t } from '../utils/messages'

interface Props {
  phase: RecordingPhase
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
  phase,
  pickedCanvas,
  onStart,
  onStop,
  onPause,
  onResume,
  onArmAndReload,
}: Props) {
  const busy = phase !== 'idle'
  const capturing = phase === 'recording' || phase === 'paused'
  const paused = phase === 'paused'
  const primaryDisabled = !pickedCanvas && !busy
  const armDisabled = !pickedCanvas || busy
  const primaryHint = primaryDisabled ? t('selectCanvasFirst') : null
  const armHint = !pickedCanvas
    ? t('selectCanvasFirst')
    : busy
      ? t('stopRecordingBeforeReload')
      : null

  return (
    <div className="record-controls">
      {/* RecordAction: primary action */}
      <DisabledHint hint={primaryHint}>
        <button
          type="button"
          aria-pressed={busy}
          disabled={primaryDisabled}
          onClick={busy ? onStop : onStart}
          className={[
            'button button--wide button--primary',
            capturing ? 'button--recording' : '',
            phase === 'pending' ? 'button--pending' : '',
          ].join(' ')}
        >
          {phase === 'pending' ? (
            <>
              <Square size={13} />
              <span>{t('cancelStart')}</span>
            </>
          ) : capturing ? (
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

      {capturing && (
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
