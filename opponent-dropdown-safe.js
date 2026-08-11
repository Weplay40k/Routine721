(()=>{
  'use strict';
  let installed=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const findOpponent=()=>[...document.querySelectorAll('input,textarea')].find(x=>/opponent/i.test(`${x.name||''} ${x.id||''} ${x.placeholder||''}`));
  const install=()=>{
    if(installed)return;
    const input=findOpponent(); if(!input)return;
    installed=true;
    const wrap=document.createElement('span'); wrap.className='opponent-dd-wrap';
    input.parentNode.insertBefore(wrap,input); wrap.appendChild(input);
    const btn=document.createElement('button'); btn.type='button'; btn.className='opponent-dd-btn'; btn.textContent='▾'; btn.setAttribute('aria-label','Choose registered player'); wrap.appendChild(btn);
    const menu=document.createElement('div'); menu.className='opponent-dd-menu'; menu.hidden=true; wrap.appendChild(menu);
    const hidden=document.createElement('input'); hidden.type='hidden'; hidden.name='opponent_user_id'; wrap.appendChild(hidden);
    const load=async()=>{
      menu.innerHTML='<div class="opponent-dd-empty">Loading players…</div>';
      try{
        if(!window.db?.from)throw new Error('database unavailable');
        const {data,error}=await window.db.from('players').select('user_id,display_name').order('display_name');
        if(error)throw error;
        menu.innerHTML=(data||[]).map(p=>`<button type="button" class="opponent-dd-item" data-id="${esc(p.user_id)}" data-name="${esc(p.display_name)}"><span class="opponent-dd-avatar">◉</span><span>${esc(p.display_name)}</span></button>`).join('')||'<div class="opponent-dd-empty">No registered players</div>';
        menu.querySelectorAll('.opponent-dd-item').forEach(item=>item.addEventListener('click',()=>{input.value=item.dataset.name;hidden.value=item.dataset.id;menu.hidden=true;}));
      }catch(e){menu.innerHTML='<div class="opponent-dd-empty">Could not load players</div>';}
    };
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.hidden=!menu.hidden;if(!menu.hidden)load();});
    input.addEventListener('input',()=>{hidden.value='';});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))menu.hidden=true;},{passive:true});
  };
  document.addEventListener('click',e=>{
    const t=e.target.closest?.('button,a,[role="button"]');
    if(!t)return;
    if(/record battle/i.test(t.textContent||'')||/record/i.test(t.getAttribute('aria-label')||''))setTimeout(install,80);
  },{passive:true});
  window.addEventListener('load',()=>setTimeout(install,200));
  const css=document.createElement('style'); css.textContent='.opponent-dd-wrap{position:relative;display:block;width:100%}.opponent-dd-wrap>input{padding-right:38px!important}.opponent-dd-btn{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;background:transparent;color:#d9a84f;font-size:16px;cursor:pointer;z-index:2}.opponent-dd-menu{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:10000;max-height:260px;overflow:auto;background:#100912;border:1px solid #8d5a2b;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,.55)}.opponent-dd-item{width:100%;display:flex;align-items:center;gap:10px;padding:9px 12px;border:0;background:transparent;color:#f4e8d2;text-align:left;cursor:pointer}.opponent-dd-item:hover{background:#32121f}.opponent-dd-avatar{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid #9a6734}.opponent-dd-empty{padding:12px;color:#b9a9b5;font-size:12px}'; document.head.appendChild(css);
})();