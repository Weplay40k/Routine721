(() => {
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'tournament-lives.css?v=1'; document.head.appendChild(style);
  const URL = 'https://jbgwdxavydhtvoqpbfmj.supabase.co';
  const KEY = 'sb_publishable_Wt8h6fNelT6zrzf-Dm8FXw_cdSGylaz';
  const db = window.supabase.createClient(URL, KEY);
  let session = null;
  let activeTournament = null;
  let busy = false;
  const $ = (s, root=document) => root.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const errText = e => esc(e && e.message ? e.message : e);
  const isOwner = t => !!session && t.created_by === session.user.id;
  const notify = msg => { const n = $('#notice'); if (n) { n.textContent = msg; n.className = 'notice error'; } };
  const date = d => d ? new Date(d).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}) : '—';

  async function getSession() {
    const r = await db.auth.getSession();
    if (r.error) throw r.error;
    session = r.data.session;
    if (!session) throw new Error('Log eerst in om toernooien te gebruiken.');
    return session;
  }
  function shell(title) {
    const h = $('#pageTitle'), p = $('#page');
    if (!h || !p) return null;
    h.textContent = title;
    p.innerHTML = '<div class="empty">TOERNOOIGEGEVENS LADEN…</div>';
    return p;
  }
  function addNav() {
    const sidebar = $('.sidebar');
    if (!sidebar || $('#tournamentNav')) return;
    const b = document.createElement('button');
    b.id = 'tournamentNav';
    b.className = 'nav-button';
    b.innerHTML = '<i>🏆</i> TOURNAMENTS';
    b.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openList();
    }, true);
    const matches = Array.from(sidebar.querySelectorAll('[data-view]')).find(x => x.dataset.view === 'matches');
    if (matches && matches.nextSibling) sidebar.insertBefore(b, matches.nextSibling);
    else sidebar.appendChild(b);
  }
  function watchShell() {
    addNav();
    const observer = new MutationObserver(addNav);
    observer.observe(document.body, {childList:true,subtree:true});
  }
  function setNavActive(active) {
    document.querySelectorAll('.sidebar [data-view]').forEach(x => x.classList.remove('active'));
    const b = $('#tournamentNav');
    if (b) b.classList.toggle('active', !!active);
  }
  function pageError(p, e) {
    p.innerHTML = '<section class="panel"><div class="empty"><b>TOURNAMENT ERROR</b><br>' + errText(e) + '</div></section>';
  }
  async function openList() {
    const p = shell('THREE-LIFE TOURNAMENTS');
    if (!p) return;
    setNavActive(true);
    activeTournament = null;
    try {
      await getSession();
      const r = await db.from('tournaments').select('*').order('created_at',{ascending:false});
      if (r.error) throw r.error;
      const rows = r.data || [];
      p.innerHTML = '<section class="hero tournament-hero"><div><div class="eyebrow">WAR ROOM // ELIMINATION CAMPAIGN</div><h2>THREE LIVES. ONE CHAMPION.</h2><p>Iedere speler begint met 3 levens. Elk verlies kost precies 1 leven. Bij 0 levens ben je uitgeschakeld.</p></div><button class="primary" id="newTournament">+ CREATE TOURNAMENT</button></section>' +
        '<section class="panel"><div class="panel-head"><h3>TOURNAMENT ARCHIVE</h3><span class="muted">' + rows.length + ' TOURNAMENT(S)</span></div>' +
        (rows.length ? '<div class="tournament-list">' + rows.map(t => '<button class="tournament-card" data-tournament="' + esc(t.id) + '"><span class="trophy">🏆</span><span class="tournament-card-main"><strong>' + esc(t.name) + '</strong><small>' + esc(t.description || 'Three-life elimination') + '</small></span><span class="tournament-state">' + esc(t.status.toUpperCase()) + '</span><span class="tournament-arrow">›</span></button>').join('') + '</div>' : '<div class="empty">Nog geen toernooien. Maak het eerste toernooi aan.</div>') + '</section>';
      $('#newTournament').onclick = createTournament;
      p.querySelectorAll('[data-tournament]').forEach(b => b.onclick = () => openDetail(b.dataset.tournament));
    } catch (e) { pageError(p,e); }
  }
  function createTournament() {
    const p = $('#page');
    const modal = $('#modal');
    if (!p || !modal) return;
    modal.hidden = false;
    modal.innerHTML = '<div class="modal-card"><div class="panel-head"><h3>CREATE THREE-LIFE TOURNAMENT</h3><button class="secondary" id="cancelTournament">CLOSE</button></div><form id="createTournamentForm" class="form-grid"><label class="wide">TOURNAMENT NAME<input id="tName" maxlength="100" required placeholder="e.g. Winter Crusade"></label><label class="wide">DESCRIPTION<textarea id="tDescription" placeholder="Optional details"></textarea></label><div class="wide"><p class="field-help">Every registered player starts with 3 lives. A defeat removes exactly 1 life; victories do not remove lives. 0 lives means eliminated.</p><button class="primary">CREATE TOURNAMENT</button></div></form></div>';
    $('#cancelTournament').onclick = closeModal;
    $('#createTournamentForm').onsubmit = async e => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      try {
        const r = await db.from('tournaments').insert({name:$('#tName').value.trim(),description:$('#tDescription').value.trim() || null,created_by:session.user.id}).select().single();
        if (r.error) throw r.error;
        closeModal();
        await openDetail(r.data.id);
      } catch (x) { notify(errText(x)); } finally { busy = false; }
    };
  }
  function closeModal() { const m=$('#modal'); if(m){m.hidden=true;m.innerHTML='';} }
  async function openDetail(id) {
    const p = shell('TOURNAMENT COMMAND');
    if (!p) return;
    setNavActive(true);
    activeTournament = id;
    try {
      await getSession();
      const [tr, pr, mr, pl] = await Promise.all([
        db.from('tournaments').select('*').eq('id',id).single(),
        db.from('tournament_players').select('*').eq('tournament_id',id).order('lives',{ascending:false}).order('joined_at'),
        db.from('tournament_matches').select('*').eq('tournament_id',id).order('created_at',{ascending:false}),
        db.from('players').select('user_id,display_name,primary_faction').order('display_name')
      ]);
      if (tr.error) throw tr.error;
      if (pr.error) throw pr.error;
      if (mr.error) throw mr.error;
      if (pl.error) throw pl.error;
      const t=tr.data, participants=pr.data||[], matches=mr.data||[], players=pl.data||[];
      const names = {};
      players.forEach(x => { names[x.user_id]=x.display_name; });
      const registered = new Set(participants.map(x=>x.user_id));
      const active = participants.filter(x=>x.lives>0);
      const pendingUsers = new Set(matches.filter(m=>m.status==='pending').flatMap(m=>[m.player1_user_id,m.player2_user_id]));
      const pairableActive = active.filter(x=>!pendingUsers.has(x.user_id));
      const eliminated = participants.filter(x=>x.lives===0);
      const owner = isOwner(t);
      const champion = active.length===1 && participants.length>1 ? active[0] : null;
      const desiredStatus = champion ? 'completed' : 'active';
      if (owner && t.status !== desiredStatus) { const upd = await db.from('tournaments').update({status:desiredStatus,updated_at:new Date().toISOString()}).eq('id',id); if (upd.error) throw upd.error; }
      p.innerHTML = '<div class="tournament-toolbar"><button class="secondary" id="backTournaments">← ALL TOURNAMENTS</button><span class="tournament-state">' + (owner?'ORGANIZER':'VIEW ONLY') + '</span></div>' +
        '<section class="hero tournament-hero"><div><div class="eyebrow">THREE-LIFE ELIMINATION</div><h2>' + esc(t.name) + '</h2><p>' + esc(t.description || 'Every player starts with three lives. One defeat removes one life.') + '</p></div>' + (owner?'<div class="tournament-match-actions"><button class="secondary" id="manualMatch">+ CREATE MATCH</button><button class="primary" id="pairNext" '+(pairableActive.length<2?'disabled':'')+'>⚔ PAIR NEXT MATCH</button></div>':'') + '</section>' +
        (champion?'<section class="champion-banner"><span>🏆</span><div><small>TOURNAMENT CHAMPION</small><strong>' + esc(names[champion.user_id] || 'Unknown player') + '</strong><small>THE LAST PLAYER WITH LIVES REMAINING</small></div></section>':'') +
        '<section class="stats tournament-stats"><article><small>REGISTERED</small><b>' + participants.length + '</b></article><article><small>ACTIVE</small><b>' + active.length + '</b></article><article><small>ELIMINATED</small><b>' + eliminated.length + '</b></article><article><small>MATCHES</small><b>' + matches.length + '</b></article></section>' +
        '<section class="panel"><div class="panel-head"><h3>PLAYER LIVES</h3>' + (owner?'<button class="secondary" id="addPlayer">+ ADD PLAYERS</button>':'') + '</div>' +
        (participants.length?'<div class="lives-list">' + participants.map(x=>'<div class="lives-row"><div><strong>' + esc(names[x.user_id] || 'Unknown player') + '</strong><small>' + (x.lives===0?'ELIMINATED':x.lives+' '+(x.lives===1?'LIFE':'LIVES')+' LEFT') + '</small></div><div class="life-icons">' + [0,1,2].map(i=>'<span class="'+(i<x.lives?'life-on':'life-off')+'">♥</span>').join('') + '</div></div>').join('') + '</div>' : '<div class="empty">Nog geen spelers toegevoegd.</div>') + '</section>' +
        '<section class="panel"><div class="panel-head"><h3>MATCH REGISTER</h3><span class="muted">' + matches.length + ' MATCH(ES)</span></div>' +
        (matches.length?'<div class="tournament-matches">' + matches.map(m=>matchCard(m,names,owner)).join('') + '</div>':'<div class="empty">Nog geen wedstrijden. Gebruik CREATE MATCH of PAIR NEXT MATCH om een wedstrijd aan te maken.</div>') + '</section>';
      $('#backTournaments').onclick=openList;
      if(owner && $('#addPlayer')) $('#addPlayer').onclick=()=>addPlayers(participants,players);
      if(owner && $('#pairNext')) $('#pairNext').onclick=()=>pairNext(t,participants,matches);
      if(owner && $('#manualMatch')) $('#manualMatch').onclick=()=>createManualMatch(participants,names);
      p.querySelectorAll('[data-match-form]').forEach(form=>form.onsubmit=e=>saveMatch(e,form));
      p.querySelectorAll('[data-delete-match]').forEach(button=>button.onclick=()=>deleteMatch(button.dataset.deleteMatch));
    } catch (e) { pageError(p,e); }
  }
  function matchCard(m,names,owner) {
    const a=names[m.player1_user_id]||'Unknown player', b=names[m.player2_user_id]||'Unknown player';
    const winner=m.winner_user_id?names[m.winner_user_id]:'';
    const loser=m.winner_user_id?(m.winner_user_id===m.player1_user_id?b:a):'';
    return '<article class="tournament-match"><div class="match-meta"><span>'+(m.status==='completed'?'COMPLETED':'AWAITING RESULT')+'</span><small>'+date(m.played_at||m.created_at)+'</small></div><div class="match-versus"><strong>'+esc(a)+'</strong><span>VS</span><strong>'+esc(b)+'</strong></div>' +
      (m.status==='completed'?'<div class="match-result"><span>WINNER: <b>'+esc(winner)+'</b></span><span>−1 LIFE: <b>'+esc(loser)+'</b></span></div>':'') +
      (owner?'<form class="match-result-form" data-match-form="'+esc(m.id)+'"><label>WINNER<select name="winner" required><option value="">Select winner</option><option value="'+esc(m.player1_user_id)+'" '+(m.winner_user_id===m.player1_user_id?'selected':'')+'>'+esc(a)+'</option><option value="'+esc(m.player2_user_id)+'" '+(m.winner_user_id===m.player2_user_id?'selected':'')+'>'+esc(b)+'</select></label><button class="secondary">'+(m.status==='completed'?'CORRECT RESULT':'SAVE RESULT')+'</button><button type="button" class="danger tournament-delete-match" data-delete-match="'+esc(m.id)+'">DELETE MATCH</button></form>':'');
  }
  async function addPlayers(participants,players) {
    const p=$('#page');
    const available=players.filter(x=>!participants.some(y=>y.user_id===x.user_id));
    if(!available.length) { notify('Alle bestaande spelers zijn al toegevoegd.'); return; }
    const m=$('#modal'); m.hidden=false;
    m.innerHTML='<div class="modal-card"><div class="panel-head"><h3>ADD TOURNAMENT PLAYERS</h3><button class="secondary" id="cancelAddPlayers">CLOSE</button></div><form id="addPlayersForm"><label>SELECT PLAYER<select id="newPlayer" required>'+available.map(x=>'<option value="'+esc(x.user_id)+'">'+esc(x.display_name)+' — '+esc(x.primary_faction||'Faction unassigned')+'</option>').join('')+'</select></label><p class="field-help">Each player starts with exactly 3 lives.</p><button class="primary">ADD PLAYER</button></form></div>';
    $('#cancelAddPlayers').onclick=closeModal;
    $('#addPlayersForm').onsubmit=async e=>{
      e.preventDefault();
      const {error}=await db.from('tournament_players').insert({tournament_id:activeTournament,user_id:$('#newPlayer').value,lives:3});
      if(error) return notify(errText(error));
      closeModal(); await openDetail(activeTournament);
    };
  }
  function createManualMatch(participants,names) {
    const active=participants.filter(x=>x.lives>0);
    if(active.length<2) { notify('At least two active tournament players are required.'); return; }
    const options=active.map(x=>'<option value="'+esc(x.user_id)+'">'+esc(names[x.user_id]||'Unknown player')+' ('+x.lives+' lives)</option>').join('');
    const m=$('#modal'); m.hidden=false;
    m.innerHTML='<div class="modal-card"><div class="panel-head"><h3>CREATE MATCH</h3><button type="button" class="secondary" id="cancelManualMatch">CLOSE</button></div><form id="manualMatchForm" class="form-grid"><label>PLAYER 1<select id="manualPlayer1" required>'+options+'</select></label><label>PLAYER 2<select id="manualPlayer2" required>'+options+'</select></label><p class="field-help wide">Choose two different active players. The match will be added as awaiting result.</p><div class="wide"><button class="primary">CREATE MATCH</button></div></form></div>';
    $('#cancelManualMatch').onclick=closeModal;
    $('#manualMatchForm').onsubmit=async e=>{
      e.preventDefault();
      const player1=$('#manualPlayer1').value, player2=$('#manualPlayer2').value;
      if(player1===player2) { notify('Choose two different players.'); return; }
      if(busy) return;
      busy=true;
      try {
        const {error}=await db.from('tournament_matches').insert({tournament_id:activeTournament,player1_user_id:player1,player2_user_id:player2,status:'pending'});
        if(error) throw error;
        closeModal(); await openDetail(activeTournament);
      } catch(error) { notify(errText(error)); } finally { busy=false; }
    };
  }
  async function deleteMatch(id) {
    if(!confirm('Delete this match? If it has a completed result, the lost life will be restored.')) return;
    if(busy) return;
    busy=true;
    try {
      const {error}=await db.from('tournament_matches').delete().eq('id',id).eq('tournament_id',activeTournament);
      if(error) throw error;
      await openDetail(activeTournament);
    } catch(error) { notify(errText(error)); } finally { busy=false; }
  }
  async function pairNext(t,participants,matches) {
    const pendingUsers=new Set(matches.filter(m=>m.status==='pending').flatMap(m=>[m.player1_user_id,m.player2_user_id]));
    const active=participants.filter(x=>x.lives>0 && !pendingUsers.has(x.user_id));
    if(active.length<2) return;
    const used=new Set(matches.map(m=>[m.player1_user_id,m.player2_user_id].sort().join(':')));
    let candidates=[];
    for(let i=0;i<active.length;i++) for(let j=i+1;j<active.length;j++) {
      const key=[active[i].user_id,active[j].user_id].sort().join(':');
      const rematch=used.has(key);
      const score=Math.abs(active[i].lives-active[j].lives)*10+(rematch?1000:0);
      candidates.push({a:active[i],b:active[j],score});
    }
    candidates.sort((x,y)=>x.score-y.score);
    const best=candidates[0];
    if(!best) return;
    const {error}=await db.from('tournament_matches').insert({tournament_id:t.id,player1_user_id:best.a.user_id,player2_user_id:best.b.user_id,status:'pending'});
    if(error) return notify(errText(error));
    await openDetail(t.id);
  }
  async function saveMatch(e,form) {
    e.preventDefault();
    const id=form.getAttribute('data-match-form');
    const winner=$('select[name="winner"]',form).value;
    if(!winner) return;
    const {error}=await db.from('tournament_matches').update({winner_user_id:winner,status:'completed',played_at:new Date().toISOString()}).eq('id',id);
    if(error) return notify(errText(error));
    await openDetail(activeTournament);
  }
  document.addEventListener('DOMContentLoaded',watchShell);
  if(document.readyState!=='loading') watchShell();
  db.auth.onAuthStateChange((_event,s)=>{session=s;});
})();