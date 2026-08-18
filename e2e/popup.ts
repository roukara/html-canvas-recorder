import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const POPUP_URL = '/src/popup/index.html'
const SETTINGS_KEY = 'recorder_settings'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Anchors that sit next to a display that changes while a recording runs. */
export interface Layout {
  toolbar: Box
  status: Box
  display: Box
}

interface OpenOptions {
  startDelaySec?: number
}

/**
 * Opens the popup against the dev Chrome mock. Settings are seeded before load
 * so a test can reach a phase (a delayed start) without going through the
 * settings panel, and the popup's own opening scan is awaited: every test
 * starts from a page whose canvases are already on screen, as a user sees it.
 */
export async function openPopup(
  page: Page,
  { startDelaySec = 0 }: OpenOptions = {},
): Promise<void> {
  await page.addInitScript(
    ([key, delay]) => {
      localStorage.setItem(
        `mock.chrome.storage.local.${key as string}`,
        JSON.stringify({
          global: {
            fps: 60,
            bitratePreset: 8_000_000,
            mime: '',
            encodingMode: 'mediarecorder',
            autoStopSec: 0,
            startDelaySec: delay as number,
          },
          hosts: {},
        }),
      )
    },
    [SETTINGS_KEY, startDelaySec] as const,
  )
  await page.goto(POPUP_URL)
  await expect(page.locator('.canvas-row')).toHaveCount(2)
}

/** Names a failure the page will report; the test then clicks as a user would. */
export async function injectFaults(
  page: Page,
  faults: {
    silentFrames?: number[]
    failing?: Record<string, { message: string; code?: string }>
  },
): Promise<void> {
  await page.evaluate((value) => {
    sessionStorage.setItem('mock_faults', JSON.stringify(value))
  }, faults)
}

export async function clearFaults(page: Page): Promise<void> {
  await page.evaluate(() => sessionStorage.removeItem('mock_faults'))
}

export const rescanButton = (page: Page) =>
  page.locator('.canvas-list__toolbar .button--command').nth(1)

export const canvasRows = (page: Page) =>
  page.locator('button[data-canvas-select="true"]')

export async function pickFirstCanvas(page: Page): Promise<void> {
  await canvasRows(page).first().click()
  await expect(canvasRows(page).first()).toHaveAttribute('aria-pressed', 'true')
}

/**
 * The one word the readout shows for the current phase. Read as innerText so
 * the assertion does not depend on how the slot is reserved: the reserved
 * width is what the test measures, not what it looks the phase up by.
 */
export async function expectPhaseLabel(
  page: Page,
  text: string,
): Promise<void> {
  await expect(page.locator('.display-status__label').first()).toHaveText(
    text,
    { useInnerText: true },
  )
}

async function boxOf(page: Page, selector: string): Promise<Box> {
  const found = await page.locator(selector).first().boundingBox()
  if (!found) throw new Error(`${selector} has no box`)
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    x: round(found.x),
    y: round(found.y),
    width: round(found.width),
    height: round(found.height),
  }
}

export async function measureLayout(page: Page): Promise<Layout> {
  return {
    toolbar: await boxOf(page, '.canvas-list__toolbar'),
    status: await boxOf(page, '.display-status'),
    display: await boxOf(page, '.canvas-list__display'),
  }
}

export async function elapsedBox(page: Page): Promise<Box> {
  return boxOf(page, '.display-status__elapsed')
}
