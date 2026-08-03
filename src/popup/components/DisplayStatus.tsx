import { t } from '../utils/messages'

interface Props {
  recording: boolean
  paused: boolean
  elapsed: string
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
  recording,
  paused,
  elapsed,
  lastSaved,
  error,
}: Props) {
  const displayError = error ? clarifyError(error) : null

  return (
    <div
      className={[
        'display-status',
        displayError && !recording ? 'display-status--error' : '',
      ].join(' ')}
      role={displayError && !recording ? 'alert' : 'status'}
      aria-live="polite"
    >
      {recording ? (
        <div className="display-status__recording">
          <span
            aria-hidden="true"
            className="status-dot status-dot--recording"
          />
          <span
            className={[
              'display-status__label',
              paused ? 'display-status__label--paused' : '',
            ].join(' ')}
          >
            {paused ? t('paused') : t('rec')}
          </span>
          <span className="display-status__elapsed">{elapsed}</span>
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
