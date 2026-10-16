/* Static edition: local format checks only. No network or redirect verification. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('content');
  const pngButton = $('download-png');
  const svgButton = $('download-svg');
  const encoder = new TextEncoder();
  const policy = window.LittleUPolicy;
  qrcode.stringToBytes = text => Array.from(encoder.encode(text));
  let current = null;
  let saving = false;
  const fontFamily = '"Microsoft JhengHei", "Noto Sans TC", Arial, sans-serif';
  const measure = document.createElement('canvas').getContext('2d');
  function captionLayout(destination) {
    const name = policy.validateShopName($('caption').value);
    const intro = $('caption-intro').value;
    if (!policy.introductions.includes(intro)) throw new Error('請選擇清單中的固定介紹文字。');
    const text = [name, intro].filter(Boolean).join('\n');
    const background = $('caption-color').value;
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(text)) throw new Error('文字包含無法顯示的控制字元，請刪除後再試。');
    if (Array.from(text).length > 120) throw new Error('圖片下方文字最多 120 字，請縮短後再試一次。');
    measure.font = `600 42px ${fontFamily}`;
    const lines = [];
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-Hant', { granularity: 'grapheme' }) : null;
    for (const paragraph of text.split('\n')) {
      let line = '';
      const characters = segmenter ? Array.from(segmenter.segment(paragraph), part => part.segment) : Array.from(paragraph);
      for (const character of characters) {
        if (line && measure.measureText(line + character).width > 944) { lines.push(line); line = ''; }
        line += character;
      }
      lines.push(line);
    }
    if (lines.length > 6) throw new Error('圖片文字最多顯示 6 行，請減少文字或換行。');
    const channels = [1, 3, 5].map(start => parseInt(background.slice(start, start + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    const userHeight = text ? 64 + lines.length * 58 : 0;
    const foreground = luminance > .179 ? '#000000' : '#ffffff';
    const entries = text ? lines.map((line, index) => ({ text: line, y: 32 + 45 + index * 58, size: 42, fill: foreground })) : [];
    const fixed = [`${destination.platform}｜${destination.host}`, `賣場識別：${destination.shopId}`, ...policy.fixedNotice, '未檢查轉址・請自行核對原始連結'];
    fixed.forEach((line, index) => entries.push({ text: line, y: userHeight + 40 + index * 42, size: index === 0 ? 32 : 28, fill: '#344637' }));
    return { entries, height: userHeight + 27 + fixed.length * 42, userHeight, background, foreground };
  }
  function escapeXML(text) {
    return text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
  }

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
  function svgMarkup(qr, caption) {
    const n = qr.getModuleCount();
    const paths = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (qr.isDark(y, x)) paths.push(`M${x + 4},${y + 4}h1v1h-1z`);
    }
    const footer = `<rect x="0" y="1024" width="1024" height="${caption.height}" fill="#f7f9f4"/><rect x="0" y="1024" width="1024" height="${caption.userHeight}" fill="${caption.background}"/>` + caption.entries.map(line => `<text x="512" y="${1024 + line.y}" text-anchor="middle" xml:space="preserve" font-family="Microsoft JhengHei, Noto Sans TC, Arial, sans-serif" font-size="${line.size}" font-weight="600" fill="${line.fill}">${escapeXML(line.text)}</text>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 ${1024 + caption.height}" width="1024" height="${1024 + caption.height}"><rect width="100%" height="100%" fill="white"/><path d="${paths.join('')}" transform="scale(${1024 / (n + 8)})" shape-rendering="crispEdges" fill="#17291d"/>${footer}</svg>`;
  }
  function setButtons() {
    pngButton.disabled = svgButton.disabled = !current || saving;
  }
  function invalidate() {
    current = null;
    setButtons();
    $('preview-badge').textContent = '等待產生';
    $('verification-state').textContent = '本版僅檢查網址格式，未檢查轉址、頁面內容或賣家身分。';
    $('verified-destination').textContent = '';
    $('qr-preview').style.opacity = input.value ? '.2' : '1';
    $('preview-note').textContent = '貼上直接賣場連結，製作附提醒的分享小卡。';
    showSample();
  }
  function showSample() {
    $('qr-preview').innerHTML = '<div class="empty-preview"><span aria-hidden="true">👻</span><p>貼上賣場連結<br>製作分享小卡</p></div>';
    $('qr-preview').setAttribute('aria-label', '尚未產生 QR Code');
    $('card-caption').textContent = '讓美好的事，被看見。';
  }
  function generate(announce = true) {
    invalidate();
    $('error').hidden = true;
    $('status').textContent = '';
    if (!input.value.trim()) {
      if (announce) showError('先放入賣貨便或 iOPEN Mall 的直接賣場連結，就能開始製作囉。');
      return;
    }
    try {
      const destination = policy.validateShopURL(input.value);
      const caption = captionLayout(destination);
      const qr = encode(destination.url);
      current = { qr, text: destination.url, caption, svg: svgMarkup(qr, caption) };
      $('qr-preview').innerHTML = current.svg;
      $('qr-preview').style.opacity = '1';
      $('qr-preview').setAttribute('aria-label', 'QR Code 分享小卡，含固定網域、防詐提醒及未檢查轉址標示');
      $('preview-badge').textContent = '格式符合・未檢查轉址';
      $('verification-state').textContent = '網址格式符合本工具規則；未檢查轉址、頁面內容或賣家身分，不代表交易安全。';
      $('verified-destination').textContent = destination.url;
      $('card-caption').textContent = '請核對掃描後的網址。';
      $('preview-note').textContent = '圖片固定保留目的網域、防詐提醒及未檢查轉址標示。';
      if (announce) $('status').textContent = '分享小卡已產生。未檢查轉址，分享前請自行確認原始連結。';
      setButtons();
    } catch (error) {
      showError(error.message || '無法產生圖片，請檢查輸入內容。');
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
    $('verification-state').textContent = '輸入內容不符合規則，禁止產圖下載。本版未檢查轉址。';
    $('verified-destination').textContent = '';
    showSample();
  }
  function pngBlob(qr, size, caption) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size + Math.round(caption.height * size / 1024);
    const context = canvas.getContext('2d');
    if (!context) return Promise.reject(new Error('Canvas unavailable'));
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, canvas.height);
    context.fillStyle = '#17291d';
    const n = qr.getModuleCount();
    const scale = Math.floor(size / (n + 8));
    const offset = Math.floor((size - n * scale) / 2);
    // Integer pixels keep every module sharp and at least four modules of white margin.
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (qr.isDark(y, x)) context.fillRect(offset + x * scale, offset + y * scale, scale, scale);
    }
    if (caption.height) {
      const ratio = size / 1024;
      context.fillStyle = caption.background;
      context.fillRect(0, size, size, caption.userHeight * ratio);
      context.fillStyle = '#f7f9f4';
      context.fillRect(0, size + caption.userHeight * ratio, size, (caption.height - caption.userHeight) * ratio);
      context.textAlign = 'center';
      caption.entries.forEach(line => {
        context.fillStyle = line.fill;
        context.font = `600 ${line.size * ratio}px ${fontFamily}`;
        context.fillText(line.text, size / 2, size + line.y * ratio);
      });
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
      const destination = policy.validateShopURL(input.value);
      policy.validateShopName($('caption').value);
      if (current !== snapshot || destination.url !== snapshot.text) {
        showError('內容已改變，請重新產生圖片後再下載。');
        return;
      }
      const blob = format === 'png' ? await pngBlob(snapshot.qr, size, snapshot.caption) : new Blob([snapshot.svg], { type: 'image/svg+xml;charset=utf-8' });
      if (current !== snapshot) {
        $('status').textContent = '內容已變更，本次未儲存，請重新點擊下載。';
        return;
      }
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
      showError('圖片儲存未能完成，請確認輸入內容與下載權限後重試。');
      $('status').textContent = '圖片未儲存。';
    } finally {
      saving = false;
      setButtons();
    }
  }
  input.addEventListener('input', () => {
    $('count').textContent = `${encoder.encode(input.value).length.toLocaleString('en-US')} bytes`;
    $('error').hidden = true;
    $('status').textContent = '';
    invalidate();
    if (input.value.trim()) {
      try { policy.validateShopURL(input.value); $('verification-state').textContent = '網址格式符合，按「產生 QR Code」即可製作。本版未檢查轉址。'; }
      catch (error) { showError(error.message); }
    }
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
    $('verification-state').textContent = '這是虛構店號的格式範例，請換成自己的賣場連結；本版不檢查賣場是否存在或轉址。';
  }));
  pngButton.addEventListener('click', () => download('png'));
  svgButton.addEventListener('click', () => download('svg'));
  [$('caption'), $('caption-color'), $('caption-intro')].forEach(control => control.addEventListener('input', () => {
    $('caption-color-value').textContent = $('caption-color').value.toUpperCase();
    $('error').hidden = true;
    try {
      policy.validateShopName($('caption').value);
      if (current) generate(false);
    } catch (error) { showError(error.message); }
  }));
  showSample();
})();

