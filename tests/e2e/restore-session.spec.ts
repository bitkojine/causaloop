import { test, expect } from "@playwright/test";

test.describe("Restore Session", () => {
  test("should persist state across reloads", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    // 1. Interact with the app (Search feature)
    const searchInput = page.getByRole("textbox", { name: "Search posts" });
    await searchInput.fill("Redux is dead");

    // Wait for state update (debounce/throttle)
    await page.waitForTimeout(500);

    // 2. Reload the page
    await page.reload();

    // 3. Verify state is restored
    await expect(searchInput).toHaveValue("Redux is dead");

    // Check for success toast
    await expect(
      page.locator("text=Session Restored Successfully"),
    ).toBeVisible();
  });

  test("should handle corrupted storage gracefully", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    // 1. Inject corrupted data into localStorage
    await page.evaluate(() => {
      localStorage.setItem("causaloop_log_v1", "INVALID_JSON_DATA_}{");
    });

    // 2. Reload the page
    await page.reload();

    // 3. Verify app loads (no crash) and shows error
    await expect(
      page.getByRole("textbox", { name: "Search posts" }),
    ).toBeVisible();
    await expect(page.locator("text=Session Restore Failed")).toBeVisible();

    // 4. Verify storage is cleared (optional, or implicit if next reload works)
  });
});
