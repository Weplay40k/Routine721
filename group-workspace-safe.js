(()=>{
  'use strict';
  const STYLE_ID='group-workspace-safe-style';
  const OVERLAY_ID='group-workspace-safe-overlay';
  let shown=false;

  function getSupabase(){
    return window.supabase || window._supabase || window.sb || null;
  }

  function removeGate(){
    const el=document.getElementById(OVERLAY_ID);
    if(el) el.remove();
    shown=false;
  }

  function showGate(){
    if(shown || !document.body) return;
    shown=true;
    if(!document.getElementById(STYLE_ID)){
      const style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent='#'+OVERLAY_ID+'{position:fixed;inset:0;z-index:2147483000;background:#090b0f;color:#e8e8e8;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}#'+OVERLAY_ID+' .box{width:min(520px,92vw);padding:28px;border:1px solid #39404b;background:#11151b;border-radius:12px;box-shadow:0 20px 80px #0008}#'+OVERLAY_ID+' h2{margin:0 0 18px}#'+OVERLAY_ID+' input{display:block;width:100%;box-sizing:border-box;margin:8px 0;padding:11px;background:#0b0e13;color:#fff;border:1px solid #46505d;border-radius:6px}#'+OVERLAY_ID+' button{margin:8px 8px 0 0;padding:10px 14px;border:1px solid #596575;border-radius:6px;background:#1b222c;color:#fff;cursor:pointer}#'+OVERLAY_ID+' .err{min-height:22px;color:#ff8d8d;margin-top:12px}';
      document.head.appendChild(style);
    }
    const wrap=document.createElement('div'); wrap.id=OVERLAY_ID;
    wrap.innerHTML='<div class="box"><h2>⚔ Battle Group</h2><p>Create a private group or join one using an invite code.</p><input id="gname" placeholder="Group name"><input id="gpass" type="password" placeholder="Group password"><input id="gcode" placeholder="Invite code (for joining)"><button id="gcreate">Create Group</button><button id="gjoin">Join Group</button><button id="gskip">Continue without group</button><div class="err" id="gerr"></div></div>';
    document.body.appendChild(wrap);
    const err=wrap.querySelector('#gerr');
    const call=async(fn,args)=>{
      const sb=getSupabase();
      if(!sb || !sb.rpc) throw new Error('group_service_unavailable');
      const {data,error}=await sb.rpc(fn,args);
      if(error) throw error;
      return data;
    };
    wrap.querySelector('#gcreate').onclick=async()=>{
      err.textContent='';
      try{await call('create_group_with_password',{p_name:wrap.querySelector('#gname').value,p_password:wrap.querySelector('#gpass').value});removeGate();}
      catch(e){err.textContent=e?.message||'Unable to create group.';}
    };
    wrap.querySelector('#gjoin').onclick=async()=>{
      err.textContent='';
      try{await call('join_group_with_password',{p_invite_code:wrap.querySelector('#gcode').value,p_password:wrap.querySelector('#gpass').value});removeGate();}
      catch(e){err.textContent=e?.message||'Unable to join group.';}
    };
    wrap.querySelector('#gskip').onclick=removeGate;
  }

  async function check(){
    try{
      const sb=getSupabase();
      if(!sb?.auth?.getSession) return;
      const {data}=await sb.auth.getSession();
      if(data?.session?.user) showGate();
    }catch(e){console.warn('[group-workspace-safe]',e)}
  }

  function start(){
    if(!document.body) return;
    check();
    const sb=getSupabase();
    if(sb?.auth?.onAuthStateChange){
      sb.auth.onAuthStateChange((_event,session)=>{if(session?.user) setTimeout(check,0); else removeGate();});
    }
    const observer=new MutationObserver(()=>{if(!shown) check()});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
