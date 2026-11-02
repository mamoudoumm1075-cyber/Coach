// Produit les visuels génératifs listés dans site.config.mjs (images.*.scene).
// Usage : node outils/rendre-images.mjs   (Playwright + ffmpeg requis)
// Une image dont la source est une vraie photo (pas de champ "scene") est ignorée.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serveur.mjs';
import site from '../site.config.mjs';

// require() respecte NODE_PATH : Playwright peut être installé globalement.
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TMP = ROOT + 'outils/.rendu/';
mkdirSync(TMP, { recursive: true });
const server = await serve(4199);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const only = process.argv.slice(2);

for (const [id, img] of Object.entries(site.images)) {
  if (!img.scene || (only.length && !only.includes(id))) continue;
  const [w, h] = img.render;
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`http://localhost:4199/outils/rendu.html?scene=${img.scene}&w=${w}&h=${h}&t=${img.t ?? 12}`);
  await page.waitForSelector('body[data-ready]', { timeout: 120000 });
  const png = `${TMP}${id}.png`;
  await page.locator('canvas').screenshot({ path: png });
  for (const width of img.widths) {
    const out = `${ROOT}assets/img/${id}-${width}.webp`;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', `scale=${width}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '82', out]);
  }
  console.log('✓', id);
}
await browser.close();
server.close();
rmSync(TMP, { recursive: true, force: true });
