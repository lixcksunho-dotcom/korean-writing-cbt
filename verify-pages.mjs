import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'screenshots');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

import { mkdirSync } from 'fs';
mkdirSync(screenshotDir, { recursive: true });

const results = [];

async function visit(label, url) {
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    const status = resp?.status();
    const title = await page.title();
    const h1 = await page.$eval('h1', el => el.textContent).catch(() => '(no h1)');
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
    const file = path.join(screenshotDir, `${label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    results.push({ label, url, status, title, h1, bodyText, screenshot: file, ok: true });
  } catch (e) {
    results.push({ label, url, error: String(e), ok: false });
  }
}

await visit('home', 'http://localhost:3000/');
await visit('login', 'http://localhost:3000/login');
await visit('signup', 'http://localhost:3000/signup');

// Mobile viewport check
await page.setViewportSize({ width: 375, height: 812 });
await visit('home-mobile', 'http://localhost:3000/');
await visit('login-mobile', 'http://localhost:3000/login');

await browser.close();

for (const r of results) {
  if (r.ok) {
    console.log(`✅ [${r.label}] ${r.url} → HTTP ${r.status} | title="${r.title}" | h1="${r.h1}"`);
    console.log(`   preview: ${r.bodyText.replace(/\n/g, ' ').slice(0, 200)}`);
    console.log(`   screenshot: ${r.screenshot}`);
  } else {
    console.log(`❌ [${r.label}] ${r.url} → ERROR: ${r.error}`);
  }
}
