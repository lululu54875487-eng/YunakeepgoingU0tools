const { chromium } = require('playwright');
const jsQR = require('jsqr');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
(async () => {
  const root = path.resolve(__dirname, '..');
  const A = 'https://myship.7-11.com.tw/general/detail/GM2607042239966';
  const B = 'https://mall.iopenmall.tw/016089/';
  const product = 'https://mall.iopenmall.tw/016089/index.php?action=product_detail&prod_no=P1608903714941';
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/toolkit\//, '/');
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => { if (error) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const executablePath = process.env.BROWSER_PATH || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));
    browser = await chromium.launch({ executablePath, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:')) external.push(request.url()); });
    await page.route('**/*', route => /^https?:/.test(route.request().url()) && !route.request().url().startsWith('http://127.0.0.1:') ? route.abort() : route.continue());
    await page.goto(`http://127.0.0.1:${server.address().port}/toolkit/`);
    await page.waitForSelector('.choice-action');
    assert.equal(await page.locator('#qr-form').count(), 0);
    assert.equal(await page.locator('footer > span:last-child').textContent(), 'create by 璐璐璐');
    await page.screenshot({ path: path.join(root, 'test-results/static-home-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(root, 'test-results/static-home-mobile.png'), fullPage: true });
    await page.click('.browse-link');
    await page.waitForFunction(() => scrollY > 100 && document.activeElement.id === 'tools-title');
    await page.click('.choice-action');
    await page.waitForSelector('.empty-preview');
    await page.click('.breadcrumb a'); await page.click('.choice-action');
    await page.goBack(); await page.waitForSelector('.choice-action'); await page.goForward();
    await page.waitForSelector('.empty-preview');
    assert.equal(await page.locator('script[src*="site-config"]').count(), 0);
    assert.ok(await page.locator('#download-png').isDisabled());
    await page.setViewportSize({ width: 1440, height: 1100 });
    async function picker() {
      await page.evaluate(() => {
        window.writes = 0; window.savedBlob = null;
        window.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async blob => { window.savedBlob = blob; window.writes++; }, close: async () => {} }) });
      });
    }
    await picker();
    async function generate(url = A) {
      await page.fill('#content', url); await page.click('.generate');
      assert.equal(await page.locator('#preview-badge').textContent(), '格式符合・未檢查轉址');
      assert.ok(await page.locator('#download-png').isEnabled());
    }
    async function save(format = 'png') {
      await page.click('#download-' + format);
      await page.waitForFunction(() => document.getElementById('status').textContent.includes('圖片已儲存'));
    }
    async function readQR() {
      const image = await page.evaluate(async () => {
        const bitmap = await createImageBitmap(window.savedBlob); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
        const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false;
        context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.width, 0, 0, 512, 512);
        const bytes = context.getImageData(0, 0, 512, 512).data;
        let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return { width: bitmap.width, height: bitmap.height, pixels: btoa(binary) };
      });
      return { ...image, decoded: jsQR(new Uint8ClampedArray(Buffer.from(image.pixels, 'base64')), 512, 512)?.data };
    }
    await page.selectOption('#size', '1024');
    for (const url of [A, B, product, '  ' + A + '  ']) {
      await generate(url); await save(); const image = await readQR();
      assert.equal(image.decoded, url.trim()); assert.equal(image.width, 1024); assert.equal(image.height, 1261);
    }
    for (const size of ['2048', '4096']) {
      await page.selectOption('#size', size); await save();
      assert.deepEqual(await page.evaluate(async () => { const b = await createImageBitmap(window.savedBlob); return [b.width, b.height]; }), [Number(size), Number(size) + Math.round(237 * Number(size) / 1024)]);
    }
    console.log('PASS: static homepage navigation and all PNG sizes decode to the original shop URL.');
    await page.selectOption('#size', '1024');
    await page.fill('#caption', '璐璐璐 A&B 👻'); await page.selectOption('#caption-intro', '歡迎逛逛我的賣場 ♡'); await page.fill('#caption-color', '#f6dfeb');
    await save(); assert.equal((await readQR()).decoded, A);
    assert.deepEqual(await page.evaluate(async () => {
      const b = await createImageBitmap(window.savedBlob); const canvas = document.createElement('canvas'); canvas.width = b.width; canvas.height = b.height;
      const c = canvas.getContext('2d'); c.drawImage(b, 0, 0); return Array.from(c.getImageData(0, 1025, 1, 1).data);
    }), [246, 223, 235, 255]);
    await save('svg'); const svg = await page.evaluate(() => window.savedBlob.text());
    assert.match(svg, /A&amp;B/); assert.match(svg, /myship\.7-11\.com\.tw/); assert.match(svg, /不代表安全認證/); assert.match(svg, /未檢查轉址・請自行核對原始連結/);
    await page.fill('#caption-color', '#000000'); assert.equal(await page.locator('#qr-preview text').first().getAttribute('fill'), '#ffffff');
    for (const name of ['加入 LINE 客服', '0912345678', '@group1234', 'https://evil.example']) {
      await page.fill('#caption', name); assert.ok(await page.locator('#download-png').isDisabled()); assert.ok(await page.locator('#error').isVisible());
    }
    await page.fill('#caption', '璐璐璐的小賣場 👻'); await generate();
    for (const url of ['https://example.com', A + '?next=https://line.me', 'https://mall.iopenmall.tw/016089/login.php', 'https://mall.iopenmall.tw.evil.example/016089/']) {
      await page.fill('#content', url); await page.click('.generate'); assert.ok(await page.locator('#download-png').isDisabled()); assert.equal(await page.locator('#qr-preview svg').count(), 0);
    }
    await generate();
    await page.context().setOffline(true);
    await page.clock.install(); await page.clock.fastForward(61000);
    await save(); assert.equal((await readQR()).decoded, A);
    await page.clock.resume();
    await page.context().setOffline(false);
    console.log('PASS: local name/URL controls, caption colors, fixed warnings and offline download without an expiry/backend dependency.');
    await page.evaluate(() => { window.showSaveFilePicker = async () => { throw new DOMException('Cancel', 'AbortError'); }; });
    await page.click('#download-png'); await page.waitForFunction(() => document.getElementById('status').textContent.includes('已取消')); assert.ok(await page.locator('#download-png').isEnabled());
    await page.evaluate(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
    const fallback = page.waitForEvent('download'); await page.click('#download-svg'); assert.equal(await (await fallback).failure(), null);
    await page.fill('#caption-color', '#e9efdf'); await generate();
    await page.evaluate(() => { document.activeElement.blur(); scrollTo({ top: 0, behavior: 'instant' }); });
    await page.screenshot({ path: path.join(root, 'test-results/static-desktop.png'), fullPage: true });
    for (const width of [320, 375, 390, 430, 768]) { await page.setViewportSize({ width, height: 900 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
    await page.setViewportSize({ width: 375, height: 900 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(root, 'test-results/static-mobile.png'), fullPage: true });
    const { pathToFileURL } = require('node:url');
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href); await page.click('.choice-action'); await generate(B);
    await page.evaluate(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
    const localDownload = page.waitForEvent('download'); await page.click('#download-png'); assert.equal(await (await localDownload).failure(), null);
    assert.deepEqual(external, []); assert.deepEqual(errors, []);
    console.log('PASS: save cancellation, fallback/file:// downloads, mobile layouts and zero external requests.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
