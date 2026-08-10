(() => {
  // Visual-only faction sigils. Intentionally avoids a global MutationObserver:
  // the Factions screen renders data dynamically and observing the whole app
  // can create a mutation/render feedback loop.
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
    return text ? factionRules.find(rule => rule.test.test(text)) || null : null;
  }

  function decorateElement(el) {
    if (!el || el.nodeType !== 1 || el.dataset.r721FactionDone === '1') return;
    if (!el.matches('.faction-stat-name, .faction-detail-row > div:first-child')) return;
    if (el.closest('input, textarea, select, button, .r721-faction-wrap')) return;

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

  function scan() {
    document
      .querySelectorAll('.faction-stat-name, .faction-detail-row > div:first-child')
      .forEach(decorateElement);
  }

  function start() {
    // Faction statistics are loaded asynchronously. Two lightweight scans are
    // enough to decorate the rendered results without watching the whole DOM.
    scan();
    window.setTimeout(scan, 1200);
    window.setTimeout(scan, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
