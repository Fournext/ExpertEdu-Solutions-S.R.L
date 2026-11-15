import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(__dirname, '../../docs/evidencias');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4321';

mkdirSync(EVIDENCE_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const desktopShots = [
    { route: '/', file: 'fig-7-1-inicio.png' },
    { route: '/nosotros', file: 'fig-7-2-nosotros.png' },
    { route: '/soluciones', file: 'fig-7-3-soluciones.png' },
    { route: '/producto', file: 'fig-7-4-producto-expertedu-studio.png' },
    { route: '/contacto', file: 'fig-7-5-contacto.png' },
  ];

  for (const shot of desktopShots) {
    await page.goto(`${BASE_URL}${shot.route}`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: resolve(EVIDENCE_DIR, shot.file),
      fullPage: true,
    });
    console.log(`Captured ${shot.file}`);
  }

  // Real contact submission evidence without sensitive data
  await page.goto(`${BASE_URL}/contacto`, { waitUntil: 'networkidle' });
  const suffix = Date.now();
  await page.getByLabel(/nombre completo/i).fill('Docente de Prueba Institucional');
  await page.getByLabel(/correo electrónico/i).fill(`demo.evidencia+${suffix}@expertedu.bo`);
  await page.getByLabel(/organización o institución/i).fill('Universidad Demo');
  await page.getByLabel(/asunto/i).fill(`Evidencia de solicitud ${suffix}`);
  await page
    .getByLabel(/mensaje/i)
    .fill('Solicitud de demostración de ExpertEdu Studio para verificación técnica del Capítulo 7.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /enviar solicitud/i }).click();
  await page.getByText(/Solicitud registrada correctamente/i).waitFor({
    state: 'visible',
    timeout: 10000,
  });
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, 'fig-7-5b-contacto-confirmacion.png'),
    fullPage: true,
  });
  console.log('Captured fig-7-5b-contacto-confirmacion.png');

  // Mobile responsive evidence
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /abrir menú/i }).click();
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, 'fig-7-6-responsive-movil.png'),
    fullPage: false,
  });
  console.log('Captured fig-7-6-responsive-movil.png');

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
