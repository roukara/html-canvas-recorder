import { expect, test } from '@playwright/test'
import { canvasRows, injectFaults, openPopup, rescanButton } from './popup'

/**
 * Scanning has three outcomes and they are not the same thing: every frame
 * answered; some frames could not be read; nothing answered at all. Collapsing
 * them makes the popup claim it knows the page when it does not.
 */
test.describe('scan outcomes', () => {
  test('every frame answers: the list is complete and says nothing more', async ({
    page,
  }) => {
    await openPopup(page)
    await rescanButton(page).click()

    await expect(canvasRows(page)).toHaveCount(2)
    await expect(page.locator('.canvas-list__note')).toHaveCount(0)
    await expect(page.locator('.display-status__error-message')).toHaveCount(0)
  })

  test('one frame is unreadable: what was found is shown, with a caveat', async ({
    page,
  }) => {
    await openPopup(page)
    await injectFaults(page, { silentFrames: [7] })
    await rescanButton(page).click()

    await expect(canvasRows(page)).toHaveCount(1)
    await expect(page.locator('.canvas-list__note')).toHaveText(
      '1 frame(s) could not be read',
    )
    // Not an error: an iframe without a content script is ordinary.
    await expect(page.locator('.display-status__error-message')).toHaveCount(0)
  })

  test('no frame answers: nothing is claimed and the stale list is dropped', async ({
    page,
  }) => {
    await openPopup(page)
    await injectFaults(page, { silentFrames: [0, 7] })
    await rescanButton(page).click()

    // Canvases that could not be confirmed must not stay on screen.
    await expect(canvasRows(page)).toHaveCount(0)
    await expect(page.locator('.canvas-list__empty')).toHaveText(
      'no canvases found - 2 frame(s) could not be read',
    )
    await expect(page.locator('.display-status__error-message')).toHaveText(
      'No content script responded in this tab.',
    )
    await expect(page.locator('.display-status__error-hint')).toHaveText(
      'Reload the page, then scan again.',
    )
  })
})
