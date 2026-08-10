(() => {
  const factionRules = [
    { key: 'necron', icon: '☠', test: /necron/i },
    { key: 'ork', icon: '☘', test: /\borks?\b/i },
    { key: 'tyranid', icon: '⌁', test: /tyranid|genestealer/i },
    { key: 'aeldari', icon: '◇', test: /aeldari|eldar|drukhari|dark eldar/i },
    { key: 'tau', icon: '◈', test: /t['’]?au/i },
    { key: 'chaos', icon: '✦', test: /chaos|death guard|thousand sons|world eaters|emperor.?s children|daemon/i },
    { key: 'imperium', icon: '✠', test: /imperium|space marine|ultramarine|blood angel|dark angel|space wolf|black templar|deathwatch|imperial fist|salamander|raven guard|white scar|iron hand|grey knight|sister(s)? of battle|adepta sororitas|custodes|astra militarum|imperial guard|imperial knight|adeptus mechanicus|mechanicus/i },
    { key: 'xenos', icon: '◉', test: /xenos|votann|alien/i }
  ];

  function ruleFor(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    return factionRules.find(rule => rule.test.test(text)) || null;
  }

  function decorateElement(el) {
    if (!el || el.nodeType !== 1 || el.dataset.r721FactionDone === '1') return;
    if (el.closest('input, textarea, select, button')) return;

    const cls = String(el.className || '').toLowerCase();
    const isFactionContext = cls.includes('faction') ||
      el.matches('.faction-stat-name, .faction-detail-row > div:first-child');
    if (!isFactionContext) return;

    const text = el.textContent.trim();
    const rule = ruleFor(text);
    if (!rule) return;

    el.dataset.r721FactionDone = '1';
    const wrap = document.createElement('span');
    wrap.className = 'r721-faction-wrap';

    const sigil = document.createElement('span');
    sigil.className = `r721-faction-sigil ${rule.key}`;
    sigil.setAttribute('aria-hidden', 'true');
    sigil.textContent = rule.icon;

    const label = document.createElement('span');
    label.textContent = text;

    wrap.append(sigil, label);
    el.replaceChildren(wrap);
  }

  function scan(root = document) {
    if (root.nodeType === 1) decorateElement(root);
    root.querySelectorAll?.('.faction-stat-name, .faction-detail-row > div:first-child, [class*="faction"]').forEach(decorateElement);
  }

  function start() {
    scan();
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) scan(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
