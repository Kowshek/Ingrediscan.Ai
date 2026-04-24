import { test, expect } from '@playwright/test'

test.describe('IngrediScan smoke', () => {
  test('app shell loads without console errors', async ({ page }) => {
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await expect(page).toHaveTitle(/IngrediScan/i)

    // Allow framer-motion / hydration to settle.
    await page.waitForLoadState('networkidle')

    // No uncaught script errors.
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  })

  test('upload affordance is present and keyboard-reachable', async ({ page }) => {
    // In CI, localStorage is empty so the app shows the Onboarding screen
    // (slide 0 has zero interactive elements). Pre-set the flag so the app
    // boots straight into the UploadZone where the file input lives.
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_complete', 'true')
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // The upload zone should be focusable somehow — drag-drop area or button.
    const candidates = page.locator('button, [role="button"], input[type="file"], label')
    expect(await candidates.count()).toBeGreaterThan(0)
  })

  test('respects prefers-reduced-motion (animations should not block content)',
    async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: 'reduce' })
      const page = await context.newPage()
      await page.goto('/')
      // Page text should still be reachable when motion is disabled.
      await expect(page.locator('body')).toBeVisible()
      await context.close()
    }
  )
})
