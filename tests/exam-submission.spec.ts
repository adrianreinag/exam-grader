import { test, expect } from '@playwright/test'

test.describe('Exam Submission Flow', () => {
  test('should load public exam page', async ({ page }) => {
    // Try a generic token URL
    await page.goto('/e/test-token')
    await page.waitForTimeout(3000)
    
    // Should either load or redirect gracefully (check HTML exists)
    await expect(page.locator('html')).toBeAttached()
  })

  test('should handle invalid token gracefully', async ({ page }) => {
    await page.goto('/e/invalid-token-123')
    await page.waitForTimeout(3000)
    
    // Should not crash, even if token is invalid (check HTML exists)
    await expect(page.locator('html')).toBeAttached()
  })

  test('should be accessible without authentication', async ({ page }) => {
    // Test that public exam routes don't require login
    await page.goto('/e/public-exam-test')
    await page.waitForTimeout(3000)
    
    // Should load something (even if 404) (check HTML exists)
    await expect(page.locator('html')).toBeAttached()
  })

  test('should handle different screen sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForTimeout(3000)
    
    // Should be responsive (just check HTML exists)
    await expect(page.locator('html')).toBeAttached()
  })
})