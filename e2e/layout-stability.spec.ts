import { expect, test } from '@playwright/test'
import {
  clearFaults,
  elapsedBox,
  expectPhaseLabel,
  injectFaults,
  measureLayout,
  openPopup,
  pickFirstCanvas,
  type Layout,
} from './popup'

/**
 * A display that changes while a recording runs must not move what sits next
 * to it: the canvas list has to stay exactly where the user left it, whatever
 * the readout above it says. This was measured by hand once; here the
 * measurement itself is the test, so a later change cannot quietly undo it.
 */
test('the status readout never moves the canvas list', async ({ page }) => {
  await openPopup(page, { startDelaySec: 2 })
  await pickFirstCanvas(page)

  const table = new Map<string, Layout>()
  const record = async (state: string) => {
    table.set(state, await measureLayout(page))
  }

  await record('idle')

  // A delayed start: armed, but nothing captured yet.
  await page.getByRole('button', { name: 'start recording' }).click()
  await expectPhaseLabel(page, 'STARTING')
  await record('pending')

  await expect
    .poll(async () => page.locator('.display-status__chip').count(), {
      timeout: 6000,
    })
    .toBe(1)
  await expectPhaseLabel(page, 'REC')
  await record('recording')

  await page.getByRole('button', { name: 'pause recording' }).click()
  await expectPhaseLabel(page, 'PAUSED')
  await record('paused')

  await page.getByRole('button', { name: 'resume recording' }).click()
  await expectPhaseLabel(page, 'REC')

  // A failure arriving mid-recording: it must be shown, it must not push the
  // list down, and it must not take REC off the screen.
  await injectFaults(page, {
    failing: {
      PAUSE: { message: 'Canvas not found.', code: 'canvas-missing' },
    },
  })
  await page.getByRole('button', { name: 'pause recording' }).click()
  await expect(page.locator('.display-status__error-message')).toHaveText(
    'Canvas not found.',
  )
  await expectPhaseLabel(page, 'REC')
  await record('recording+error')
  await clearFaults(page)

  await page.getByRole('button', { name: 'stop & save' }).click()
  await expect(page.locator('.display-status__saved-label')).toBeVisible()
  await record('saved')

  // A failure at rest, with the list unchanged behind it.
  await injectFaults(page, {
    failing: {
      SAVE_SNAPSHOT: {
        message: 'Cannot save PNG snapshot.',
        code: 'cross-origin-tainted',
      },
    },
  })
  await page.locator('.canvas-row__snapshot-button').first().click()
  await expect(page.locator('.display-status__error-message')).toHaveText(
    'Cannot save PNG snapshot.',
  )
  await record('idle+error')

  const baseline = table.get('idle')
  expect(baseline).toBeDefined()
  for (const [state, layout] of table) {
    expect(layout, `layout in state "${state}"`).toEqual(baseline)
  }
})

/**
 * REC and PAUSED are different lengths, so the slot holding them is reserved
 * at the wider one. Otherwise the elapsed time slides sideways every time the
 * user pauses.
 */
test('the elapsed time stays put across REC and PAUSED', async ({ page }) => {
  await openPopup(page)
  await pickFirstCanvas(page)

  await page.getByRole('button', { name: 'start recording' }).click()
  await expectPhaseLabel(page, 'REC')
  const recording = await elapsedBox(page)

  await page.getByRole('button', { name: 'pause recording' }).click()
  await expectPhaseLabel(page, 'PAUSED')
  const paused = await elapsedBox(page)

  expect(paused.x).toBe(recording.x)
})
