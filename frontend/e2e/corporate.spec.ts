import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const CORPORATE_ROUTES = [
  '/',
  '/nosotros',
  '/soluciones',
  '/producto',
  '/universidades',
  '/precios',
  '/recursos',
  '/recursos/forward-chaining-explicado',
  '/contacto',
  '/soporte',
  '/privacidad',
  '/terminos',
];

test.describe('ExpertEdu Corporate Website E2E & Accessibility', () => {
  for (const route of CORPORATE_ROUTES) {
    test(`loads ${route} cleanly and passes WCAG 2.1 AA axe-core checks`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBeLessThan(400);

      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }

  test('displays custom 404 page for nonexistent route', async ({ page }) => {
    const response = await page.goto('/ruta-que-no-existe-123');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('Página no encontrada');
  });

  test('supports mobile navigation drawer toggle at 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const menuBtn = page.getByRole('button', { name: /abrir menú/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    await expect(page.getByRole('link', { name: 'Nosotros' }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contacto' }).last()).toBeVisible();
  });

  test('validates and submits ContactForm to the live Django API', async ({ page }) => {
    await page.goto('/contacto', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: /enviar solicitud/i }).click();
    await expect(page.getByText(/Ingrese su nombre completo/i)).toBeVisible();

    const uniqueSuffix = Date.now();
    await page.getByLabel(/nombre completo/i).fill('Dra. Elena Vargas');
    await page.getByLabel(/correo electrónico/i).fill(`evargas+${uniqueSuffix}@universidad.edu.bo`);
    await page.getByLabel(/organización o institución/i).fill('Facultad de Ingeniería');
    await page.getByLabel(/asunto/i).fill(`Solicitud de demo ${uniqueSuffix}`);
    await page
      .getByLabel(/mensaje/i)
      .fill('Solicitamos una demostración guiada de ExpertEdu Studio para docencia universitaria.');
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: /enviar solicitud/i }).click();

    await expect(page.getByText(/Solicitud registrada correctamente/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
