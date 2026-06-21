import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('should display products on the products page', async ({ page }) => {
    await page.goto('/products');

    // Wait for product cards to render
    const productCard = page.locator('[data-testid^="product-card-"]').first();
    await expect(productCard).toBeVisible({ timeout: 15000 });

    // Verify the product card has a product name
    const productName = productCard.locator('h3');
    await expect(productName).toBeVisible();
    const text = await productName.textContent();
    expect(text?.trim().length || 0).toBeGreaterThan(0);
  });

  test('should show Add to Cart on the product details page', async ({ page }) => {
    await page.goto('/products');

    // Wait for first product card and get its ID
    const productCard = page.locator('[data-testid^="product-card-"]').first();
    await expect(productCard).toBeVisible({ timeout: 15000 });
    const testId = await productCard.getAttribute('data-testid');
    const productId = testId?.replace('product-card-', '');

    // Navigate directly to the product details page
    await page.goto(`/products/${productId}`);

    // Verify the "Add to Cart" button is visible
    const addToCartBtn = page.locator('button', { hasText: /Add to Cart/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
  });
});
