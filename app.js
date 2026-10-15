/* All encoding and file creation stay on the user's device. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('content');
  const pngButton = $('download-png');
  const svgButton = $('download-svg');
  const encoder = new TextEncoder();
  qrcode.stringToBytes = text => Array.from(encoder.encode(text));
  let current = null;
  let timer;
  let saving = false;

  function encode(text) {
    // M is preferred; L allows larger payloads up to QR version 40 capacity.
    for (const level of ['M', 'L']) {
      try {
        const qr = qrcode(0, level);
        qr.addData(text, 'Byte');
        qr.make();
        return qr;
      } catch (error) {
        if (level === 'L') throw error;
      }
    }
  }
  function svgMarkup(qr) {
    const n = qr.getModuleCount();
    const paths = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (qr.isDark(y, x)) paths.push(`M${x + 4},${y + 4}h1v1h-1z`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 8} ${n + 8}" width="${(n + 8) * 16}" height="${(n + 8) * 16}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${paths.join('')}" fill="#17291d"/></svg>`;
  }
  function setButtons() {
    pngButton.disabled = svgButton.disabled = !current || saving;
  }
  function invalidate() {
    current = null;
    setButtons();
    $('preview-badge').textContent = input.value ? '等待產生' : '示範預覽';
    $('qr-preview').style.opacity = input.value ? '.2' : '1';
    $('preview-note').textContent = input.value ? '內容已變更，正在準備新的 QR Code…' : '貼上你的內容，製作專屬 QR Code';
    if (!input.value) showSample();
  }
  function showSample() {
    $('qr-preview').innerHTML = svgMarkup(encode('https://example.com'));
    $('qr-preview').setAttribute('aria-label', '示範 QR Code，內容為 https://example.com');
    $('card-caption').textContent = '讓美好的事，被看見。';
  }
  function generate(announce = true) {
    clearTimeout(timer);
    $('error').hidden = true;
    $('status').textContent = '';
    const text = input.value;
    if (!text.trim()) {
      invalidate();
      if (announce) showError('先放入網址或文字，就能開始製作囉。');
      return;
    }
    if (encoder.encode(text).length > 2953) {
      showError('內容太長囉！單張 QR Code 最多支援 2,953 bytes，請縮短文字或使用較短的網址。');
      return;
    }
    try {
      const qr = encode(text);
      current = { qr, text, svg: svgMarkup(qr) };
      $('qr-preview').innerHTML = current.svg;
      $('qr-preview').style.opacity = '1';
      $('qr-preview').setAttribute('aria-label', '依輸入內容產生的 QR Code');
      $('preview-badge').textContent = '✓ 已準備好';
      $('card-caption').textContent = '掃一下，分享你的美好。';
      $('preview-note').textContent = '專屬 QR Code 完成，隨時可以帶走 ♡';
      if (announce) $('status').textContent = 'QR Code 已產生，可以下載圖片了。';
      setButtons();
    } catch {
      showError('目前無法產生 QR Code，請縮短內容後再試一次。');
    }
  }
  function showError(message) {
    current = null;
    setButtons();
    $('error').textContent = message;
    $('error').hidden = false;
    $('preview-badge').textContent = '需要調整內容';
    $('qr-preview').style.opacity = '.2';
    $('preview-note').textContent = '調整內容後，就能繼續製作。';
  }
  function pngBlob(qr, size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return Promise.reject(new Error('Canvas unavailable'));
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    context.fillStyle = '#17291d';
    const n = qr.getModuleCount();
    const scale = Math.floor(size / (n + 8));
    const offset = Math.floor((size - n * scale) / 2);
    // Integer pixels keep every module sharp and at least four modules of white margin.
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (qr.isDark(y, x)) context.fillRect(offset + x * scale, offset + y * scale, scale, scale);
    }
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
  }
  async function download(format) {
    if (!current || saving) return;
    const snapshot = current;
    const size = Number($('size').value);
    const name = `little-u-qrcode${format === 'png' ? '-' + size : ''}.${format}`;
    saving = true;
    setButtons();
    $('status').textContent = '正在準備圖片…';
    try {
      // Call immediately within the user gesture, before asynchronous PNG encoding.
      let handle = null;
      if (typeof window.showSaveFilePicker === 'function' && window.isSecureContext) {
        try {
          handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: format === 'png' ? 'PNG 圖片' : 'SVG 向量圖片', accept: { [format === 'png' ? 'image/png' : 'image/svg+xml']: ['.' + format] } }] });
        } catch (error) {
          if (error.name === 'AbortError') { $('status').textContent = '已取消儲存，圖片仍可隨時下載。'; return; }
          if (!['SecurityError', 'NotAllowedError', 'NotSupportedError'].includes(error.name)) throw error;
        }
      }
      const blob = format === 'png' ? await pngBlob(snapshot.qr, size) : new Blob([snapshot.svg], { type: 'image/svg+xml;charset=utf-8' });
      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        $('status').textContent = '圖片已儲存，開心分享吧 ♡';
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        $('status').textContent = '已啟動下載，請查看瀏覽器下載項目或裝置的檔案資料夾。';
      }
    } catch {
      $('status').textContent = '圖片未能儲存，請重新點擊下載，並確認瀏覽器允許下載檔案。';
    } finally {
      saving = false;
      setButtons();
    }
  }
  input.addEventListener('input', () => {
    clearTimeout(timer);
    $('count').textContent = `${encoder.encode(input.value).length.toLocaleString('en-US')} bytes`;
    $('error').hidden = true;
    $('status').textContent = '';
    invalidate();
    if (input.value.trim()) timer = setTimeout(() => generate(false), 400);
  });
  $('qr-form').addEventListener('submit', event => {
    event.preventDefault();
    generate();
    if (current && window.matchMedia('(max-width: 760px)').matches) {
      input.blur();
      document.querySelector('.preview-panel').scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start'
      });
    }
  });
  $('clear').addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); });
  document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.example;
    input.dispatchEvent(new Event('input'));
    generate();
  }));
  pngButton.addEventListener('click', () => download('png'));
  svgButton.addEventListener('click', () => download('svg'));
  showSample();
})();
