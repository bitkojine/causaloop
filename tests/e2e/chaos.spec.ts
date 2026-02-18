import { test, expect } from "@playwright/test";

test.describe("Adversarial User Interactions", () => {
  test("Rapid-fire interaction stress", async ({ page }) => {
    await page.goto("/");

    // 1. Spam Start/Stop Timer
    const startTimer = page.getByRole("button", { name: "Start the timer" });
    const stopTimer = page.getByRole("button", { name: "Stop the timer" });

    for (let i = 0; i < 20; i++) {
      await startTimer.click();
      await stopTimer.click();
    }

    // 2. Type while searching and immediately 'Load Big Data'
    const searchInput = page.getByPlaceholder("Search posts...");
    const loadBtn = page.getByRole("button", {
      name: "Load big data from API",
    });

    await searchInput.fill("stress test");
    await loadBtn.click();

    // Verify it doesn't crash and both systems are active
    // Use more specific selectors to avoid "2 elements" ambiguity
    await expect(
      page.locator("p:text-is('Load status: loading')"),
    ).toBeVisible();
    await expect(
      page.getByText(/Search status: (loading|success)/),
    ).toBeVisible();

    // 3. Start Stress Mode (10k VDOM nodes) and scroll wildly
    const startStress = page.getByRole("button", {
      name: "Start VDOM stress test",
    });
    await startStress.scrollIntoViewIfNeeded();
    await startStress.click();

    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(50);
      await page.mouse.wheel(0, -1000);
      await page.waitForTimeout(50);
    }

    // 4. Trigger Replay during Stress Mode
    await page.getByRole("button", { name: "DevTools" }).click();
    await page.getByRole("button", { name: "Replay Log" }).click();

    await expect(page.locator(".replay-result")).toContainText(
      "Replay Passed",
      {
        timeout: 30000,
      },
    );
  });

  test("Browser behavior: offline simulation", async ({ page, context }) => {
    await page.goto("/");
    const loadBtn = page.getByRole("button", {
      name: "Load big data from API",
    });

    await context.setOffline(true);
    await loadBtn.click();
    await expect(page.locator("text=Load status: error")).toBeVisible();

    await context.setOffline(false);
    await loadBtn.click();
    await expect(
      page.locator("p:text-is('Load status: loading')"),
    ).toBeVisible();
  });
});
