(()=>{
  const KEY='routine721_agenda_v1';
  const escA=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
  const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString(undefined,{weekday:'short',day:'2-digit',month:'short',year:'numeric'}):'—';
  const addNav=()=>{
    const side=document.querySelector('.sidebar');
    if(!side||side.querySelector('[data-agenda-view]'))return;
    const b=document.createElement('button');
    b.className='nav-button';b.dataset.agendaView='agenda';b.innerHTML='<i>◷</i>AGENDA';
    b.onclick=()=>{S.view='agenda';renderView()};
    side.appendChild(b);
  };
  const agenda=async c=>{
    let events=load().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''));
    c.innerHTML=`<section class="panel agenda-panel"><div class="panel-head"><h3>COMMAND AGENDA</h3><button class="primary" id="agendaAdd">+ ADD EVENT</button></div><div id="agendaFormWrap"></div><div id="agendaList">${events.length?events.map(e=>`<article class="agenda-event" data-id="${escA(e.id)}"><div><strong>${escA(e.title)}</strong><span>${fmt(e.date)}${e.time?' · '+escA(e.time):''}${e.location?' · '+escA(e.location):''}</span>${e.notes?`<p>${escA(e.notes)}</p>`:''}</div><div><button class="secondary" data-edit="${escA(e.id)}">EDIT</button> <button class="secondary" data-delete="${escA(e.id)}">DELETE</button></div></article>`).join(''):'<div class="empty">No events scheduled. Add the first command.</div>'}</div></section>`;
    const form=(e={})=>{const wrap=$('#agendaFormWrap');wrap.innerHTML=`<div class="panel" style="margin:14px 0"><div class="panel-head"><h3>${e.id?'EDIT EVENT':'NEW EVENT'}</h3><button class="secondary" id="agendaCancel">CANCEL</button></div><form id="agendaForm" class="form-grid"><label>EVENT<input id="agendaTitle" maxlength="100" value="${escA(e.title)}" required></label><label>DATE<input id="agendaDate" type="date" value="${escA(e.date||'')}" required></label><label>TIME<input id="agendaTime" type="time" value="${escA(e.time||'')}"></label><label>LOCATION<input id="agendaLocation" maxlength="100" value="${escA(e.location||'')}"></label><label class="wide">NOTES<textarea id="agendaNotes" maxlength="1000">${escA(e.notes||'')}</textarea></label><div class="wide"><button class="primary">${e.id?'SAVE EVENT':'ADD EVENT'}</button></div></form></div>`;$('#agendaCancel').onclick=()=>agenda(c);$('#agendaForm').onsubmit=ev=>{ev.preventDefault();const all=load(),row={id:e.id||crypto.randomUUID(),title:$('#agendaTitle').value.trim(),date:$('#agendaDate').value,time:$('#agendaTime').value,location:$('#agendaLocation').value.trim(),notes:$('#agendaNotes').value.trim()};const next=e.id?all.map(x=>x.id===e.id?row:x):[...all,row];save(next);agenda(c)};};
    $('#agendaAdd').onclick=()=>form();
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const e=load().find(x=>x.id===b.dataset.edit);if(e)form(e)});
    document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{save(load().filter(x=>x.id!==b.dataset.delete));agenda(c)});
  };
  const install=()=>{
    if(typeof renderShell!=='function'||typeof renderView!=='function'||typeof S==='undefined')return setTimeout(install,50);
    const originalShell=renderShell,originalView=renderView;
    window.renderShell=function(){originalShell();addNav()};
    window.renderView=async function(){if(S.view==='agenda'){document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));document.querySelectorAll('[data-agenda-view]').forEach(b=>b.classList.add('active'));$('#pageTitle').textContent='AGENDA';$('#page').innerHTML='<div class="empty">LOADING AGENDA…</div>';await agenda($('#page'));return}return originalView()};
    addNav();
  };
  install();
})();
