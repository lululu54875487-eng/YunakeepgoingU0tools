const { chromium } = require('playwright');
const jsQR = require('jsqr');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

(async () => {
  const root = path.resolve(__dirname, '..');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const executablePath = process.env.BROWSER_PATH || [
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Google/Chrome/Application/chrome.exe'
    ].find(p => fs.existsSync(p));
    browser = await chromium.launch({ executablePath, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForSelector('#qr-preview svg');
    assert.equal(await page.locator('#download-png').isDisabled(), true);
    await page.evaluate(() => {
      window.showSaveFilePicker = async options => {
        window.savedOptions = options;
        return { createWritable: async () => ({ write: async blob => { window.savedBlob = blob; }, close: async () => {} }) };
      };
    });
    async function generate(text) {
      await page.locator('#content').fill(text);
      await page.locator('.generate').click();
      await page.waitForFunction(() => document.getElementById('preview-badge').textContent.includes('已準備好'));
    }
    async function readSavedPNG() {
      return page.evaluate(async () => {
        const bitmap = await createImageBitmap(window.savedBlob);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false; context.drawImage(bitmap, 0, 0, 512, 512);
        const bytes = context.getImageData(0, 0, 512, 512).data;
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return { width: bitmap.width, height: bitmap.height, pixels: btoa(binary) };
      });
    }
    for (const text of [
      'https://example.com/a?x=1&y=%E4%BD%A0#hello',
      'https://例子.台灣/中文路徑?名字=小U&emoji=🌿',
      '  中文、英文 Hello 🌿💚\n第二行\t保留空白  ',
      '<script>alert("hello")</script>',
      'mailto:hello@example.com?subject=你好'
    ]) {
      await generate(text);
      await page.selectOption('#size', '1024');
      await page.click('#download-png');
      await page.waitForFunction(() => document.getElementById('status').textContent.includes('圖片已儲存'));
      const image = await readSavedPNG();
      assert.equal(image.width, 1024);
      const decoded = jsQR(new Uint8ClampedArray(Buffer.from(image.pixels, 'base64')), 512, 512);
      assert.equal(decoded?.data, text);
    }
    console.log('PASS: PNG round-trip preserves URLs, Unicode, emoji, whitespace and literal HTML.');
    for (const size of ['2048', '4096']) {
      await page.selectOption('#size', size);
      await page.click('#download-png');
      await page.waitForFunction(() => document.getElementById('status').textContent.includes('圖片已儲存'));
      assert.deepEqual(await page.evaluate(async () => { const b = await createImageBitmap(window.savedBlob); return [b.width, b.height]; }), [Number(size), Number(size)]);
    }
    await page.click('#download-svg');
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('圖片已儲存'));
    assert.match(await page.evaluate(() => window.savedBlob.text()), /shape-rendering="crispEdges"/);
    console.log('PASS: PNG export sizes and SVG export.');
    await page.evaluate(() => { window.showSaveFilePicker = async () => { throw new DOMException('Cancel', 'AbortError'); }; });
    await page.click('#download-png');
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('已取消'));
    assert.equal(await page.locator('#download-png').isEnabled(), true);
    await page.evaluate(() => { delete window.showSaveFilePicker; });
    // Chromium exposes the native picker on its prototype; shadow it for fallback QA.
    await page.evaluate(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
    const fallback = page.waitForEvent('download');
    await page.click('#download-svg');
    const download = await fallback;
    assert.equal(download.suggestedFilename(), 'little-u-qrcode.svg');
    assert.equal(await download.failure(), null);
    console.log('PASS: save picker, cancellation and real browser fallback download.');
    await generate('a'.repeat(2953));
    await page.locator('#content').fill('a'.repeat(2954));
    assert.equal(await page.locator('#download-png').isDisabled(), true);
    await page.locator('.generate').click();
    assert.equal(await page.locator('#error').isVisible(), true);
    await page.click('#clear');
    await page.locator('.generate').click();
    assert.match(await page.locator('#error').textContent(), /先放入/);
    console.log('PASS: exact capacity boundary, stale download prevention, clear and empty input.');
    await page.click('[data-example="https://example.com"]');
    await page.screenshot({ path: path.join(root, 'test-results/desktop.png'), fullPage: true });
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await page.screenshot({ path: path.join(root, 'test-results/mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS: responsive layouts and no browser errors.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
