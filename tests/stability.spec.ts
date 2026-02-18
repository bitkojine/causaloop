import { test, expect } from "@playwright/test";

// This test is designed to run for a long duration (e.g. 30-60 mins)
// Usage: pnpm playwright test tests/stability.spec.ts --timeout=3600000

test.describe("Stress: Long-run Stability", () => {
  test("Sustained interaction for 30 minutes", async ({ page }) => {
    test.setTimeout(1000 * 60 * 15); // 15 mins

    await page.goto("http://localhost:5173/");

    // Start background tasks
    await page.click('button:has-text("Start Timer")');
    await page.click('button:has-text("Start Animation")');

    const duration = 1000 * 60 * 10; // 10 minutes
    const start = Date.now();
    let interactions = 0;

    while (Date.now() - start < duration) {
      // Perform periodic "Work"
      await page.click('button:has-text("Compute Primes")');

      // Check for memory warnings (if we could hook into console/performance API)
      const memoryUsage = await page.evaluate(
        () => (performance as any).memory?.usedJSHeapSize,
      );
      if (memoryUsage && interactions % 100 === 0) {
        console.log(
          `[${new Date().toISOString()}] Memory: ${Math.round(memoryUsage / 1024 / 1024)} MB`,
        );
      }

      // Wait a bit
      await page.waitForTimeout(5000);
      interactions++;
    }

    console.log(`Stability test finished. Interactions: ${interactions}`);
  });
});
