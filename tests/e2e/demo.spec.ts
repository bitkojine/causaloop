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

  test("should start and stop timer", async ({ page }) => {
    await page.goto("/");
    const startBtn = page.getByRole("button", { name: "Start Timer" });
    const stopBtn = page.getByRole("button", { name: "Stop Timer" });
    const countLabel = page.locator(
      '.feature-container:has-text("Feature C: Timer") > p',
    );

    await expect(countLabel).toContainText("Count: 0");

    await startBtn.click();
    await page.waitForTimeout(1100);
    const countAfterOneSec = await countLabel.innerText();
    expect(parseInt(countAfterOneSec.split(":")[1].trim())).toBeGreaterThan(0);

    await stopBtn.click();
    const countAtStop = await countLabel.innerText();
    await page.waitForTimeout(1100);
    const finalCount = await countLabel.innerText();
    expect(finalCount).toBe(countAtStop);
  });

  test("should handle search with stale responses", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Search posts...");

    // Type slow to trigger multiple requests
    await input.fill("t");
    await expect(page.locator("text=Status: loading (ID: 1)")).toBeVisible();
    await input.fill("te");
    await expect(page.locator("text=Status: loading (ID: 2)")).toBeVisible();
    await input.fill("test");
    await expect(page.locator("text=Status: loading (ID: 3)")).toBeVisible();

    await expect(page.locator("text=Status: success (ID: 3)")).toBeVisible({
      timeout: 10000,
    });
    const results = page.locator(".log").first();
    await expect(results).not.toBeEmpty();
  });

  test("should handle search errors", async ({ page }) => {
    await page.goto("/");
    // Intercept search requests and make them fail
    await page.route("**/posts?q=fail", (route) => route.abort("failed"));

    const input = page.getByPlaceholder("Search posts...");
    await input.fill("fail");

    await expect(page.locator("text=Status: error")).toBeVisible();
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

  test("should handle load errors", async ({ page }) => {
    await page.goto("/");
    // Intercept big data load and make it fail
    await page.route("**/photos", (route) => route.abort("failed"));

    const startBtn = page.getByRole("button", { name: "Load Big Data" });
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();

    await expect(page.locator("text=Status: error")).toBeVisible();
  });

  test("should compute primes in worker", async ({ page }) => {
    await page.goto("/");
    const input = page.locator(
      '.feature-container:has-text("Feature E: Worker Compute") input[type="number"]',
    );
    const computeBtn = page.getByRole("button", { name: "Compute Primes" });

    await input.fill("1000");
    await computeBtn.click();
    await expect(page.locator("text=Status: computing")).toBeVisible();
    await expect(computeBtn).toBeDisabled(); // Edge case: button disabled
    await expect(page.locator("text=Status: done")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Result: 168")).toBeVisible();
    await expect(computeBtn).toBeEnabled(); // Edge case: button re-enabled
  });

  test("should handle search edge cases", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Search posts...");

    // Empty query
    await input.fill("");
    // Ensure no new request is sent or handled gracefully (conceptually)
    // In this app, it might just search for empty string, but let's verify it doesn't crash
    await expect(page.locator(".log")).toBeVisible();

    // Special characters
    await input.fill("?&%");
    await expect(page.locator("text=Status: loading")).toBeVisible();
    // API might return empty or specific error, but app shouldn't crash
    await expect(
      page
        .locator("text=Status: success")
        .or(page.locator("text=Status: error")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should handle invalid worker input", async ({ page }) => {
    await page.goto("/");
    const input = page.locator(
      '.feature-container:has-text("Feature E: Worker Compute") input[type="number"]',
    );
    const computeBtn = page.getByRole("button", { name: "Compute Primes" });

    // Negative number
    await input.fill("-5");
    await computeBtn.click();
    await expect(page.locator("text=Status: done")).toBeVisible();
    await expect(page.locator("text=Result: 0")).toBeVisible();
  });

  test("should enforce timer button states", async ({ page }) => {
    await page.goto("/");
    const startBtn = page.getByRole("button", { name: "Start Timer" });
    const stopBtn = page.getByRole("button", { name: "Stop Timer" });

    // Initially
    await expect(startBtn).toBeEnabled();
    await expect(stopBtn).toBeDisabled();

    // Running
    await startBtn.click();
    await expect(startBtn).toBeDisabled();
    await expect(stopBtn).toBeEnabled();

    // Stopped
    await stopBtn.click();
    await expect(startBtn).toBeEnabled();
    await expect(stopBtn).toBeDisabled();
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

  test("should display errors in the System Log", async ({ page }) => {
    await page.goto("/");
    // Intercept search requests and make them fail
    await page.route("**/posts?q=system_error", (route) =>
      route.abort("failed"),
    );

    const input = page.getByPlaceholder("Search posts...");
    await input.fill("system_error");

    // Check System Log for error entry
    const systemLog = page.locator(".system-log");
    await expect(systemLog).toBeVisible();
    await expect(systemLog.locator("li.log-error")).toBeVisible();
    await expect(systemLog.locator("li.log-error")).toContainText(
      "search_failed",
    );
  });
});
