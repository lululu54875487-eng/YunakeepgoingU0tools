/* Shared URL/name policy used by the browser and the verification Worker. */
(() => {
  'use strict';
  const fixedNotice = ['僅供賣場分享・不代表安全認證', '請核對網址，勿依陌生訊息加入客服或操作轉帳'];
  function validateShopURL(value) {
    if (typeof value !== 'string' || value.length > 2048) throw new Error('請提供長度不超過 2,048 字元的完整賣場網址。');
    const text = value.trim();
    if (!/^https:\/\//i.test(text) || /[\s\\\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(text)) throw new Error('網址必須使用 HTTPS，且不能包含空白、反斜線或隱藏控制字元。');
    let url;
    try { url = new URL(text); } catch { throw new Error('網址格式不正確，請貼上完整的賣場或商品連結。'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['myship.7-11.com.tw', 'mall.iopenmall.tw'].includes(url.hostname)) throw new Error('僅接受賣貨便與 iOPEN Mall 的完整 HTTPS 網域。');
    if (!/^https:\/\/(?:myship\.7-11\.com\.tw|mall\.iopenmall\.tw)(?=\/|[?#]|$)/i.test(text)) throw new Error('網址包含不允許的主機名稱或連接埠。');
    // Reject normalization tricks before URL() can erase dot segments.
    const rawPath = text.replace(/^https:\/\/[^/?#]+/i, '').split(/[?#]/)[0];
    if (/%|\/\.|\/\//.test(rawPath) || url.hash) throw new Error('請使用直接賣場連結，不接受編碼路徑、相對路徑或網址片段。');
    let platform, shopId;
    if (url.hostname === 'myship.7-11.com.tw') {
      const match = /^\/general\/detail\/(GM\d{10,20})\/?$/i.exec(url.pathname);
      if (!match || url.search) throw new Error('賣貨便僅接受 /general/detail/GM… 的直接賣場連結，請移除額外參數。');
      platform = '賣貨便'; shopId = match[1];
    } else {
      const match = /^\/(\d{6})\/(?:index\.php)?$/.exec(url.pathname);
      if (!match) throw new Error('iOPEN Mall 僅接受六位店號的店家首頁或商品頁。');
      shopId = match[1]; platform = 'iOPEN Mall';
      const entries = [...url.searchParams.entries()];
      if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error('網址不能包含重複參數。');
      if (entries.length) {
        const action = url.searchParams.get('action');
        if (!url.pathname.endsWith('/index.php') || action !== 'product_detail' || entries.length !== 2 || !/^P\d{10,20}$/.test(url.searchParams.get('prod_no') || '') || entries.some(([key]) => !['action', 'prod_no'].includes(key))) throw new Error('只接受店家首頁或 action=product_detail 與 prod_no 的直接商品連結，不接受轉址或其他參數。');
      }
    }
    return Object.freeze({ url: url.href, host: url.hostname, platform, shopId });
  }
  function validateShopName(value) {
    if (typeof value !== 'string') throw new Error('請輸入賣場名稱。');
    const name = value.normalize('NFKC').trim();
    if (Array.from(name).length > 24) throw new Error('賣場名稱最多 24 字，請勿放入聯絡資訊或宣傳文案。');
    if (/[\r\n\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(name) || /[^\p{L}\p{M}\p{N}\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F _·・＆&()（）-]/u.test(name)) throw new Error('名稱只允許中英文、數字、一般 emoji、空格與簡單括號；不可放入網址、帳號、電話或換行。');
    const compact = name.replace(/[ _·・＆&()（）-]/g, '').toLowerCase();
    if (/(https?|www|line|telegram|discord|whatsapp|wechat|facebook|instagram|threads|tiktok|客服|官方|認證|验证|驗證|金流|帳戶|账户|解除|轉帳|转账|匯款|汇款|銀行|银行|投資|投资|保證|保证|加群|入群|加入|社群|群組|群组|聯絡|联系|加賴|加赖|賴我|赖我|領獎|领奖|抽獎|中奖|中獎|保證金|验证码|驗證碼|otp|atm)/iu.test(compact) || /\d{7,}/u.test(compact) || /[a-z]{2,}\d{4,}/i.test(compact)) throw new Error('名稱含有聯絡資訊、社群誘導或易混淆的客服／認證話術，請只填一般賣場名稱。');
    return name;
  }
  const introductions = Object.freeze(['', '歡迎逛逛我的賣場 ♡', '商品資訊請以賣場頁面為準', '喜歡的小物，分享給你 👻']);
  globalThis.LittleUPolicy = Object.freeze({ validateShopURL, validateShopName, fixedNotice: Object.freeze(fixedNotice), introductions });
})();
