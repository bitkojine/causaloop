import { test, expect } from "@playwright/test";

test.describe("Animation Feature", () => {
  test("should start and stop animation", async ({ page }) => {
    await page.goto("/");

    const startBtn = page.getByRole("button", { name: "Start Animation" });
    const stopBtn = page.getByRole("button", { name: "Stop Animation" });

    // Initial state: box exists, angle 0
    const box = page
      .locator('.feature-container:has-text("Feature D: Animation") > div')
      .nth(0);
    const initialTransform = await box.evaluate(
      (el) => window.getComputedStyle(el).transform,
    );

    // Start animation
    await startBtn.click();
    await expect(startBtn).toBeDisabled();
    await expect(stopBtn).toBeEnabled();

    // Wait for some movement
    await page.waitForTimeout(500);
    const movingTransform = await box.evaluate(
      (el) => window.getComputedStyle(el).transform,
    );
    expect(movingTransform).not.toBe(initialTransform);

    // Stop animation
    await stopBtn.click();
    await expect(startBtn).toBeEnabled();
    await expect(stopBtn).toBeDisabled();

    // Capture transform after stop
    const stoppedTransform = await box.evaluate(
      (el) => window.getComputedStyle(el).transform,
    );

    // Wait more and check if it still moves
    await page.waitForTimeout(500);
    const finalTransform = await box.evaluate(
      (el) => window.getComputedStyle(el).transform,
    );

    expect(finalTransform).toBe(stoppedTransform);
  });

  test("should handle search with stale responses", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Search posts...");

    // Type slow to trigger multiple requests
    await input.fill("t");
    await input.fill("te");
    await input.fill("test");

    await expect(page.locator("text=Status: success")).toBeVisible({
      timeout: 10000,
    });
    const results = page.locator(".log").first();
    await expect(results).not.toBeEmpty();
  });

  test("should handle load and cancel", async ({ page }) => {
    await page.goto("/");
    const startBtn = page.getByRole("button", { name: "Load Big Data" });
    const cancelBtn = page.getByRole("button", { name: "Cancel" });

    await startBtn.click();
    await expect(page.locator("text=Status: loading")).toBeVisible();
    await cancelBtn.click();
    await expect(page.locator("text=Status: cancelled")).toBeVisible();
  });

  test("should compute primes in worker", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="number"]');
    const computeBtn = page.getByRole("button", { name: "Compute Primes" });

    await input.fill("1000");
    await computeBtn.click();
    await expect(page.locator("text=Status: computing")).toBeVisible();
    await expect(page.locator("text=Status: done")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Result: 168")).toBeVisible();
  });

  test("should work with DevTools replay", async ({ page }) => {
    await page.goto("/");

    // Open DevTools
    await page.getByRole("button", { name: "DevTools" }).click();

    const startBtn = page.getByRole("button", { name: "Start Timer" });
    const stopBtn = page.getByRole("button", { name: "Stop Timer" });
    const replayBtn = page.getByRole("button", { name: "Replay Log" });

    await startBtn.click();
    await page.waitForTimeout(1100);
    await stopBtn.click();

    const countText = await page
      .locator('.feature-container:has-text("Feature C: Timer") >> p')
      .innerText();

    await replayBtn.click();
    await expect(page.locator(".replay-result")).toContainText("success", {
      timeout: 10000,
    });

    const finalCountText = await page
      .locator('.feature-container:has-text("Feature C: Timer") >> p')
      .innerText();
    expect(finalCountText).toBe(countText);
  });
});
