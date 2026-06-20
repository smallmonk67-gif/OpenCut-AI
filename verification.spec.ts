import { test, expect } from '@playwright/test';

test('edit video workflow', async ({ page }) => {
  test.setTimeout(120000); // 120s timeout

  // Navigate to root
  await page.goto('http://localhost:5173');

  // Click New Project using a more general selector
  await page.locator('text=New Project').first().click();
  await page.waitForTimeout(1000);

  // Fill in the project name when the dialog opens
  await page.keyboard.type('Playwright Test Project');

  // Submit the form
  await page.keyboard.press('Enter');

  // Wait for the URL to change to the editor
  await page.waitForURL(/\/editor\/.*/);

  // Setup file chooser intercept for the + Import Files button in the media panel
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('button:has-text("+ Import Files")').click();
  const fileChooser = await fileChooserPromise;

  // Provide the dummy file
  await fileChooser.setFiles([{
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('dummy video content')
  }]);

  await page.waitForTimeout(2000);

  // Add clips to the timeline via the track's "+ Add" button
  await page.locator('button[title="Add Clip"]').first().click();
  await page.waitForTimeout(1000);

  // Let's add another clip
  await page.locator('button[title="Add Clip"]').nth(1).click();
  await page.waitForTimeout(1000);

  // Click on the Audio tab
  // Finding it by the text label since it doesn't have a title attribute in the left rail
  await page.locator('text=Audio').first().click();
  await page.waitForTimeout(2000); // wait for fetch

  // Take screenshot showing the editor layout with added clips and audio tab
  await page.screenshot({ path: '/home/jules/verification/screenshots/editor-full-workflow.png' });

});
