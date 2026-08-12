(()=>{
  const escL=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initialsL=n=>(String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?');
  const avatarL=(p)=>p?.avatar_url?`<img class="lb-live-avatar" src="${escL(p.avatar_url)}" alt="">`:`<span class="lb-live-avatar">${initialsL(p?.display_name)}</span>`;
  const rateL=p=>(p.games_played||0)?Math.round((p.wins||0)/(p.games_played||1)*100):0;
  const dateL=d=>d?new Date(d).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}):'—';
  async function showDossierL(id){
    const {data:p,error}=await db.from('players').select('*').eq('user_id',id).single();
    if(error){notice(error.message,'error');return;}
    const {data:pr}=await db.from('profiles').select('display_name,avatar_url,bio').eq('id',id).maybeSingle();
    const [owned,against]=await Promise.all([
      db.from('games').select('*').eq('owner_user_id',id).order('played_at',{ascending:false}).limit(50),
      db.from('games').select('*').eq('opponent_user_id',id).order('played_at',{ascending:false}).limit(50)
    ]);
    const games=[...(owned.data||[]),...(against.data||[])].filter((g,i,a)=>a.findIndex(x=>x.id===g.id)===i).sort((a,b)=>new Date(b.played_at||0)-new Date(a.played_at||0));
    const ids=[...new Set(games.flatMap(g=>[g.owner_user_id,g.opponent_user_id]).filter(Boolean))];
    const {data:people}=ids.length?await db.from('profiles').select('id,display_name').in('id',ids):{data:[]};
    const names=new Map((people||[]).map(x=>[x.id,x.display_name]));
    const me=pr?.display_name||p.display_name;
    const rows=games.slice(0,30).map(g=>{
      const owner=g.owner_user_id===id;
      const opp=owner?(g.opponent_name||'Unknown'):(names.get(g.owner_user_id)||'Unknown');
      const result=owner?(g.result||'draw'):(g.result==='win'?'loss':g.result==='loss'?'win':'draw');
      const myVp=owner?g.player_score:g.opponent_score;
      const theirVp=owner?g.opponent_score:g.player_score;
      const winner=result==='win'?me:result==='loss'?opp:'DRAW';
      return `<div class="game-row"><div><strong>${escL(me)} VS ${escL(opp)}</strong><span>${escL(owner?(g.player_faction||'Unknown'):(g.opponent_faction||'Unknown'))} vs ${escL(owner?(g.opponent_faction||'Unknown'):(g.player_faction||'Unknown'))} · ${dateL(g.played_at)}</span></div><div><b class="result ${escL(result)}">${escL(result.toUpperCase())}</b><span>WINNER: ${escL(winner)} · ${myVp??'—'}–${theirVp??'—'} VP</span></div></div>`;
    }).join('');
    openModal(`<div class="panel-head"><h3>PLAYER DOSSIER</h3><button class="secondary" id="lbLiveClose">CLOSE</button></div><div class="public-profile"><div class="public-profile-head">${avatarL({display_name:me,avatar_url:pr?.avatar_url})}<div><div class="eyebrow">PLAYER RECORD</div><h2>${escL(me)}</h2>${pr?.bio?`<div class="public-profile-bio">${escL(pr.bio)}</div>`:''}<p>${escL(p.primary_faction||'Faction unassigned')}</p></div></div><div class="stats"><article><small>WINS</small><b>${p.wins||0}</b></article><article><small>LOSSES</small><b>${p.losses||0}</b></article><article><small>DRAWS</small><b>${p.draws||0}</b></article><article class="rate"><small>WIN RATE</small><b>${rateL(p)}%</b></article></div><div class="public-battles"><small>RECENT MATCHES</small>${rows||'<div class="empty">No battle reports.</div>'}</div></div>`);
    document.querySelector('#lbLiveClose')?.addEventListener('click',closeModal);
  }
  async function renderLiveLeaderboard(){
    const c=document.querySelector('#page'); if(!c)return;
    c.innerHTML='<div class="empty">LOADING LEADERBOARD…</div>';
    const [{data:players,error},{data:profiles}]=await Promise.all([
      db.from('players').select('*').order('wins',{ascending:false}).order('games_played',{ascending:false}).order('display_name'),
      db.from('profiles').select('id,display_name,avatar_url,bio')
    ]);
    if(error){c.innerHTML=`<div class="empty"><b>COMMAND ERROR</b><br>${escL(error.message)}</div>`;return;}
    const pm=new Map((profiles||[]).map(x=>[x.id,x]));
    c.innerHTML=`<section class="panel"><div class="panel-head"><h3>CHAMPIONS OF THE WAR</h3><span class="field-help">TAP A PLAYER TO VIEW STATS & MATCHES</span></div><div class="table lb-live-table">${(players||[]).map((p,i)=>{const pr=pm.get(p.user_id)||{};return `<button type="button" class="rank-row lb-live-row" data-user-id="${escL(p.user_id)}"><b>#${i+1}</b><span class="lb-live-identity">${avatarL({display_name:p.display_name,avatar_url:pr.avatar_url})}<span class="lb-live-name"><strong>${escL(p.display_name)}</strong>${pr.bio?`<small>${escL(pr.bio)}</small>`:''}</span></span><span>${escL(p.primary_faction||'Unassigned')}</span><strong>${p.wins||0}W / ${p.losses||0}L / ${p.draws||0}D</strong><em>${rateL(p)}%</em></button>`}).join('')||'<div class="empty">No ranked players yet.</div>'}</div></section>`;
    c.querySelectorAll('.lb-live-row').forEach(row=>row.addEventListener('click',()=>showDossierL(row.dataset.userId)));
  }
  document.addEventListener('click',e=>{
    const nav=e.target.closest?.('[data-view="leaderboard"]');
    if(!nav)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(typeof S!=='undefined')S.view='leaderboard';
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===nav));
    const t=document.querySelector('#pageTitle');if(t)t.textContent='LEADERBOARD';
    renderLiveLeaderboard();
  },true);
  const style=document.createElement('style');style.textContent=`.lb-live-table .lb-live-row{display:grid;grid-template-columns:44px minmax(180px,1.5fr) minmax(120px,1fr) auto auto;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;pointer-events:auto!important}.lb-live-identity{display:flex;align-items:center;gap:10px;min-width:0}.lb-live-name{display:flex;flex-direction:column;min-width:0}.lb-live-name strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lb-live-name small{margin-top:2px;color:#bcaeb8;font-size:11px;line-height:1.25;white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lb-live-avatar{width:38px;height:38px;min-width:38px;border-radius:50%;object-fit:cover;display:inline-flex;align-items:center;justify-content:center;background:#2a101c;color:#e0b25d;border:1px solid #a56b32;font-size:11px;font-weight:800}.lb-live-row>*{min-width:0}@media(max-width:700px){.lb-live-table .lb-live-row{grid-template-columns:34px minmax(0,1fr) auto;gap:8px}.lb-live-table .lb-live-row>span:nth-child(3){display:none}.lb-live-table .lb-live-row>strong{font-size:11px}.lb-live-name small{font-size:10px}}`;document.head.appendChild(style);
})();
