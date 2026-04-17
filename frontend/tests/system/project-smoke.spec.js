import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const fixtureDir = path.dirname(fileURLToPath(import.meta.url))
const datasetFixturePath = path.join(fixtureDir, 'fixtures', 'system-dataset.csv')

test('guest is redirected to login when opening a protected route', async ({ page }) => {
  await page.goto('/projects')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Log in or register')).toBeVisible()
})

test('user can register, create a project, import a dataset, review it, and save a chart', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`

  await page.goto('/login')
  await page.getByRole('button', { name: /don't have an account\? register/i }).click()

  await page.locator('#auth-name').fill('E2E Smoke User')
  await page.locator('#auth-email').fill(email)
  await page.locator('#auth-password').fill('password123')
  await page.getByRole('button', { name: /^Register$/ }).click()

  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByText('My Projects')).toBeVisible()

  await page.getByRole('button', { name: /new project/i }).click()
  await page.locator('#project-form-title').fill('System Smoke Project')
  await page.locator('#project-form-description').fill('Playwright smoke scenario')
  await page.getByRole('button', { name: /^Create$/ }).click()

  await expect(page).toHaveURL(/\/projects\/\d+$/)
  await expect(page.getByText('Add Data')).toBeVisible()

  await page.locator('#dataset-file-input').setInputFiles(datasetFixturePath)
  await page.getByRole('button', { name: /^Import$/ }).click()

  const validationDialog = page.getByRole('dialog', { name: /import review/i })
  await expect(validationDialog).toBeVisible()
  await expect(validationDialog.getByText('Rows imported')).toBeVisible()
  await page.getByRole('button', { name: /close validation modal/i }).click()
  await expect(validationDialog).toBeHidden()

  await page.getByRole('button', { name: /^Visualization$/ }).click()
  await expect(page.getByText('Create Visualization')).toBeVisible()

  const buildChartButton = page.getByRole('button', { name: /build chart/i })
  await expect(buildChartButton).toBeEnabled({ timeout: 20_000 })
  await buildChartButton.click()

  const saveChartButton = page.getByRole('button', { name: /save chart/i })
  await expect(saveChartButton).toBeEnabled({ timeout: 20_000 })
  await saveChartButton.click()

  await expect(page.getByText('Chart saved to the project library.')).toBeVisible()
  const savedChartCard = page.locator('.library-shell .saved-chart-card')
  await expect(savedChartCard).toHaveCount(1)
  await expect(savedChartCard.first().getByRole('button', { name: /download png/i })).toBeVisible()
})
