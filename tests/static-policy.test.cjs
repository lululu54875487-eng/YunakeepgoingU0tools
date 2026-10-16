const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../security-policy.js');
const policy = globalThis.LittleUPolicy;
const A = 'https://myship.7-11.com.tw/general/detail/GM2607042239966';
const B = 'https://mall.iopenmall.tw/016089/';
test('local policy accepts direct shops and product links only', () => {
  for (const url of [A, B, ' ' + A + ' ', 'https://mall.iopenmall.tw/016089/index.php?action=product_detail&prod_no=P1608903714941']) assert.ok(policy.validateShopURL(url));
  for (const url of [
    'https://example.com', 'http://myship.7-11.com.tw/general/detail/GM2607042239966',
    'https://mall.iopenmall.tw.evil.example/016089/', 'https://mall.iopenmall.tw@evil.example/016089/',
    'https://user@mall.iopenmall.tw/016089/', 'https://mall.iopenmall.tw:8443/016089/',
    'https://myship.7-11.com.tw/Home/Login', B + '?redirect=https://line.me', A + '#group',
    'https://mall.iopenmall.tw/016089/../016089/', 'https://mall.iopenmall.tw/016089/%2e%2e/016089/',
    'https://mall.iopenmall.tw/016089/index.php?action=product_detail&prod_no=P1608903714941&action=login',
    'https://mall.iopenmall.tw/016089/\u200b'
  ]) assert.throws(() => policy.validateShopURL(url), undefined, url);
});
test('local names restrict contact information, social prompts and impersonation', () => {
  for (const name of ['', '璐璐璐的小賣場 👻', 'A&B 小舖', 'Little U']) assert.equal(typeof policy.validateShopName(name), 'string');
  for (const name of ['加入 LINE 客服', 'ＬＩＮＥ', 'L I N E', 'https://evil.example', '@group1234', '0912345678', '帳戶認證', '加群領獎', 'a\u202eb', '第一行\n第二行', '太'.repeat(25)]) assert.throws(() => policy.validateShopName(name), undefined, name);
});
