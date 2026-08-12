(()=>{
  const getPage=()=>String(document.getElementById('pageTitle')?.textContent||'').trim().toLowerCase();
  const stop=()=>{clearTimeout(window.__lfTimer);window.__lfDesiredPage=getPage();};
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a,[role="button"],nav,li');
    if(!el)return;
    const text=String(el.textContent||'').trim().toLowerCase();
    const page=(el.getAttribute('data-view')||el.getAttribute('data-page')||'').toLowerCase();
    if(page && page!=='leaderboard'){stop();return;}
    if(/\bfactions?\b/.test(text)){window.__lfDesiredPage='factions';clearTimeout(window.__lfTimer);return;}
    if(/\bplayers?\b/.test(text)){window.__lfDesiredPage='players';clearTimeout(window.__lfTimer);return;}
    if(/\bmatches?\b/.test(text)){window.__lfDesiredPage='matches';clearTimeout(window.__lfTimer);return;}
    if(/\bleaderboard\b/.test(text)){window.__lfDesiredPage='leaderboard';return;}
  },true);
  const observer=new MutationObserver(()=>{
    const title=getPage();
    if(title && title!=='leaderboard' && window.__lfDesiredPage==='leaderboard'){
      window.__lfDesiredPage=title;
      clearTimeout(window.__lfTimer);
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
