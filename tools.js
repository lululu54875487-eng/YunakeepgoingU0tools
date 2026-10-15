/* Add future tool pages here. Relative paths support GitHub Pages and offline use. */
const littleUTools = [
  {
    title: 'QR Code 產生器',
    description: '網址、文字，通通變成一張 QR Code。清晰下載，讓分享更簡單。',
    href: 'qrcode.html',
    icon: '👻',
    category: '分享小幫手',
    features: ['網址 / 文字', '高畫質下載']
  }
];
(() => {
  const grid = document.getElementById('tool-grid');
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  for (const tool of littleUTools) {
    const link = element('a', 'tool-choice');
    link.href = tool.href;
    const top = element('div', 'choice-top');
    const icon = element('span', 'choice-icon', tool.icon);
    icon.setAttribute('aria-hidden', 'true');
    top.append(icon, element('span', 'choice-category', tool.category));
    const heading = element('h3', '', tool.title);
    const description = element('p', 'choice-description', tool.description);
    const tags = element('div', 'choice-tags');
    tool.features.forEach(feature => tags.append(element('span', '', feature)));
    const action = element('div', 'choice-action', '開始使用');
    const arrow = element('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    action.append(arrow);
    link.append(top, heading, description, tags, action);
    grid.append(link);
  }
  document.getElementById('tool-count').textContent = `${littleUTools.length} 個工具`;
})();
