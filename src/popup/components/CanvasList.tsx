import type { CanvasInfo, RecordingPhase } from '../../types'
import type { KeyboardEvent } from 'react'
import { ImageDown, MousePointer2, RefreshCcw } from '../icons'
import { t } from '../utils/messages'
import { FixedWidth } from './primitives/FixedWidth'
import { DisplayStatus } from './DisplayStatus'

interface Props {
  canvasList: CanvasInfo[]
  pickedCanvas: {
    id: string
    frameId: number
    width: number
    height: number
  } | null
  scanning: boolean
  picking: boolean
  phase: RecordingPhase
  pendingRemainingMs: number
  elapsedMs: number | null
  lastSaved: string | null
  error: string | null
  onPick: (c: CanvasInfo) => void
  onSaveSnapshot: (c: CanvasInfo) => void
  onScan: () => void
  onPickOnPage: () => void
}

// CanvasStream: renders the detected canvases as a selectable stream.
// Entry: one selectable canvas item.
function Entry({
  canvas,
  isPicked,
  selectionLocked,
  capturing,
  onPick,
  onSaveSnapshot,
}: {
  canvas: CanvasInfo
  isPicked: boolean
  selectionLocked: boolean
  capturing: boolean
  onPick: (c: CanvasInfo) => void
  onSaveSnapshot: (c: CanvasInfo) => void
}) {
  const label = canvas.domId
    ? `#${canvas.domId}`
    : canvas.classes?.length
      ? `.${canvas.classes[0]}`
      : null

  // Selection locks from 'pending' on, but the capture marker only belongs on
  // a canvas whose frames are actually being taken.
  const isActive = isPicked && capturing
  const frameId = canvas.frameId ?? 0
  const rowClassName = [
    'canvas-row',
    isPicked ? 'canvas-row--picked' : '',
    isActive ? 'canvas-row--recording' : '',
    selectionLocked ? 'canvas-row--locked' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const thumbClassName = [
    'canvas-row__thumb',
    isActive
      ? 'canvas-row__thumb--recording'
      : isPicked
        ? 'canvas-row__thumb--selected'
        : '',
  ]
    .filter(Boolean)
    .join(' ')

  const snapshotDisabled = selectionLocked || !!canvas.tainted
  // Carried by the control instead of a line of its own: a reason that comes
  // and goes with the recording state would resize every row under it.
  const snapshotReason = canvas.tainted
    ? t('crossOriginTainted')
    : selectionLocked
      ? t('lockedWhileRecording')
      : null
  const snapshotLabel = snapshotReason
    ? `${t('saveCanvasPng', canvas.id)} - ${snapshotReason}`
    : t('saveCanvasPng', canvas.id)

  return (
    <div
      data-picked={isPicked}
      data-recording={isActive}
      className={rowClassName}
    >
      <button
        type="button"
        data-canvas-select="true"
        aria-pressed={isPicked}
        disabled={selectionLocked}
        title={
          selectionLocked
            ? t('canvasSelectionLocked')
            : t('selectCanvas', canvas.id)
        }
        onClick={() => onPick(canvas)}
        className="canvas-row__select"
      >
        {/* Thumbnail: the canvas itself, kept clear of anything said about it */}
        <div className={thumbClassName}>
          {canvas.thumb ? (
            <img
              src={canvas.thumb}
              alt={t('canvasPreview', canvas.id)}
              className="canvas-row__thumb-img"
            />
          ) : (
            <div className="canvas-row__thumb-fallback">
              {canvas.isVisible
                ? canvas.tainted
                  ? t('tainted')
                  : '-'
                : t('hidden')}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="canvas-row__meta">
          <div className="canvas-row__line">
            <span className="canvas-row__badge">#{canvas.id}</span>
            {label && <span className="canvas-row__label">{label}</span>}
            <span className="canvas-row__dimensions">
              {canvas.width}×{canvas.height}
            </span>
          </div>
          {/* Where it is, on its own line, so identity keeps the first one */}
          <div className="canvas-row__position">
            {t('position')} {canvas.x},{canvas.y}
            {frameId !== 0 && (
              <span className="canvas-row__frame">
                {t('frame')} {frameId}
              </span>
            )}
            {canvas.tainted && (
              <span className="canvas-row__tainted">{t('tainted')}</span>
            )}
          </div>
        </div>
      </button>

      <div className="canvas-row__snapshot">
        <button
          type="button"
          aria-label={snapshotLabel}
          title={snapshotReason ?? undefined}
          aria-disabled={snapshotDisabled}
          disabled={snapshotDisabled}
          onClick={() => onSaveSnapshot(canvas)}
          className="button button--icon canvas-row__snapshot-button"
        >
          <ImageDown size={13} />
        </button>
      </div>

      {/* Selection dot */}
      <span
        aria-hidden="true"
        className={[
          'status-dot',
          isActive
            ? 'status-dot--recording'
            : isPicked
              ? 'status-dot--selected'
              : '',
        ].join(' ')}
      />
    </div>
  )
}

export function CanvasList({
  canvasList,
  pickedCanvas,
  scanning,
  picking,
  phase,
  pendingRemainingMs,
  elapsedMs,
  lastSaved,
  error,
  onPick,
  onSaveSnapshot,
  onScan,
  onPickOnPage,
}: Props) {
  // A pending start is already armed, so selection is locked from 'pending' on.
  const busy = phase !== 'idle'
  const capturing = phase === 'recording' || phase === 'paused'
  const pickOnPageDisabled = busy || picking
  const handleListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        'button[data-canvas-select="true"]:not(:disabled)',
      ),
    )
    if (buttons.length === 0) return

    const currentIndex = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    )
    const nextIndex =
      event.key === 'ArrowDown'
        ? Math.min(buttons.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1)

    if (currentIndex !== nextIndex) {
      event.preventDefault()
      buttons[nextIndex]?.focus()
    }
  }

  return (
    <div className="canvas-list">
      {/* ScanAction: scan trigger */}
      <div className="canvas-list__toolbar">
        <button
          type="button"
          disabled={pickOnPageDisabled}
          onClick={onPickOnPage}
          className="button button--command"
        >
          <MousePointer2 size={11} />
          <FixedWidth options={[t('pickOnPage'), t('pickingOnPage')]}>
            {picking ? t('pickingOnPage') : t('pickOnPage')}
          </FixedWidth>
        </button>
        <button
          type="button"
          disabled={scanning}
          onClick={onScan}
          className="button button--command"
        >
          <span
            className={
              scanning
                ? 'button__spinner button__spinner--active'
                : 'button__spinner'
            }
          >
            <RefreshCcw size={11} />
          </span>
          <FixedWidth options={[t('scan'), t('scanning'), t('rescan')]}>
            {scanning
              ? t('scanning')
              : canvasList.length > 0
                ? t('rescan')
                : t('scan')}
          </FixedWidth>
        </button>
      </div>

      <DisplayStatus
        phase={phase}
        pendingRemainingMs={pendingRemainingMs}
        elapsedMs={elapsedMs}
        lastSaved={lastSaved}
        error={error}
      />

      {/* CanvasStream: item stream */}
      <section
        aria-label={t('canvasDisplay')}
        onKeyDown={handleListKeyDown}
        className="canvas-list__display"
      >
        {canvasList.length === 0 && !scanning ? (
          <div className="canvas-list__empty">{t('noCanvasesFound')}</div>
        ) : (
          canvasList.map((c) => {
            const frameId = c.frameId ?? 0
            return (
              <Entry
                key={`${frameId}:${c.id}`}
                canvas={c}
                isPicked={
                  pickedCanvas?.id === c.id && pickedCanvas.frameId === frameId
                }
                selectionLocked={busy}
                capturing={capturing}
                onPick={onPick}
                onSaveSnapshot={onSaveSnapshot}
              />
            )
          })
        )}
      </section>
    </div>
  )
}
