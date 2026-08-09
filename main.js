
import { createClient } from '@supabase/supabase-js'
import './style.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '')

let state = { user:null, profile:null, group:null, members:[], games:[], view:'dashboard' }

const $ = s => document.querySelector(s)
const esc = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
const initials = s => String(s||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()
const pct = n => `${Number(n||0).toFixed(1)}%`
const stats = games => {
  const w=games.filter(g=>g.result==='Win').length,l=games.filter(g=>g.result==='Loss').length,d=games.filter(g=>g.result==='Draw').length,n=games.length
  return {w,l,d,n,rate:n?(w+d*.5)/n*100:0}
}
function notice(msg){const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000)}
function appShell(){
  document.body.innerHTML=`<div class="app-shell">
  <header class="topbar"><div class="topbar-inner">
    <div class="brand">40K <b>WAR ROOM</b><small>GROUP BATTLE COMMAND</small></div>
    <nav class="nav">
      <button data-view="dashboard" class="active">Dashboard</button><button data-view="games">Battle Log</button><button data-view="players">Players</button><button data-view="factions">Factions</button><button data-view="group">Warband</button>
    </nav>
    <div class="userbar"><div class="avatar" id="userAvatar">?</div><button class="ghost" id="signOut">Sign out</button></div>
  </div></header>
  <main>
    <section id="dashboard" class="view active"></section><section id="games" class="view"></section><section id="players" class="view"></section><section id="factions" class="view"></section><section id="group" class="view"></section>
  </main><div id="modal" class="modal"></div><div id="toast"></div></div>`
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view))
  $('#signOut').onclick=()=>supabase.auth.signOut()
}
function switchView(v){state.view=v;document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));render()}
function render(){if(!state.group)return renderGroupSetup();renderDashboard();renderGames();renderPlayers();renderFactions();renderGroup();$('#userAvatar').textContent=initials(state.profile?.display_name||state.user?.email)}
async function refresh(){
  const {data:{user}}=await supabase.auth.getUser();state.user=user
  if(!user){renderAuth();return}
  const {data:profile}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();state.profile=profile
  const {data:membership}=await supabase.from('group_members').select('group_id,role,groups(id,name,invite_code)').eq('user_id',user.id).maybeSingle()
  if(!membership){appShell();state.group=null;renderGroupSetup();return}
  state.group=membership.groups;state.group.role=membership.role
  const {data:members}=await supabase.from('group_members').select('user_id,role,profiles(id,display_name,avatar_url)').eq('group_id',state.group.id)
  state.members=members||[]
  const {data:games,error}=await supabase.from('games').select('*').eq('group_id',state.group.id).order('played_at',{ascending:false})
  if(error) console.error(error);state.games=games||[]
  appShell();render()
}
function renderAuth(){
 document.body.innerHTML=`<div class="auth"><div class="auth-box">
 <div class="auth-banner"><div class="kicker">11th Edition · Campaign Command</div><div class="auth-title">40K WAR ROOM</div><div class="muted">Shared battle records for your gaming group.</div></div>
 <div class="auth-body"><div class="auth-tabs"><button id="tabLogin" class="active">Sign in</button><button id="tabSignup">Create account</button></div>
 <form id="authForm" class="form-grid"><label class="full">Email<input id="email" type="email" required></label><label class="full">Password<input id="password" type="password" minlength="6" required></label><label id="displayWrap" class="full hidden">Display name<input id="displayName"></label><div class="form-actions full"><button class="btn primary" type="submit" id="authSubmit">Enter War Room</button></div></form>
 <p id="authMsg" class="small muted"></p><div class="notice">Your group's records are protected by Supabase Auth and database Row Level Security. Each user only gets access to groups they belong to.</div>
 </div></div></div>`
 let mode='login';const setMode=m=>{mode=m;$('#tabLogin').classList.toggle('active',m==='login');$('#tabSignup').classList.toggle('active',m==='signup');$('#displayWrap').classList.toggle('hidden',m!=='signup');$('#authSubmit').textContent=m==='login'?'Enter War Room':'Create account'}
 $('#tabLogin').onclick=()=>setMode('login');$('#tabSignup').onclick=()=>setMode('signup')
 $('#authForm').onsubmit=async e=>{e.preventDefault();$('#authMsg').textContent='Processing...';const email=$('#email').value.trim(),password=$('#password').value;let r
 if(mode==='login')r=await supabase.auth.signInWithPassword({email,password})
 else r=await supabase.auth.signUp({email,password,options:{data:{display_name:$('#displayName').value.trim()}}})
 $('#authMsg').textContent=r.error?r.error.message:(mode==='signup'?'Account created. Check your email if confirmation is enabled.':'Signed in.')
 if(!r.error&&mode==='login')refresh()
 }
}
function renderGroupSetup(){
 document.body.innerHTML=`<div class="auth"><div class="auth-box"><div class="auth-banner"><div class="kicker">Warband Deployment</div><div class="auth-title">Choose Your Group</div><div class="muted">Create a new gaming group or join one using its invite code.</div></div><div class="auth-body">
 <form id="groupForm" class="form-grid"><label class="full">Group name<input id="groupName" placeholder="The Emperor's Chosen" required></label><div class="form-actions full"><button class="btn primary" id="createGroup">Create group</button></div></form>
 <div style="height:14px"></div><form id="joinForm" class="form-grid"><label class="full">Invite code<input id="inviteCode" placeholder="AB12CD" required maxlength="8"></label><div class="form-actions full"><button class="btn" id="joinGroup">Join group</button></div></form>
 <p class="small muted">Create a group if you're the organizer. Once created, share the invite code with your players.</p></div></div></div>`
 $('#groupForm').onsubmit=async e=>{e.preventDefault();const name=$('#groupName').value.trim();const {data,error}=await supabase.rpc('create_group',{p_name:name});if(error){alert(error.message);return}await refresh()}
 $('#joinForm').onsubmit=async e=>{e.preventDefault();const code=$('#inviteCode').value.trim().toUpperCase();const {error}=await supabase.rpc('join_group',{p_invite_code:code});if(error){alert(error.message);return}await refresh()}
}
function renderDashboard(){
 const s=stats(state.games), recent=state.games.slice(0,7)
 $('#dashboard').innerHTML=`<div class="hero"><div><div class="kicker">11th Edition · ${esc(state.group.name)}</div><h1>War Room Command</h1><p>The battlefield ledger for your gaming group.</p></div><button class="btn primary" id="dashAdd">＋ Record battle</button></div>
 <div class="grid"><div class="card stat-card"><div class="label">Group win rate</div><div class="stat green">${pct(s.rate)}</div></div><div class="card stat-card"><div class="label">Battles logged</div><div class="stat">${s.n}</div></div><div class="card stat-card"><div class="label">Victories</div><div class="stat green">${s.w}</div></div><div class="card stat-card"><div class="label">Losses / draws</div><div class="stat"><span class="red">${s.l}</span> / <span class="gold">${s.d}</span></div></div></div>
 <div class="two"><div class="card"><h2 class="section-title">Recent engagements</h2>${recentTable(recent)}</div><div class="card"><h2 class="section-title">Command overview</h2>${leaderboardHTML()}</div></div>
 <div class="card" style="margin-top:13px"><h2 class="section-title">Win-rate progression</h2>${trendHTML()}</div>`
 $('#dashAdd').onclick=()=>{switchView('games');setTimeout(()=>$('#gameForm')?.scrollIntoView({behavior:'smooth'}),50)}
}
function recentTable(gs){if(!gs.length)return '<div class="empty">No battles logged yet.</div>';return `<table><tr><th>Date</th><th>Player</th><th>Matchup</th><th>Result</th></tr>${gs.map(g=>`<tr><td>${esc(g.played_at)}</td><td>${esc(nameFor(g.player_id))}</td><td>${esc(g.player_faction)} <span class="muted">vs</span> ${esc(g.opponent_faction)}</td><td>${pill(g.result)}</td></tr>`).join('')}</table>`}
function leaderboardHTML(){let a=state.members.map(m=>({m,s:stats(state.games.filter(g=>g.player_id===m.user_id))})).sort((x,y)=>y.s.rate-x.s.rate);if(!a.length)return '<div class="empty">No players yet.</div>';return a.slice(0,8).map((x,i)=>`<div class="barline"><span>${i+1}. ${esc(x.m.profiles?.display_name||'Player')}</span><div class="bartrack"><div class="barfill" style="width:${x.s.rate}%"></div></div><b>${pct(x.s.rate)}</b></div>`).join('')}
function trendHTML(){if(!state.games.length)return '<div class="empty">Log battles to see the trend.</div>';let gs=[...state.games].sort((a,b)=>a.played_at.localeCompare(b.played_at));let w=0,n=0;return `<div style="display:flex;align-items:end;height:190px;gap:5px">${gs.slice(-30).map(g=>{n++;if(g.result==='Win')w++;else if(g.result==='Draw')w+=.5;let h=w/n*100;return `<div title="${g.played_at} · ${h.toFixed(1)}%" style="flex:1;min-width:4px;height:${Math.max(8,h)}%;background:linear-gradient(#d85a43,#772319);border-radius:4px 4px 0 0"></div>`}).join('')}</div><div class="small muted" style="margin-top:8px">Each bar represents a recorded battle; height shows cumulative win rate.</div>`}
function renderGames(){
 const options=state.members.map(m=>`<option value="${m.user_id}">${esc(m.profiles?.display_name||'Player')}</option>`).join('')
 $('#games').innerHTML=`<div class="hero"><div><div class="kicker">Battle Log</div><h1>Record the battle</h1><p>Every victory, defeat and hard-fought draw.</p></div></div>
 <div class="card" id="gameForm"><form class="form-grid"><label>Date<input id="gDate" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Player<select id="gPlayer" required>${options}</select></label><label>Your faction<input id="gFaction" required placeholder="Space Marines"></label><label>Opponent<input id="gOpponent" placeholder="Opponent name"></label><label>Opponent faction<input id="gOppFaction" required placeholder="Orks"></label><label>Result<select id="gResult"><option>Win</option><option>Loss</option><option>Draw</option></select></label><label>Your VP<input id="gVP" type="number" min="0"></label><label>Opponent VP<input id="gOppVP" type="number" min="0"></label><label>Mission<input id="gMission" placeholder="Take and Hold"></label><label>Event / league<input id="gEvent" placeholder="Club Night"></label><label class="full">Notes<textarea id="gNotes" placeholder="Optional battle notes"></textarea></label><div class="form-actions full"><button class="btn primary" id="saveGame">Record engagement</button></div></form></div>
 <div class="card" style="margin-top:13px"><div class="toolbar"><h2 class="section-title" style="margin-right:auto">Game history</h2><select id="gameFilter"><option value="">All players</option>${options}</select></div><div id="gameHistory">${gameHistoryHTML()}</div></div>`
 $('#saveGame').onclick=saveGame;$('#gameFilter').onchange=()=>$('#gameHistory').innerHTML=gameHistoryHTML($('#gameFilter').value)
}
function gameHistoryHTML(filter=''){let gs=state.games.filter(g=>!filter||g.player_id===filter);if(!gs.length)return '<div class="empty">No battles match this filter.</div>';return `<table><tr><th>Date</th><th>Player</th><th>Matchup</th><th>Result</th><th>VP</th><th></th></tr>${gs.map(g=>`<tr><td>${esc(g.played_at)}</td><td>${esc(nameFor(g.player_id))}</td><td><b>${esc(g.player_faction)}</b><br><span class="small muted">vs ${esc(g.opponent_name||'Opponent')} · ${esc(g.opponent_faction)}</span></td><td>${pill(g.result)}</td><td>${g.player_vp??'—'}–${g.opponent_vp??'—'}</td><td><button class="btn danger" onclick="deleteGame('${g.id}')">Delete</button></td></tr>`).join('')}</table>`}
async function saveGame(e){e.preventDefault();const g={group_id:state.group.id,played_at:$('#gDate').value,player_id:$('#gPlayer').value,player_faction:$('#gFaction').value.trim(),opponent_name:$('#gOpponent').value.trim(),opponent_faction:$('#gOppFaction').value.trim(),result:$('#gResult').value,player_vp:$('#gVP').value?Number($('#gVP').value):null,opponent_vp:$('#gOppVP').value?Number($('#gOppVP').value):null,mission:$('#gMission').value.trim(),event_name:$('#gEvent').value.trim(),notes:$('#gNotes').value.trim()};const {error}=await supabase.from('games').insert(g);if(error){alert(error.message);return}await refresh();switchView('games');notice('Battle recorded.')}
window.deleteGame=async id=>{if(!confirm('Delete this battle record?'))return;const {error}=await supabase.from('games').delete().eq('id',id);if(error)alert(error.message);else refresh()}
function renderPlayers(){
 $('#players').innerHTML=`<div class="hero"><div><div class="kicker">Roster & profiles</div><h1>Players</h1><p>Performance records for everyone in the warband.</p></div></div><div class="grid">${state.members.map(m=>playerCard(m)).join('')}</div>`
 document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>openProfile(b.dataset.player))
}
function playerCard(m){let gs=state.games.filter(g=>g.player_id===m.user_id),s=stats(gs);return `<div class="card"><div class="profile"><div class="big-avatar">${initials(m.profiles?.display_name)}</div><div><h2>${esc(m.profiles?.display_name||'Player')}</h2><div class="muted small">${m.role==='owner'?'Group commander':'Battle-brother'}</div></div></div><div class="metric-row"><div class="metric"><span class="label">Win rate</span><strong class="green">${pct(s.rate)}</strong></div><div class="metric"><span class="label">Games</span><strong>${s.n}</strong></div><div class="metric"><span class="label">Wins</span><strong>${s.w}</strong></div><div class="metric"><span class="label">W/L/D</span><strong>${s.w}/${s.l}/${s.d}</strong></div></div><button class="btn" style="width:100%;margin-top:12px" data-player="${m.user_id}">Open profile</button></div>`}
function openProfile(id){const m=state.members.find(x=>x.user_id===id),gs=state.games.filter(g=>g.player_id===id),s=stats(gs);let opp={};gs.forEach(g=>{let k=g.opponent_faction;opp[k]??={n:0,w:0,l:0,d:0};opp[k].n++;opp[k][g.result.toLowerCase()[0]]++});const match=Object.entries(opp).sort((a,b)=>(b[1].w+b[1].d*.5)/b[1].n-(a[1].w+a[1].d*.5)/a[1].n);$('#modal').innerHTML=`<div class="modal-card"><div class="profile"><div class="big-avatar">${initials(m.profiles?.display_name)}</div><div><div class="kicker">Player dossier</div><h2>${esc(m.profiles?.display_name||'Player')}</h2><div class="muted">${esc(state.group.name)}</div></div><button class="btn" style="margin-left:auto" onclick="closeModal()">Close</button></div><div class="metric-row"><div class="metric"><span class="label">Win rate</span><strong class="green">${pct(s.rate)}</strong></div><div class="metric"><span class="label">Games</span><strong>${s.n}</strong></div><div class="metric"><span class="label">Wins</span><strong>${s.w}</strong></div><div class="metric"><span class="label">Record</span><strong>${s.w}-${s.l}-${s.d}</strong></div></div><h3 class="section-title" style="margin-top:22px">Opponent faction record</h3>${match.length?match.map(([k,v])=>`<div class="barline"><span>${esc(k)}</span><div class="bartrack"><div class="barfill" style="width:${(v.w+v.d*.5)/v.n*100}%"></div></div><b>${pct((v.w+v.d*.5)/v.n*100)}</b></div>`).join(''):'<div class="empty">No matchup data yet.</div>'}</div>`;$('#modal').classList.add('open')}
window.closeModal=()=>$('#modal').classList.remove('open')
function renderFactions(){
 let map={};state.games.forEach(g=>{let f=g.player_faction;map[f]??={n:0,w:0,l:0,d:0};map[f].n++;map[f][g.result.toLowerCase()[0]]++})
 let cards=Object.entries(map).sort((a,b)=>((b[1].w+b[1].d*.5)/b[1].n)-((a[1].w+a[1].d*.5)/a[1].n))
 let factions=[...new Set(state.games.flatMap(g=>[g.player_faction,g.opponent_faction]))].sort()
 let heat=factions.map(f=>`<tr><td><b>${esc(f)}</b></td>${factions.map(o=>{let gs=state.games.filter(g=>g.player_faction===f&&g.opponent_faction===o),s=stats(gs);let bg=s.n?`background:rgba(182,56,44,${.12+.55*s.rate/100})`:'';return `<td><div class="heat-cell" style="${bg}">${s.n?pct(s.rate):'—'}</div><div class="small muted">${s.n}G</div></td>`}).join('')}</tr>`).join('')
 $('#factions').innerHTML=`<div class="hero"><div><div class="kicker">Faction intelligence</div><h1>Matchups</h1><p>See how each faction is performing against the armies in your group.</p></div></div><div class="grid">${cards.map(([f,s])=>`<div class="card stat-card"><div class="label">${esc(f)}</div><div class="stat">${pct((s.w+s.d*.5)/s.n*100)}</div><div class="muted small">${s.n} games · ${s.w}W ${s.l}L ${s.d}D</div></div>`).join('')}</div><div class="card" style="margin-top:13px"><h2 class="section-title">Faction matchup matrix</h2><div class="heat"><table><tr><th>Your faction ↓ / Opponent →</th>${factions.map(f=>`<th>${esc(f)}</th>`).join('')}</tr>${heat||'<tr><td colspan="99" class="empty">Log games to build the matrix.</td></tr>'}</table></div><div class="small muted" style="margin-top:10px">Cells show the player's win rate when using the row faction against the column faction.</div></div>`
}
function renderGroup(){
 $('#group').innerHTML=`<div class="hero"><div><div class="kicker">Warband command</div><h1>${esc(state.group.name)}</h1><p>Manage membership and share your invite code.</p></div></div><div class="two"><div class="card"><h2 class="section-title">Invite code</h2><div style="font-family:Cinzel;font-size:38px;letter-spacing:.18em;color:var(--gold)">${esc(state.group.invite_code)}</div><p class="muted small">Share this code with your group. Players must have an account first.</p></div><div class="card"><h2 class="section-title">Members</h2>${state.members.map(m=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #292c32"><div class="avatar">${initials(m.profiles?.display_name)}</div><div style="flex:1"><b>${esc(m.profiles?.display_name||'Player')}</b><div class="small muted">${m.role}</div></div></div>`).join('')}</div></div>`
}
function nameFor(id){return state.members.find(m=>m.user_id===id)?.profiles?.display_name||'Player'}
function pill(r){return `<span class="pill ${r==='Win'?'win':r==='Loss'?'loss':'draw'}">${r}</span>`}
supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0))
refresh()
