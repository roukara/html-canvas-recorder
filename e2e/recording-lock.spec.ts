import { expect, test } from '@playwright/test'
import {
  canvasRows,
  expectPhaseLabel,
  openPopup,
  pickFirstCanvas,
  rescanButton,
} from './popup'

/**
 * While a recording is armed or running the selection is locked, so anything
 * that would replace the list is locked with it: offering a rescan whose
 * result cannot be selected is offering an action that does nothing.
 */
test('rescanning is locked while a recording is under way', async ({
  page,
}) => {
  await openPopup(page)
  await pickFirstCanvas(page)
  await expect(rescanButton(page)).toBeEnabled()

  await page.getByRole('button', { name: 'start recording' }).click()
  await expectPhaseLabel(page, 'REC')

  await expect(rescanButton(page)).toBeDisabled()
  await expect(rescanButton(page)).toHaveAttribute(
    'title',
    'locked while recording',
  )
  await expect(canvasRows(page).first()).toBeDisabled()

  await page.getByRole('button', { name: 'pause recording' }).click()
  await expectPhaseLabel(page, 'PAUSED')
  await expect(rescanButton(page)).toBeDisabled()

  await page.getByRole('button', { name: 'stop & save' }).click()
  await expect(rescanButton(page)).toBeEnabled()
  await expect(canvasRows(page).first()).toBeEnabled()
})
