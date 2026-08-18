import type { RecordingPhase } from '../../types'
import { fmtCountdownSec, fmtElapsed } from '../utils/formatters'
import { t } from '../utils/messages'

interface Props {
  phase: RecordingPhase
  pendingRemainingMs: number
  elapsedMs: number | null
  lastSaved: string | null
  error: string | null
}

function clarifyError(error: string): { message: string; hint: string } {
  const normalized = error.toLowerCase()

  if (normalized.includes('permission')) {
    return {
      message: error,
      hint: t('errorPermissionHint'),
    }
  }
  if (normalized.includes('canvas')) {
    return {
      message: error,
      hint: t('errorCanvasHint'),
    }
  }
  return {
    message: error,
    hint: t('errorDefaultHint'),
  }
}

// DisplayStatus: status readout for the selected canvas.
// The phase and the last failure are separate rows: a failure during recording
// must not be swallowed by the REC readout, and REC must not be swallowed by a
// failure. Either can be true at the same time, so either can be on screen.
export function DisplayStatus({
  phase,
  pendingRemainingMs,
  elapsedMs,
  lastSaved,
  error,
}: Props) {
  const displayError = error ? clarifyError(error) : null

  return (
    <div className="display-status">
      <div className="display-status__phase" role="status" aria-live="polite">
        {phase === 'pending' ? (
          // Nothing is captured yet: no REC, no elapsed time.
          <div className="display-status__recording">
            <span
              aria-hidden="true"
              className="status-dot status-dot--pending"
            />
            <span className="display-status__label display-status__label--pending">
              {t('starting')}
            </span>
            <span className="display-status__elapsed">
              {t('countdownSeconds', fmtCountdownSec(pendingRemainingMs))}
            </span>
          </div>
        ) : phase === 'recording' || phase === 'paused' ? (
          // Filled while frames are being taken, hollow while held.
          <div
            className={[
              'display-status__chip',
              phase === 'paused' ? 'display-status__chip--paused' : '',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className="status-dot status-dot--recording"
            />
            <span className="display-status__label">
              {phase === 'paused' ? t('paused') : t('rec')}
            </span>
            <span className="display-status__elapsed">
              {elapsedMs == null ? '' : fmtElapsed(elapsedMs)}
            </span>
          </div>
        ) : lastSaved && !displayError ? (
          <div className="display-status__saved">
            <span className="display-status__saved-label">{t('saved')}</span>
            <span className="display-status__saved-file" title={lastSaved}>
              {lastSaved}
            </span>
          </div>
        ) : null}
      </div>

      {/* Always occupies its line, so an arriving failure never pushes the
          canvas list down. One line, because the message comes from the page
          and cannot be enumerated; the full text stays in the title. */}
      <div
        className="display-status__error"
        role="alert"
        title={
          displayError
            ? `${displayError.message} ${displayError.hint}`
            : undefined
        }
      >
        {displayError && (
          <>
            <span className="display-status__error-message">
              {displayError.message}
            </span>{' '}
            <span className="display-status__error-hint">
              {displayError.hint}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
