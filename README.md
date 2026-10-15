# 小U工具包 🌿

鼠尾草綠、清新可愛的小工具選單，搭配小幽靈 emoji 👻。首頁先選工具，再進入 QR Code 產生器。純 HTML / CSS / JavaScript，無需建置、帳號、API 金鑰或後端。

## 開始使用

解壓縮後直接用瀏覽器開啟 `index.html`，點「QR Code 產生器」即可使用。也可直接開啟 `qrcode.html`。所有資源都包含在專案內，離線也能產生 QR Code。輸入內容不會上傳，也不會存到瀏覽器儲存空間。

手機使用單欄版面、較大輸入字級與觸控按鈕。按「產生 QR Code」後會移動到預覽與下載區；自動預覽不會打斷輸入。

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
2. **先解壓縮 ZIP**，把 `index.html`、`qrcode.html`、`tools.js`、`styles.css`、`app.js`、`assets` 等內容上傳到 repository 根目錄。只上傳 ZIP 不會直接顯示網站。
3. 前往 **Settings → Pages**，將來源設為 **Deploy from a branch**。
4. 選擇 `main` 分支及 `/ (root)`，儲存，等待 GitHub 部署完成。
5. 網址通常為 `https://你的帳號.github.io/你的repository名稱/`。

所有資源皆採相對路徑，適用於 GitHub Pages 子目錄。

## 更新現有的 GitHub 網站

解壓縮新版 ZIP，在原本 repository 選 **Add file → Upload files**，上傳解壓縮後的全部內容並提交，覆蓋同名舊檔。請確認新增的 `qrcode.html` 與 `tools.js` 也有上傳。原本 GitHub Pages 設定可保留，部署完成後網站網址不變；如果仍看到舊版，請重新整理或清除網站快取。

## 之後新增工具

1. 建立新工具 HTML 檔案，例如 `new-tool.html`，使用相對路徑並放入返回 `index.html` 的連結。
2. 編輯 `tools.js` 的 `littleUTools` 陣列，新增一筆 `title`、`description`、`href`、`icon`、`category`、`features`。
3. 上傳新頁面與更新的 `tools.js`，首頁會自動顯示新工具卡片與工具數量。

目前只有 QR Code 工具可用；「慢慢長大中」是說明文字，不是尚未完成的工具按鈕。

## 檔案

- `index.html`：工具選單首頁
- `qrcode.html`：QR Code 工具頁
- `tools.js`：可擴充的工具清單
- `styles.css`：響應式鼠尾草綠配色
- `app.js`：編碼、預覽與下載
- `assets/qrcode.js`：隨附 qrcode-generator 2.0.4
- `THIRD_PARTY_LICENSES.md`：第三方授權
- `tests/`：開發驗證腳本
- `package.json`：僅開發驗證使用，網站執行不需 npm

## 開發驗證

安裝 Node.js 後執行 `npm install`，再執行 `npm test`。瀏覽器測試使用本機 Microsoft Edge 或 Chrome；可透過 `BROWSER_PATH` 指定 Chromium 執行檔。

編碼套件與 API 來源：[qrcode-generator 官方文件](https://github.com/kazuhikoarase/qrcode-generator/blob/master/js/README.md)。
