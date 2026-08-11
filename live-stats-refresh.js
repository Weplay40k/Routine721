(()=>{
  const previousRenderView=window.renderView;
  if(typeof previousRenderView!=='function') return;
  async function refreshLoggedInPlayer(){
    if(!window.S?.user||!window.db) return;
    const {data,error}=await window.db.from('players').select('*').eq('user_id',window.S.user.id).maybeSingle();
    if(!error&&data) window.S.player=data;
  }
  window.renderView=async function(){
    await refreshLoggedInPlayer();
    return previousRenderView();
  };
})();
