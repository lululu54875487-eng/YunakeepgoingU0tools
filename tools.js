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
    const card = element('article', 'tool-choice');
    const top = element('div', 'choice-top');
    const icon = element('span', 'choice-icon', tool.icon);
    icon.setAttribute('aria-hidden', 'true');
    top.append(icon, element('span', 'choice-category', tool.category));
    const heading = element('h3', '', tool.title);
    const description = element('p', 'choice-description', tool.description);
    const tags = element('div', 'choice-tags');
    tool.features.forEach(feature => tags.append(element('span', '', feature)));
    const action = element('a', 'choice-action', '開始使用');
    action.href = tool.href;
    action.setAttribute('aria-label', `開始使用${tool.title}`);
    const arrow = element('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    action.append(arrow);
    card.append(top, heading, description, tags, action);
    grid.append(card);
  }
  document.getElementById('tool-count').textContent = `${littleUTools.length} 個工具`;
  document.querySelectorAll('a[href="#tools"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      if (location.hash !== '#tools') location.hash = 'tools';
      const heading = document.getElementById('tools-title');
      const status = document.getElementById('directory-status');
      status.hidden = false;
      status.textContent = '選一個工具開始吧 👻';
      heading.focus({ preventScroll: true });
      // The href still provides native navigation when JavaScript is unavailable.
      requestAnimationFrame(() => document.getElementById('tools').scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start'
      }));
    });
  });
})();
