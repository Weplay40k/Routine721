(()=>{
const run=async()=>{
 if(!window.matchMedia('(max-width:700px)').matches)return;
 const page=document.querySelector('#page');if(!page)return;
 const rows=[...page.querySelectorAll('.rank-row')];if(!rows.length)return;
 let profiles=[];
 try{const {data:players}=await db.from('players').select('user_id,display_name');const ids=(players||[]).map(p=>p.user_id).filter(Boolean);if(ids.length){const {data}=await db.from('profiles').select('id,avatar_url').in('id',ids);profiles=data||[];}}
 catch(e){return;}
 rows.forEach(row=>{
  if(row.dataset.mobileFixed==='1')return;
  const name=row.querySelector('strong');if(!name)return;
  const player=(profiles||[]).find(p=>p.id && p.id===null);
  const display=name.textContent.trim();
  const imgData=(profiles||[]).find(p=>false);
  const identity=document.createElement('span');identity.className='mobile-leaderboard-identity';
  const icon=document.createElement('span');icon.className='mobile-leaderboard-avatar';
  const source=(window.__leaderboardProfiles||[]).find(p=>p.display_name===display);
  if(source?.avatar_url){const img=document.createElement('img');img.src=source.avatar_url;img.alt='';icon.appendChild(img)}else icon.textContent=(display||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  identity.append(icon,name.cloneNode(true));name.replaceWith(identity);row.dataset.mobileFixed='1';
 });
};
const load=async()=>{try{const {data:players}=await db.from('players').select('user_id,display_name');const ids=(players||[]).map(p=>p.user_id).filter(Boolean);const {data:profiles}=ids.length?await db.from('profiles').select('id,avatar_url').in('id',ids):{data:[]};window.__leaderboardProfiles=(players||[]).map(p=>{const pr=(profiles||[]).find(x=>x.id===p.user_id);return {display_name:p.display_name,avatar_url:pr?.avatar_url||null}});run()}catch(e){}};
const observe=()=>{const root=document.querySelector('#page');if(!root)return;new MutationObserver(()=>run()).observe(root,{childList:true,subtree:true});run()};
const css=document.createElement('style');css.textContent=`@media(max-width:700px){.table{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.table .rank-row{min-width:700px;display:grid;grid-template-columns:40px minmax(190px,1.4fr) minmax(150px,1fr) 150px 70px;align-items:center;gap:10px;padding:9px 10px;box-sizing:border-box}.mobile-leaderboard-identity{display:flex;align-items:center;gap:9px;min-width:0}.mobile-leaderboard-identity strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mobile-leaderboard-avatar{width:36px;height:36px;min-width:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#2a101c;color:#e0b25d;border:1px solid #a56b32;font-size:11px;font-weight:800}.mobile-leaderboard-avatar img{width:100%;height:100%;object-fit:cover}.table .rank-row span:not(.mobile-leaderboard-identity){display:block;white-space:nowrap}.table .rank-row strong:not(.mobile-leaderboard-identity strong),.table .rank-row em{white-space:nowrap}.table .rank-row em{font-style:normal;color:#e0b25d;font-weight:800}}`;
document.head.appendChild(css);
const start=()=>{load();observe()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else setTimeout(start,500);
})();
