/**
 * Project Creation End-to-End Tests
 *
 * Tests the project creation flows:
 * 1. Creating a new blank project from the welcome view
 * 2. Creating a new project from a GitHub template
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createTempDirPath, cleanupTempDir, setupWelcomeView } from './utils';

// Create unique temp dir for this test run
const TEST_TEMP_DIR = createTempDirPath('project-creation-test');

test.describe('Project Creation', () => {
  test.beforeAll(async () => {
    // Create test temp directory
    if (!fs.existsSync(TEST_TEMP_DIR)) {
      fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
    }
  });

  test.afterAll(async () => {
    // Cleanup temp directory
    cleanupTempDir(TEST_TEMP_DIR);
  });

  test('should create a new blank project from welcome view', async ({ page }) => {
    const projectName = `test-project-${Date.now()}`;

    // Set up welcome view with workspace directory pre-configured
    await setupWelcomeView(page, { workspaceDir: TEST_TEMP_DIR });

    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for welcome view to be visible
    await expect(page.locator('[data-testid="welcome-view"]')).toBeVisible({ timeout: 10000 });

    // Click the "Create New Project" dropdown button
    const createButton = page.locator('[data-testid="create-new-project"]');
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Click "Quick Setup" option from the dropdown
    const quickSetupOption = page.locator('[data-testid="quick-setup-option"]');
    await expect(quickSetupOption).toBeVisible();
    await quickSetupOption.click();

    // Wait for the new project modal to appear
    const modal = page.locator('[data-testid="new-project-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Enter the project name
    const projectNameInput = page.locator('[data-testid="project-name-input"]');
    await expect(projectNameInput).toBeVisible();
    await projectNameInput.fill(projectName);

    // Verify the workspace directory is shown (from our pre-configured localStorage)
    // Wait for workspace to be loaded (it shows "Will be created at:" when ready)
    await expect(page.getByText('Will be created at:')).toBeVisible({ timeout: 5000 });

    // Click the Create Project button
    const createProjectButton = page.locator('[data-testid="confirm-create-project"]');
    await expect(createProjectButton).toBeVisible();
    await createProjectButton.click();

    // Wait for project creation to complete
    // The app may show an init dialog briefly and then navigate to board view
    // We just need to verify we end up on the board view with our project

    // Wait for the board view - this confirms the project was created and opened
    await expect(page.locator('[data-testid="board-view"]')).toBeVisible({ timeout: 15000 });

    // Verify the project name appears in the project selector (sidebar)
    await expect(
      page.locator('[data-testid="project-selector"]').getByText(projectName)
    ).toBeVisible({ timeout: 5000 });

    // Verify the project was created in the filesystem
    const projectPath = path.join(TEST_TEMP_DIR, projectName);
    expect(fs.existsSync(projectPath)).toBe(true);

    // Verify .automaker directory was created
    const automakerDir = path.join(projectPath, '.automaker');
    expect(fs.existsSync(automakerDir)).toBe(true);

    // Verify app_spec.txt was created
    const appSpecPath = path.join(automakerDir, 'app_spec.txt');
    expect(fs.existsSync(appSpecPath)).toBe(true);

    // Verify the app_spec.txt contains the project name
    const appSpecContent = fs.readFileSync(appSpecPath, 'utf-8');
    expect(appSpecContent).toContain(projectName);
  });

  test('should create a new project from GitHub template', async ({ page }) => {
    // Increase timeout for this test since git clone takes time
    test.setTimeout(60000);

    const projectName = `template-project-${Date.now()}`;

    // Set up welcome view with workspace directory pre-configured
    await setupWelcomeView(page, { workspaceDir: TEST_TEMP_DIR });

    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for welcome view to be visible
    await expect(page.locator('[data-testid="welcome-view"]')).toBeVisible({ timeout: 10000 });

    // Click the "Create New Project" dropdown button
    const createButton = page.locator('[data-testid="create-new-project"]');
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Click "Quick Setup" option from the dropdown
    const quickSetupOption = page.locator('[data-testid="quick-setup-option"]');
    await expect(quickSetupOption).toBeVisible();
    await quickSetupOption.click();

    // Wait for the new project modal to appear
    const modal = page.locator('[data-testid="new-project-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Enter the project name first
    const projectNameInput = page.locator('[data-testid="project-name-input"]');
    await expect(projectNameInput).toBeVisible();
    await projectNameInput.fill(projectName);

    // Wait for workspace directory to be loaded
    await expect(page.getByText('Will be created at:')).toBeVisible({ timeout: 5000 });

    // Click on the "Starter Kit" tab
    const starterKitTab = modal.getByText('Starter Kit');
    await expect(starterKitTab).toBeVisible();
    await starterKitTab.click();

    // Select the first template (Automaker Starter Kit)
    const firstTemplate = page.locator('[data-testid="template-automaker-starter-kit"]');
    await expect(firstTemplate).toBeVisible();
    await firstTemplate.click();

    // Verify the template is selected (check mark should appear)
    await expect(firstTemplate.locator('.lucide-check')).toBeVisible();

    // Click the Create Project button
    const createProjectButton = page.locator('[data-testid="confirm-create-project"]');
    await expect(createProjectButton).toBeVisible();
    await createProjectButton.click();

    // Wait for git clone to complete and board view to appear
    // This takes longer due to the git clone operation
    await expect(page.locator('[data-testid="board-view"]')).toBeVisible({ timeout: 45000 });

    // Verify the project name appears in the project selector (sidebar)
    await expect(
      page.locator('[data-testid="project-selector"]').getByText(projectName)
    ).toBeVisible({ timeout: 5000 });

    // Verify the project was cloned in the filesystem
    const projectPath = path.join(TEST_TEMP_DIR, projectName);
    expect(fs.existsSync(projectPath)).toBe(true);

    // Verify .automaker directory was created
    const automakerDir = path.join(projectPath, '.automaker');
    expect(fs.existsSync(automakerDir)).toBe(true);

    // Verify app_spec.txt was created with template info
    const appSpecPath = path.join(automakerDir, 'app_spec.txt');
    expect(fs.existsSync(appSpecPath)).toBe(true);
    const appSpecContent = fs.readFileSync(appSpecPath, 'utf-8');
    expect(appSpecContent).toContain(projectName);
    expect(appSpecContent).toContain('Automaker Starter Kit');

    // Verify the template files were cloned (check for package.json which should exist in the template)
    const packageJsonPath = path.join(projectPath, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    // Verify it's a git repository (cloned from GitHub)
    const gitDir = path.join(projectPath, '.git');
    expect(fs.existsSync(gitDir)).toBe(true);
  });
});
