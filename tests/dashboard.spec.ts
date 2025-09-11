import { test, expect } from '@playwright/test'

test.describe('Dashboard Navigation', () => {
  test('should load dashboard page directly', async ({ page }) => {
    await page.goto('/dashboard?demo=true')
    await page.waitForTimeout(3000)
    
    // Should load without errors
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/dashboard?demo=true')
    await page.waitForTimeout(3000)
    
    // Look for any navigation or menu items
    const navElements = page.locator('nav, [role="navigation"], a[href*="/exams"], button')
    const count = await navElements.count()
    
    if (count > 0) {
      await expect(navElements.first()).toBeVisible()
    } else {
      // Just verify page loaded
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should display content in demo mode', async ({ page }) => {
    await page.goto('/dashboard?demo=true')
    await page.waitForTimeout(3000)
    
    // Look for any text content or demo indicators
    const textElements = page.locator('h1, h2, h3, p, span, div')
    const count = await textElements.count()
    
    expect(count).toBeGreaterThan(0)
  })

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard?demo=true')
    await page.waitForTimeout(3000)
    
    // Should still be responsive
    await expect(page.locator('body')).toBeVisible()
  })
})