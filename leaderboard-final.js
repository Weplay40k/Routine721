(()=>{
  const SUPABASE_URL='https://jbgwdxavydhtvoqpbfmj.supabase.co';
  const SUPABASE_KEY='sb_publishable_Wt8h6fNelT6zrzf-Dm8FXw_cdSGylaz';
  // Reuse the app client when available; only create one if the base app has not exposed it.
  const client=window.__routine721Supabase||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  window.__routine721Supabase=client;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=n=>(String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?');
  const avatar=(p,cls='lf-avatar')=>p?.avatar_url?`<img class="${cls}" src="${esc(p.avatar_url)}" alt="">`:`<span class="${cls}">${initials(p?.display_name)}</span>`;
  const pct=p=>(p.games_played||0)?Math.round((p.wins||0)/(p.games_played||1)*100):0;
  const date=d=>d?new Date(d).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}):'—';
  let rendering=false;

  function isLeaderboard(){
    const title=document.getElementById('pageTitle');
    return title && title.textContent.trim().toUpperCase()==='LEADERBOARD';
  }
  function container(){return document.getElementById('page');}

  async function render(){
    if(!isLeaderboard()) return;
    const c=container();
    if(!c || rendering) return;
    rendering=true;
    try{
      const {data:players,error}=await client.from('players').select('user_id,display_name,primary_faction,wins,losses,draws,games_played').order('wins',{ascending:false}).order('games_played',{ascending:false}).order('display_name');
      if(error) throw error;
      const ids=(players||[]).map(p=>p.user_id).filter(Boolean);
      const {data:profiles,error:profileError}=ids.length?await client.from('profiles').select('id,display_name,avatar_url,bio').in('id',ids):{data:[],error:null};
      if(profileError) throw profileError;
      const pm=new Map((profiles||[]).map(p=>[p.id,p]));
      c.innerHTML=`<section class="panel lf-leaderboard-panel"><div class="panel-head"><h3>CHAMPIONS OF THE WAR</h3><span class="field-help">SELECT A PLAYER TO VIEW STATS & MATCHES</span></div><div class="table lf-table">${(players||[]).map((p,i)=>{const pr=pm.get(p.user_id);return `<button type="button" class="lf-row" data-lf-user="${esc(p.user_id)}"><span class="lf-rank">#${i+1}</span><span class="lf-identity">${avatar({display_name:p.display_name,avatar_url:pr?.avatar_url})}<span class="lf-copy"><strong>${esc(p.display_name||'Battle-brother')}</strong>${pr?.bio?`<small>${esc(pr.bio)}</small>`:''}</span></span><span class="lf-faction">${esc(p.primary_faction||'Unassigned')}</span><strong>${p.wins||0}W / ${p.losses||0}L / ${p.draws||0}D</strong><em>${pct(p)}%</em></button>`}).join('')||'<div class="empty">No registered players yet.</div>'}</div></section>`;
      c.querySelectorAll('.lf-row').forEach(row=>row.addEventListener('click',()=>openDossier(row.dataset.lfUser)));
    }catch(e){console.error('Leaderboard:',e);c.innerHTML=`<div class="empty">Could not load leaderboard: ${esc(e.message)}</div>`}
    finally{rendering=false}
  }

  async function openDossier(userId){
    const {data:p,error}=await client.from('players').select('user_id,display_name,primary_faction,wins,losses,draws,games_played').eq('user_id',userId).maybeSingle();
    if(error||!p){alert(error?.message||'Player not found.');return}
    const {data:pr}=await client.from('profiles').select('id,display_name,avatar_url,bio').eq('id',userId).maybeSingle();
    const {data:games,error:gameError}=await client.from('games').select('*').or(`owner_user_id.eq.${userId},opponent_user_id.eq.${userId}`).order('played_at',{ascending:false}).limit(50);
    if(gameError){alert(gameError.message);return}
    const ids=[...new Set((games||[]).flatMap(g=>[g.owner_user_id,g.opponent_user_id]).filter(Boolean))];
    const {data:people}=ids.length?await client.from('profiles').select('id,display_name').in('id',ids):{data:[]};
    const names=new Map((people||[]).map(x=>[x.id,x.display_name]));
    const rows=(games||[]).map(g=>{const owner=g.owner_user_id===userId;const me=p.display_name||'Player';const opp=owner?(g.opponent_name||names.get(g.opponent_user_id)||'Unknown'):(names.get(g.owner_user_id)||'Unknown');const r=String(g.result||'draw').toLowerCase();const mine=owner?r:(r==='win'?'loss':r==='loss'?'win':'draw');const myVp=owner?g.player_score:g.opponent_score;const oppVp=owner?g.opponent_score:g.player_score;const winner=mine==='win'?me:mine==='loss'?opp:'DRAW';const myFaction=owner?g.player_faction:g.opponent_faction;const oppFaction=owner?g.opponent_faction:g.player_faction;return `<div class="lf-game"><div><strong>${esc(me)} VS ${esc(opp)}</strong><span>${esc(myFaction||'Unknown')} vs ${esc(oppFaction||'Unknown')} · ${date(g.played_at)}</span></div><div><b class="lf-result ${esc(mine)}">${esc(mine.toUpperCase())}</b><span>WINNER: ${esc(winner)} · ${myVp??'—'}–${oppVp??'—'} VP</span></div></div>`}).join('');
    const overlay=document.createElement('div');overlay.className='lf-overlay';overlay.innerHTML=`<div class="lf-modal"><button class="lf-close" type="button">×</button><div class="lf-profile-head">${avatar({display_name:p.display_name,avatar_url:pr?.avatar_url},'lf-profile-avatar')}<div><div class="lf-eyebrow">PLAYER DOSSIER</div><h2>${esc(p.display_name)}</h2><div class="lf-faction">${esc(p.primary_faction||'Faction unassigned')}</div>${pr?.bio?`<p class="lf-bio">${esc(pr.bio)}</p>`:''}</div></div><div class="lf-stats"><article><small>WINS</small><b>${p.wins||0}</b></article><article><small>LOSSES</small><b>${p.losses||0}</b></article><article><small>DRAWS</small><b>${p.draws||0}</b></article><article><small>WIN RATE</small><b>${pct(p)}%</b></article></div><div class="lf-section"><small>RECENT MATCHES</small>${rows||'<div class="empty">No battle reports.</div>'}</div></div>`;document.body.appendChild(overlay);overlay.querySelector('.lf-close').onclick=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }

  const style=document.createElement('style');style.textContent=`.lf-table .lf-row{display:grid!important;grid-template-columns:38px minmax(220px,1.8fr) minmax(120px,1fr) auto auto!important;align-items:center!important;gap:14px!important;width:100%!important;min-width:0!important;padding:12px 10px!important;border:0!important;border-top:1px solid #20202a!important;background:transparent!important;color:#c5c5cd!important;text-align:left!important;cursor:pointer!important;pointer-events:auto!important}.lf-table .lf-row:hover{background:#111117!important}.lf-identity{display:flex;align-items:center;gap:10px;min-width:0}.lf-copy{display:flex;flex-direction:column;min-width:0}.lf-copy strong{color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lf-copy small{margin-top:3px;color:#9a9098;font-size:10px;line-height:1.3;white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lf-avatar{width:38px;height:38px;min-width:38px;border-radius:50%;object-fit:cover;display:inline-flex;align-items:center;justify-content:center;background:#1a1016;border:1px solid #633044;color:#c6a85c;font-weight:800}.lf-rank{color:#c6a85c}.lf-faction{color:#c6a85c}.lf-row em{color:#fff;font-style:normal;font-weight:700}.lf-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.82)}.lf-modal{position:relative;width:min(760px,100%);max-height:90vh;overflow:auto;padding:24px;background:#0c0c11;border:1px solid #3b2931;border-radius:7px;box-shadow:0 25px 70px rgba(0,0,0,.8)}.lf-close{position:absolute;right:14px;top:10px;width:34px!important;min-height:34px!important;margin:0!important;background:#111118!important;color:#ddd!important;border:1px solid #32323c!important;font-size:20px!important}.lf-profile-head{display:flex;align-items:flex-start;gap:16px;padding-bottom:18px;border-bottom:1px solid #25252f}.lf-profile-avatar{width:76px;height:76px;min-width:76px;border-radius:50%;object-fit:cover;display:inline-flex;align-items:center;justify-content:center;background:#1a1016;border:1px solid #633044;color:#c6a85c;font-size:24px;font-weight:800}.lf-eyebrow{color:#c6a85c;font-size:8px;letter-spacing:2px}.lf-profile-head h2{margin:5px 0;color:#fff;font-size:22px}.lf-bio{margin:7px 0;color:#bcaeb8;line-height:1.45;overflow-wrap:anywhere}.lf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}.lf-stats article{padding:12px;background:#111117;border:1px solid #272731}.lf-stats small,.lf-section>small{color:#686873;font-size:8px;letter-spacing:1px}.lf-stats b{display:block;margin-top:5px;color:#fff;font-size:20px}.lf-section{margin-top:20px;padding-top:18px;border-top:1px solid #25252f}.lf-game{display:flex;justify-content:space-between;gap:18px;padding:12px 0;border-bottom:1px solid #20202a}.lf-game>div{min-width:0}.lf-game strong{display:block;color:#fff}.lf-game span{display:block;margin-top:4px;color:#777783;font-size:9px;line-height:1.4}.lf-result{display:block;text-align:right;font-size:9px}.lf-result.win{color:#76b87a}.lf-result.loss{color:#c86b75}.lf-result.draw{color:#b5b5bc}@media(max-width:700px){.lf-table .lf-row{grid-template-columns:30px minmax(0,1fr) auto!important;gap:8px!important}.lf-row>.lf-faction,.lf-row>em{display:none!important}.lf-stats{grid-template-columns:repeat(2,1fr)}.lf-game{display:block}.lf-game>div+div{margin-top:7px}.lf-result{text-align:left}}`;
  document.head.appendChild(style);

  function schedule(){clearTimeout(window.__lfTimer);window.__lfTimer=setTimeout(()=>{if(isLeaderboard())render()},120)}
  document.addEventListener('click',e=>{const nav=e.target.closest('[data-view="leaderboard"]');if(nav)setTimeout(render,400);const row=e.target.closest('.lf-row');if(row){e.preventDefault();openDossier(row.dataset.lfUser)}});
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(render,900);
})();
