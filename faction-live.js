(()=>{
const renderFactionStats=async()=>{
 const page=document.querySelector('#page'); if(!page) return;
 page.innerHTML='<div class="empty">LOADING FACTION RECORDS…</div>';
 try{
  const {data,error}=await db.rpc('get_faction_stats'); if(error) throw error;
  const rows=data||[];
  page.innerHTML=`<section class="panel faction-command-panel"><div class="panel-head"><h3>FACTION WAR RECORDS</h3><span class="faction-sort">HIGHEST WIN RATE FIRST</span></div><div class="faction-stats-list">${rows.length?rows.map((f,i)=>{const pct=Number(f.win_rate||0);return `<article class="faction-stat-row"><div class="faction-stat-top"><div class="faction-stat-name"><span class="faction-rank">#${i+1}</span><span class="faction-mark">⚔</span><strong>${esc(f.faction)}</strong></div><strong class="faction-percent">${pct.toFixed(1)}%</strong></div><div class="faction-bar"><span style="width:${Math.max(0,Math.min(100,pct))}%"></span></div><div class="faction-stat-bottom"><span><b>${f.wins}</b> W</span><span><b>${f.losses}</b> L</span><span><b>${f.draws}</b> D</span><span><b>${f.games}</b> GAMES</span></div></article>`}).join(''):'<div class="empty">No recorded battles yet. Faction war records will appear here automatically.</div>'}</div></section>`;
 }catch(e){page.innerHTML=errorBox(e)}
};
const css=document.createElement('style');css.textContent=`.faction-command-panel{overflow:hidden}.faction-sort{font-size:11px;letter-spacing:.12em;color:#d8a84f}.faction-stats-list{display:flex;flex-direction:column;gap:10px}.faction-stat-row{padding:14px 16px;background:linear-gradient(90deg,#160914,#0c0710);border:1px solid #43202e;border-radius:10px}.faction-stat-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.faction-stat-name{display:flex;align-items:center;gap:10px;min-width:0}.faction-rank{color:#d8a84f;font-weight:800;min-width:30px}.faction-mark{color:#b23b4f}.faction-stat-name strong{color:#f5e9d2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.faction-percent{color:#e0b25d;font-size:18px}.faction-bar{height:9px;margin:10px 0 9px;background:#25101c;border:1px solid #482133;border-radius:99px;overflow:hidden}.faction-bar span{display:block;height:100%;background:linear-gradient(90deg,#72182d,#b22f45,#e0a84f);box-shadow:0 0 12px #a72c4566}.faction-stat-bottom{display:flex;gap:18px;color:#bfaebd;font-size:12px;letter-spacing:.05em}.faction-stat-bottom b{color:#f0d6a4}@media(max-width:700px){.faction-stat-row{padding:12px}.faction-stat-bottom{gap:10px;justify-content:space-between;font-size:10px}.faction-percent{font-size:16px}.faction-sort{font-size:9px}}
`;document.head.appendChild(css);
const hook=()=>{const b=[...document.querySelectorAll('[data-view="factions"]')][0];if(b&&!b.dataset.factionHook){b.dataset.factionHook='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();renderFactionStats() },true)}};
new MutationObserver(hook).observe(document.body,{childList:true,subtree:true});hook();
})();
