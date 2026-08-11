(()=>{
const renderLeaderboard=async(c)=>{
  const {data:players,error}=await db.from('players').select('*').order('wins',{ascending:false}).order('games_played',{ascending:false}).order('display_name');
  if(error) throw error;
  const {data:profiles}=await db.from('profiles').select('id,avatar_url,bio');
  const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
  c.innerHTML=`<section class="panel"><div class="panel-head"><h3>CHAMPIONS OF THE WAR</h3><span class="field-help">SELECT A PLAYER TO VIEW DOSSIER</span></div><div class="table leaderboard-table">${(players||[]).map((p,i)=>{const pr=profileMap.get(p.user_id);return `<button type="button" class="rank-row leaderboard-player-select" data-user-id="${esc(p.user_id)}"><b>#${i+1}</b><span class="leaderboard-player-identity">${avatar({display_name:p.display_name,avatar_url:pr?.avatar_url})}<span class="leaderboard-player-copy"><strong>${esc(p.display_name)}</strong>${pr?.bio?`<small>${esc(pr.bio)}</small>`:''}</span></span><span>${esc(p.primary_faction||'Unassigned')}</span><strong>${p.wins||0}W / ${p.losses||0}L / ${p.draws||0}D</strong><em>${rate(p)}%</em></button>`}).join('')||'<div class="empty">No ranked players yet.</div>'}</div></section>`;
  c.querySelectorAll('.leaderboard-player-select').forEach(b=>b.onclick=()=>openLeaderboardDossier(b.dataset.userId));
};
const openLeaderboardDossier=async(userId)=>{
  const {data:p,error}=await db.from('players').select('*').eq('user_id',userId).single();
  if(error)return notice(error.message,'error');
  const {data:pr}=await db.from('profiles').select('*').eq('id',userId).maybeSingle();
  const {data:pf}=await db.from('player_factions').select('faction').eq('player_id',p.id);
  const {data:games,error:gamesError}=await db.from('games').select('*').or(`owner_user_id.eq.${userId},opponent_user_id.eq.${userId}`).order('played_at',{ascending:false}).limit(25);
  if(gamesError)return notice(gamesError.message,'error');
  const ids=[...new Set((games||[]).flatMap(g=>[g.owner_user_id,g.opponent_user_id]).filter(Boolean))];
  const {data:allPlayers}=ids.length?await db.from('players').select('user_id,display_name').in('user_id',ids):{data:[]};
  const names=new Map((allPlayers||[]).map(x=>[x.user_id,x.display_name]));
  const winnerName=(g)=>{
    if((g.result||'').toLowerCase()==='draw')return 'DRAW';
    const owner=names.get(g.owner_user_id)||g.owner_user_id===userId?p.display_name:(g.opponent_name||'Unknown');
    const opponent=names.get(g.opponent_user_id)||g.opponent_name||'Unknown';
    const ownerWon=(g.result||'').toLowerCase()==='win';
    return ownerWon?owner:opponent;
  };
  const battleRows=(games||[]).map(g=>{
    const owner=names.get(g.owner_user_id)||((g.owner_user_id===userId)?p.display_name:'Unknown');
    const opponent=names.get(g.opponent_user_id)||g.opponent_name||'Unknown';
    const viewerIsOwner=g.owner_user_id===userId;
    const viewerResult=(g.result||'').toLowerCase();
    const resultForPlayer=viewerIsOwner?viewerResult:(viewerResult==='win'?'loss':viewerResult==='loss'?'win':'draw');
    const playerVp=viewerIsOwner?g.player_score:g.opponent_score;
    const opponentVp=viewerIsOwner?g.opponent_score:g.player_score;
    return `<div class="game-row"><div><strong>${esc(owner)} VS ${esc(opponent)}</strong><span>${esc(g.player_faction||'Unknown')} vs ${esc(g.opponent_faction||'Unknown')} · ${date(g.played_at)}</span></div><div><b class="result ${esc(resultForPlayer)}">${esc(resultForPlayer.toUpperCase())}</b><span>WINNER: ${esc(winnerName(g))} · ${playerVp??'—'}–${opponentVp??'—'} VP</span></div></div>`;
  }).join('');
  openModal(`<div class="panel-head"><h3>PLAYER DOSSIER</h3><button class="secondary" id="closeLeaderboardDossier">CLOSE</button></div><div class="public-profile"><div class="public-profile-head">${avatar({display_name:p.display_name,avatar_url:pr?.avatar_url},'profile-avatar')}<div><div class="eyebrow">IMPERIAL PERSONNEL</div><h2>${esc(p.display_name)}</h2><p>${esc(p.primary_faction||'Faction unassigned')}</p>${pr?.bio?`<div class="dossier-bio">${esc(pr.bio)}</div>`:''}</div></div><div class="stats"><article><small>WINS</small><b>${p.wins||0}</b></article><article><small>LOSSES</small><b>${p.losses||0}</b></article><article><small>DRAWS</small><b>${p.draws||0}</b></article><article class="rate"><small>WIN RATE</small><b>${rate(p)}%</b></article></div><div class="public-factions"><small>FACTION ROSTER</small><div>${(pf||[]).map(x=>`<span class="faction-chip">${esc(x.faction)}</span>`).join('')||'<span>None recorded</span>'}</div></div><div class="public-battles"><small>RECENT ENGAGEMENTS</small>${battleRows||'<div class="empty">No battle reports.</div>'}</div></div>`);
  const close=$('#closeLeaderboardDossier');if(close)close.onclick=closeModal;
};
window.openLeaderboardDossier=openLeaderboardDossier;
window.leaderboard=async(c)=>{try{await renderLeaderboard(c)}catch(e){console.error(e);throw e}};
const css=document.createElement('style');css.textContent=`.leaderboard-player-identity{display:flex;align-items:center;gap:10px;min-width:0}.leaderboard-player-copy{display:flex;flex-direction:column;min-width:0;text-align:left}.leaderboard-player-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.leaderboard-player-copy small{margin-top:2px;color:#bcaeb8;font-size:11px;line-height:1.25;white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.dossier-bio{margin-top:6px;color:#bcaeb8;line-height:1.35;overflow-wrap:anywhere;max-width:560px}.leaderboard-table .rank-row{min-width:0}.leaderboard-table .rank-row>*{min-width:0}@media(max-width:700px){.leaderboard-table .rank-row{min-width:700px}.leaderboard-player-copy small{font-size:10px}}`;
document.head.appendChild(css);
})();
