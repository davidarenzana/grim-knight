import { test, expect } from '@playwright/test'

// End-to-end smoke flows: the real build boots, the menus route, and the Phaser
// game starts and survives input. Fails the test if the page throws.
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err
  })
})

test('title screen → START → the game canvas boots', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /GRIM/ })).toBeVisible()
  await page.getByRole('button', { name: 'START' }).click()
  // GameCanvas mounts a <canvas> once the screen is `playing`.
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 })
})

test('SELECT STAGE → pick a stage → the game canvas boots', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'SELECT STAGE' }).click()
  const stages = page.locator('button.stage')
  await expect(stages).toHaveCount(6)
  await stages.nth(1).click()
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 })
})

test('keyboard input drives the running game without crashing', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'START' }).click()
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 })
  // Move, throw (Z) and swap (X) — the NES-style controls.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('KeyZ')
  await page.keyboard.press('KeyX')
  await page.waitForTimeout(500)
  // Still alive and rendering (no pageerror fired, canvas present).
  await expect(page.locator('canvas')).toBeVisible()
})

test('HIGH SCORES → the ranking opens and returns to the menu', async ({ page }) => {
  await page.goto('/')
  // Start from a clean table so the empty-state copy is deterministic.
  await page.evaluate(() => localStorage.removeItem('grim:highscores'))
  await page.reload()
  await page.getByRole('button', { name: 'HIGH SCORES' }).click()
  await expect(page.getByRole('heading', { name: 'HIGH SCORES' })).toBeVisible()
  await expect(page.getByText(/NO SCORES YET/)).toBeVisible()
  await page.getByRole('button', { name: 'MENU' }).click()
  await expect(page.getByRole('heading', { name: /GRIM/ })).toBeVisible()
})
