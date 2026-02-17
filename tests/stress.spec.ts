import { test, expect } from "@playwright/test";

test.describe("Stress: E2E Robustness", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/");
  });

  test("Monkey Test: Chaotic interaction for 30s", async ({ page }) => {
    // 1. Setup - Identify interactive elements
    // We can't easily get *all* buttons without scanning, so we'll target known features

    const duration = 30000; // 30s
    const start = Date.now();

    // Selectors
    const buttons = [
      'button:has-text("Start Timer")',
      'button:has-text("Stop Timer")',
      'button:has-text("Load Big Data")',
      'button:has-text("Cancel")',
      'button:has-text("Start Animation")',
      'button:has-text("Stop Animation")',
      'button:has-text("Compute Primes")',
      // We avoid "Start Stress" because it might lag the browser too much for E2E to be stable?
      // Let's include it but maybe stop it too.
      'button:has-text("Start Stress")',
      'button:has-text("Stop Stress")',
    ];

    let actionsPerformed = 0;

    await test.step("Chaotic Loops", async () => {
      while (Date.now() - start < duration) {
        // Pick random button
        const selector = buttons[Math.floor(Math.random() * buttons.length)];

        try {
          // We use { force: true } to click even if animating/covered
          // We utilize short timeout so we don't block
          const btn = page.locator(selector).first();
          if (await btn.isVisible()) {
            await btn.click({ timeout: 100, force: true });
            actionsPerformed++;
          }
        } catch (e) {
          // Ignore timeouts/errors, just keep going
        }

        // Occasional Reload (1% chance)
        if (Math.random() < 0.01) {
          console.log("Monkey: Reloading page...");
          await page.reload();
        }

        // Small delay to allow some JS processing
        await page.waitForTimeout(50);
      }
    });

    console.log(`Monkey: Performed ${actionsPerformed} actions.`);

    // Final check: Page should still be alive (no crash)
    await expect(page.locator("body")).toBeVisible();

    // Check for "System Log" errors
    const errorLog = page.locator(".log-error");
    const errorCount = await errorLog.count();

    if (errorCount > 0) {
      console.warn(`Monkey: Found ${errorCount} errors in System Log.`);
      // We don't fail the test for application errors (like 500s forced by us),
      // unless they are unhandled app crashes.
      // But let's log them.
      for (let i = 0; i < errorCount; i++) {
        console.log(await errorLog.nth(i).textContent());
      }
    }
  });

  test("Reload Spam: Navigation resilience", async ({ page }) => {
    // Start some heavy tasks
    await page.click('button:has-text("Start Timer")');
    await page.click('button:has-text("Start Animation")');
    const loadBtn = page.locator('button:has-text("Load Big Data")');
    await loadBtn.scrollIntoViewIfNeeded();
    await loadBtn.click();

    // Reload rapidly
    for (let i = 0; i < 10; i++) {
      await page.reload();
      // verify restored state or clean slate? App seems to reset on reload (no persistence mentioned)
      await expect(page.locator("h1, h2, h3").first()).toBeVisible();
    }
  });
});
