# 小U工具包 🌿

鼠尾草綠、清新可愛的網址與文字 QR Code 工具。純 HTML / CSS / JavaScript，無需建置、帳號、API 金鑰或後端。

## 開始使用

解壓縮後直接用瀏覽器開啟 `index.html` 即可使用。所有資源都包含在專案內，離線也能產生 QR Code。輸入內容不會上傳，也不會存到瀏覽器儲存空間。

- 支援網址、中文、英文、emoji、換行與其他 Unicode 文字；原樣保留輸入內容。
- 輸入後自動產生，也可按「產生 QR Code」。
- PNG：1024、2048、4096 像素；整數像素繪製，保留至少四個模組白邊。
- SVG：向量圖片，可放大或印刷。
- 使用 QR Code 標準容量，最多 2,953 UTF-8 bytes；超過會顯示提示。一般使用 M 容錯，長內容自動改用 L。
- 不驗證網址是否存在；掃描器會決定內容應以網址或文字開啟。

## 圖片儲存方式

在支援 File System Access API 的安全環境（HTTPS 或 localhost）中，點下載會先開啟系統「另存新檔」視窗。其他瀏覽器或本機檔案環境使用一般檔案下載。是否出現儲存詢問、儲存位置，以及手機上能否直接存至相簿，由瀏覽器與作業系統決定，網站無法強制相同對話框。PNG 可以從裝置的下載或檔案資料夾開啟及分享。

## 上傳 GitHub / 啟用 GitHub Pages

1. 在 GitHub 建立 repository。
2. **先解壓縮 ZIP**，把 `index.html`、`styles.css`、`app.js`、`assets` 等內容上傳到 repository 根目錄。只上傳 ZIP 不會直接顯示網站。
3. 前往 **Settings → Pages**，將來源設為 **Deploy from a branch**。
4. 選擇 `main` 分支及 `/ (root)`，儲存，等待 GitHub 部署完成。
5. 網址通常為 `https://你的帳號.github.io/你的repository名稱/`。

所有資源皆採相對路徑，適用於 GitHub Pages 子目錄。

## 檔案

- `index.html`：頁面與文字
- `styles.css`：響應式鼠尾草綠配色
- `app.js`：編碼、預覽與下載
- `assets/qrcode.js`：隨附 qrcode-generator 2.0.4
- `THIRD_PARTY_LICENSES.md`：第三方授權
- `tests/`：開發驗證腳本
- `package.json`：僅開發驗證使用，網站執行不需 npm

## 開發驗證

安裝 Node.js 後執行 `npm install`，再執行 `npm test`。瀏覽器測試使用本機 Microsoft Edge 或 Chrome；可透過 `BROWSER_PATH` 指定 Chromium 執行檔。

編碼套件與 API 來源：[qrcode-generator 官方文件](https://github.com/kazuhikoarase/qrcode-generator/blob/master/js/README.md)。
