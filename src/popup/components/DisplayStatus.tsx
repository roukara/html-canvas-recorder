import type { ErrorCode, RecordingPhase } from '../../types'
import { fmtCountdownSec, fmtElapsed } from '../utils/formatters'
import { t } from '../utils/messages'
import { FixedWidth } from './primitives/FixedWidth'

interface Props {
  phase: RecordingPhase
  pendingRemainingMs: number
  elapsedMs: number | null
  lastSaved: string | null
  error: string | null
  errorCode: ErrorCode | null
}

/**
 * A hint only for causes that were established at the source. An unrecognised
 * failure gets its message and nothing else — inventing advice for a cause
 * nobody determined is the same as claiming to know it.
 */
const HINT_BY_CODE: Partial<Record<ErrorCode, string>> = {
  'canvas-missing': 'hintCanvasMissing',
  'capture-unsupported': 'hintCaptureUnsupported',
  'encoder-unavailable': 'hintEncoderUnavailable',
  'cross-origin-tainted': 'hintCrossOriginTainted',
  'no-content-script': 'hintNoContentScript',
}

function hintFor(code: ErrorCode | null): string | null {
  if (!code) return null
  const key = HINT_BY_CODE[code]
  return key ? t(key) : null
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
  errorCode,
}: Props) {
  const hint = hintFor(errorCode)

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
              <FixedWidth options={[t('rec'), t('paused')]}>
                {phase === 'paused' ? t('paused') : t('rec')}
              </FixedWidth>
            </span>
            <span className="display-status__elapsed">
              {elapsedMs == null ? '' : fmtElapsed(elapsedMs)}
            </span>
          </div>
        ) : lastSaved && !error ? (
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
        title={error ? [error, hint].filter(Boolean).join(' ') : undefined}
      >
        {error && (
          <>
            <span className="display-status__error-message">{error}</span>
            {hint && (
              <>
                {' '}
                <span className="display-status__error-hint">{hint}</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
