import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from '../icons'
import { FieldSelect } from './primitives/FieldSelect'
import { InfoMark } from './primitives/InfoMark'
import { StepInput } from './primitives/StepInput'
import { Toggle } from './primitives/Toggle'
import type { EncodingMode } from '../../types'
import type { AppState } from '../state'
import {
  AUTO_STOP_DEFAULT_SEC,
  ENCODING_CHOICES,
  FPS_CHOICES,
  MIME_CHOICES,
  PRESET_BPS,
} from '../utils/constants'
import { fmtMbps } from '../utils/formatters'
import { t } from '../utils/messages'

interface Props {
  state: AppState
  supported: Record<string, boolean>
  onSetFps: (fps: number) => void
  onSetBitratePreset: (bps: number) => void
  onSetMime: (mime: string) => void
  onSetEncodingMode: (mode: EncodingMode) => void
  onSetPump: (pump: boolean) => void
  onSetAutoStopSec: (sec: number) => void
  onSetStartDelaySec: (sec: number) => void
  onSetSiteSettingsEnabled: (enabled: boolean) => void
}

function SettingsGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section className="settings-group">
      <h2 className="settings-group__title">{label}</h2>
      <div className="settings-group__body">{children}</div>
    </section>
  )
}

// SettingsDrawer: collapsible settings drawer.
export function SettingsPanel({
  state,
  supported,
  onSetFps,
  onSetBitratePreset,
  onSetMime,
  onSetEncodingMode,
  onSetPump,
  onSetAutoStopSec,
  onSetStartDelaySec,
  onSetSiteSettingsEnabled,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    fps,
    bitratePreset,
    mime,
    encodingMode,
    pump,
    autoStopSec,
    startDelaySec,
    settingsHost,
    siteSettingsEnabled,
  } = state

  const fpsOptions = Array.from(new Set([...FPS_CHOICES, fps])).sort(
    (a, b) => a - b,
  )

  // Current-value summary that remains visible while collapsed.
  const encodingLabelKey =
    ENCODING_CHOICES.find((m) => m.value === encodingMode)?.labelKey ??
    'encodingMediaRecorder'
  const scopeLabel =
    siteSettingsEnabled && settingsHost ? ` · ${t('siteProfileSummary')}` : ''
  const summary = `${fps}fps · ${fmtMbps(bitratePreset)}Mbps · ${t(encodingLabelKey).toLowerCase()}${scopeLabel}`
  // Settings that change what pressing record does. They are pinned rather
  // than appended, because an appended mark is the first thing an ellipsis
  // eats — and these are exactly the ones you lose by not seeing.
  const armedMarks = [
    startDelaySec > 0 ? t('delaySummary', String(startDelaySec)) : null,
    autoStopSec > 0 ? t('autoStopSummary', String(autoStopSec)) : null,
    pump ? t('pumpSummary') : null,
  ].filter((mark): mark is string => mark !== null)
  const autoStopEnabled = autoStopSec > 0

  return (
    <div className="settings-panel">
      {/* DrawerTrigger: toggle with current-value summary */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="settings-drawer"
        onClick={() => setIsOpen((v) => !v)}
        className="settings-panel__trigger"
      >
        <div className="settings-panel__trigger-copy">
          <span className="settings-panel__label">{t('settings')}</span>
          {!isOpen && (
            <span className="settings-panel__summary">{summary}</span>
          )}
          {!isOpen && armedMarks.length > 0 && (
            <span className="settings-panel__marks">
              {armedMarks.map((mark) => (
                <span key={mark} className="settings-panel__mark">
                  {mark}
                </span>
              ))}
            </span>
          )}
        </div>
        <span aria-hidden="true" className="settings-panel__chevron">
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {/* DrawerContent — expand/collapse */}
      <div
        id="settings-drawer"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={[
          'settings-panel__drawer',
          isOpen ? 'settings-panel__drawer--open' : '',
        ].join(' ')}
      >
        <div className="settings-panel__drawer-clip">
          <div
            className={[
              'settings-panel__content',
              isOpen ? 'settings-panel__content--open' : '',
            ].join(' ')}
          >
            <SettingsGroup label={t('profileSettings')}>
              <div className="settings-row">
                <div className="settings-row__copy">
                  <div className="settings-row__label">{t('siteProfile')}</div>
                  <div className="settings-row__detail">
                    {settingsHost
                      ? siteSettingsEnabled
                        ? t('siteProfileApplied', settingsHost)
                        : t('globalProfileApplied', settingsHost)
                      : t('siteProfileUnavailable')}
                  </div>
                </div>
                <Toggle
                  label={t('siteProfile')}
                  checked={siteSettingsEnabled}
                  disabled={!settingsHost}
                  onChange={onSetSiteSettingsEnabled}
                />
              </div>
            </SettingsGroup>

            <SettingsGroup label={t('encodingSettings')}>
              <FieldSelect
                label={t('encoding')}
                id="encodingMode"
                value={encodingMode}
                onChange={(v) => onSetEncodingMode(v as EncodingMode)}
              >
                {ENCODING_CHOICES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </FieldSelect>

              {/* Format and FPS side by side */}
              <div className="settings-grid">
                <FieldSelect
                  label={t('format')}
                  id="mime"
                  value={mime}
                  onChange={onSetMime}
                  disabled={encodingMode === 'webcodecs'}
                >
                  {MIME_CHOICES.map((opt) => {
                    const isUnsupported =
                      Boolean(opt.value) && supported[opt.value] === false
                    return (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={isUnsupported}
                      >
                        {isUnsupported
                          ? t('unsupportedMarker', t(opt.labelKey))
                          : t(opt.labelKey)}
                      </option>
                    )
                  })}
                </FieldSelect>

                <FieldSelect
                  label={t('frameRate')}
                  id="fps"
                  value={String(fps)}
                  onChange={(v) => onSetFps(Number(v))}
                >
                  {fpsOptions.map((v) => (
                    <option key={v} value={String(v)}>
                      {v} fps
                    </option>
                  ))}
                </FieldSelect>
              </div>

              <FieldSelect
                label={t('bitrate')}
                id="bitratePreset"
                value={String(bitratePreset)}
                onChange={(v) => onSetBitratePreset(+v)}
              >
                {PRESET_BPS.map((v) => (
                  <option key={v} value={String(v)}>
                    {fmtMbps(v)} Mbps
                  </option>
                ))}
              </FieldSelect>
            </SettingsGroup>

            <SettingsGroup label={t('timingSettings')}>
              {/* start delay */}
              <div className="settings-row">
                <label htmlFor="startDelaySec" className="settings-row__label">
                  {t('startDelay')}
                </label>
                <div className="settings-row__control">
                  <StepInput
                    id="startDelaySec"
                    label={t('startDelay')}
                    value={startDelaySec}
                    min={0}
                    onChange={(n) => onSetStartDelaySec(Math.max(0, n))}
                  />
                  <label
                    htmlFor="startDelaySec"
                    className="settings-row__control-label"
                  >
                    {t('secondsUnit')}
                  </label>
                </div>
              </div>

              {/* frame pump */}
              <div className="settings-row">
                <div className="settings-inline-label">
                  <span>{t('framePump')}</span>
                  <InfoMark content={t('infoFramePump')} />
                </div>
                <Toggle
                  label={t('framePump')}
                  checked={pump}
                  onChange={onSetPump}
                />
              </div>

              {/* auto-stop */}
              <div className="settings-row">
                <label htmlFor="autoStopSec" className="settings-row__label">
                  {t('autoStop')}
                </label>
                <div className="settings-row__control">
                  <StepInput
                    id="autoStopSec"
                    label={t('autoStop')}
                    value={autoStopEnabled ? autoStopSec : null}
                    min={1}
                    disabled={!autoStopEnabled}
                    onChange={(n) => onSetAutoStopSec(Math.max(1, n))}
                  />
                  <Toggle
                    label={t('autoStop')}
                    checked={autoStopEnabled}
                    onChange={(checked) => {
                      onSetAutoStopSec(checked ? AUTO_STOP_DEFAULT_SEC : 0)
                    }}
                  />
                </div>
              </div>
            </SettingsGroup>
          </div>
        </div>
      </div>
    </div>
  )
}
