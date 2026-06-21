import { test, expect } from '@playwright/test'

// Visual-regression baselines for the front-end menus (stable DOM/CSS). These
// catch the layout/styling bug class — oversized buttons, broken backdrops,
// overlap — that no headless test can see. The live game canvas is intentionally
// NOT snapshotted (animated + RNG loot ⇒ non-deterministic).

test('title screen matches the baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /GRIM/ })).toBeVisible()
  await page.waitForLoadState('networkidle') // boss art + pixel font loaded
  await page.evaluate(() => document.fonts.ready)
  await expect(page).toHaveScreenshot('title-screen.png')
})

test('stage-select screen matches the baseline', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'SELECT STAGE' }).click()
  await expect(page.locator('button.stage').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await expect(page).toHaveScreenshot('stage-select.png')
})
