import { test, expect } from "@playwright/test";

const EMAIL = "rodrigo.rocha@morumbisolutions.com.br";
const PASSWORD = "Analyse01@!";

async function login(page) {
  await page.goto("/login");
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  const emailInput = page.locator('input[type="email"]');
  await emailInput.clear();
  await emailInput.fill(EMAIL);
  const passInput = page.locator('input[type="password"]');
  await passInput.clear();
  await passInput.fill(PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  if (page.url().includes("/login")) {
    throw new Error("Login falhou");
  }
}

function trackApiErrors(page) {
  const errors = [];
  page.on("response", async (res) => {
    if (res.status() >= 400 && res.url().includes("/rest/v1/")) {
      let body = "";
      try { body = await res.text(); } catch {}
      errors.push({ url: res.url(), status: res.status(), body });
    }
  });
  return errors;
}

function expectNoApiErrors(errors, label) {
  const bad = errors.filter((e) => e.status >= 400);
  expect(bad, `${label} - API errors: ${JSON.stringify(bad)}`).toHaveLength(0);
}

test("LOGIN", async ({ page }) => {
  await login(page);
  expect(page.url()).not.toContain("/login");
});

test("CRUD: Saloes", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/Companies");
  await page.waitForTimeout(2000);
  await expect(page.getByRole("heading", { name: "Salões" })).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: /novo/i }).first().click();
  await page.waitForTimeout(1500);

  const modal = page.locator('.fixed.inset-0');
  const nameInput = modal.locator('input[placeholder*="sal"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.clear();
    await nameInput.fill("Salao Teste E2E");
  }

  await page.waitForTimeout(500);
  const saveBtn = modal.locator('button').filter({ hasText: /salvar/i }).first();
  await saveBtn.click({ timeout: 5000 });
  await page.waitForTimeout(4000);
  expectNoApiErrors(errors, "Companies create");
});

test("CRUD: Clientes", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/Clientes");
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: /novo|adicionar/i }).first().click();
  await page.waitForTimeout(1500);

  const nameInput = page.locator('input[placeholder*="ome"], input[placeholder*="nome"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill("Cliente Teste E2E");
  }

  const saveBtn = page.locator('button[type="submit"], button').filter({ hasText: /salvar|criar|adicionar/i }).first();
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
  }
  expectNoApiErrors(errors, "Customers create");
});

test("CRUD: Profissionais", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/Profissionais");
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: /novo|adicionar/i }).first().click();
  await page.waitForTimeout(1500);

  const nameInput = page.locator('input[placeholder*="ome"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill("Prof Teste E2E");
    const emailInput = page.locator('input[type="email"], input[placeholder*="mail"]').first();
    if (await emailInput.isVisible()) await emailInput.fill("prof.e2e@test.com");
    const saveBtn = page.locator('button[type="submit"], button').filter({ hasText: /salvar|criar|adicionar/i }).first();
    if (await saveBtn.isVisible()) await saveBtn.click();
    await page.waitForTimeout(3000);
  }
  expectNoApiErrors(errors, "Profissionais create");
});

test("CRUD: Planos", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/Plans");
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: /novo|plano/i }).first().click();
  await page.waitForTimeout(1500);

  const nameInput = page.locator('input[placeholder*="ome"], input[placeholder*="Ex:"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill("Plano Teste E2E");
    // Modal is tall, scroll to bottom to find save button
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible()) {
      await dialog.locator('div').last().scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(500);
    const saveBtn = page.locator('[role="dialog"] button').filter({ hasText: /salvar|criar|adicionar/i }).last();
    await saveBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(3000);
  }
  expectNoApiErrors(errors, "Plans create");
});

test("CRUD: Niveis", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/StylistLevels");
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: /novo|adicionar/i }).first().click();
  await page.waitForTimeout(1500);

  const nameInput = page.locator('input[placeholder*="ome"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill("Nivel Teste E2E");
    const saveBtn = page.locator('button[type="submit"], button').filter({ hasText: /salvar|criar|adicionar/i }).first();
    if (await saveBtn.isVisible()) await saveBtn.click();
    await page.waitForTimeout(3000);
  }
  expectNoApiErrors(errors, "StylistLevels create");
});

test("CRUD: Templates", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/Templates");
  await page.waitForTimeout(3000);
  expectNoApiErrors(errors, "Templates load");
});

test("CRUD: Lista de Espera", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/WaitingList");
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: /adicionar/i }).first().click();
  await page.waitForTimeout(1500);

  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[placeholder="Digite o nome"]').fill("Espera Teste E2E");
  await page.waitForTimeout(300);

  // Submit form
  await dialog.locator('button[type="submit"]').click({ timeout: 5000 });
  await page.waitForTimeout(3000);
  expectNoApiErrors(errors, "WaitingList create");
});

test("CRUD: Configuracoes", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/Settings");
  await page.waitForTimeout(3000);
  expectNoApiErrors(errors, "Settings load");
});

test("CRUD: PunchCards", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/PunchCards");
  await page.waitForTimeout(2000);
  expectNoApiErrors(errors, "PunchCards load");
});

test("CRUD: Invoices", async ({ page }) => {
  const errors = trackApiErrors(page);
  await login(page);
  await page.goto("/Invoices");
  await page.waitForTimeout(2000);
  expectNoApiErrors(errors, "Invoices load");
});
