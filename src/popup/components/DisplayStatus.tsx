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
export function DisplayStatus({
  phase,
  pendingRemainingMs,
  elapsedMs,
  lastSaved,
  error,
}: Props) {
  const displayError = error ? clarifyError(error) : null
  const isIdle = phase === 'idle'

  return (
    <div
      className={[
        'display-status',
        displayError && isIdle ? 'display-status--error' : '',
      ].join(' ')}
      role={displayError && isIdle ? 'alert' : 'status'}
      aria-live="polite"
    >
      {phase === 'pending' ? (
        // Nothing is captured yet: no REC, no elapsed time.
        <div className="display-status__recording">
          <span aria-hidden="true" className="status-dot status-dot--pending" />
          <span className="display-status__label display-status__label--pending">
            {t('starting')}
          </span>
          <span className="display-status__elapsed">
            {t('countdownSeconds', fmtCountdownSec(pendingRemainingMs))}
          </span>
        </div>
      ) : phase === 'recording' || phase === 'paused' ? (
        <div className="display-status__recording">
          <span
            aria-hidden="true"
            className="status-dot status-dot--recording"
          />
          <span
            className={[
              'display-status__label',
              phase === 'paused' ? 'display-status__label--paused' : '',
            ].join(' ')}
          >
            {phase === 'paused' ? t('paused') : t('rec')}
          </span>
          <span className="display-status__elapsed">
            {elapsedMs == null ? '' : fmtElapsed(elapsedMs)}
          </span>
        </div>
      ) : displayError ? (
        <div
          className="display-status__error"
          title={`${displayError.message} ${displayError.hint}`}
        >
          <div className="display-status__error-message">
            {displayError.message}
          </div>
          <div className="display-status__error-hint">{displayError.hint}</div>
        </div>
      ) : lastSaved ? (
        <div className="display-status__saved">
          <span className="display-status__saved-label">{t('saved')}</span>
          <span className="display-status__saved-file" title={lastSaved}>
            {lastSaved}
          </span>
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  )
}
