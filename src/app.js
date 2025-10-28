(function(){
  const REALM = window.REALM = { data:{}, state:{}, ui:{} };
  DIAG?.ok?.('app:script-loaded');

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      DIAG.ok('app:dom-ready');
      await loadData();
      DIAG.ok('app:data-loaded');
      State.init();
      DIAG.ok('state:init');
      bindUI();
      MapRender.init();
      DIAG.ok('map:render-init');
      renderAll();
      setInterval(() => { Economy.tick(); renderAll(); }, 5000);
      DIAG.ok('tick:start');
    } catch (err) {
      DIAG.fail('app:boot', err);
    }
  });

  // Build a correct URL relative to the current document (works on /realm/ and localhost)
  function relURL(relPath){
    const u = new URL(relPath, document.location.href);
    // cache-bust so GitHub Pages shows fresh JSON/JS
    u.searchParams.set('v', String(Date.now()));
    return u.toString();
  }

  async function loadData(){
    const files = ['resources','items','structures','tiles'];
    for (const f of files){
      const url = relURL(`data/${f}.json`);
      try {
        const res = await fetch(url, {cache:'no-store'});
        if (!res.ok) throw new Error(`${f}.json HTTP ${res.status}`);
        REALM.data[f] = await res.json();
        DIAG.ok(`data:${f}`);
      } catch (err) {
        DIAG.fail(`data:${f}`, err);
        // minimal fallbacks for bring-up
        if (f === 'tiles') REALM.data.tiles = genSampleTiles(16,10);
        else if (f === 'resources') REALM.data.resources = [
          {id:'food',icon:'🌾',stack:999999},{id:'ore',icon:'⛏️',stack:999999},
          {id:'timber',icon:'🌲',stack:999999},{id:'essence',icon:'💠',stack:999999},{id:'gold',icon:'💰',stack:999999}
        ];
        else REALM.data[f] = [];
      }
    }
  }

  function genSampleTiles(w,h){
    const arr = [];
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        const id = `t-${y*w+x}`;
        const biome = (x+y)%7===0 ? 'forest' : (x%5===0 ? 'hills' : 'plains');
        arr.push({
          id, x, y, biome, owner:null, structures:[],
          resources:{
            foodRate: biome==='plains' ? 1:0,
            oreRate: biome==='hills' ? 1:0,
            timberRate: biome==='forest' ? 1:0,
            essenceRate: 0, goldRate: 0
          }
        });
      }
    }
    return arr;
  }

  function bindUI(){
    REALM.ui.resBar = document.getElementById('resourceBar');
    REALM.ui.sideLog = document.getElementById('sideLog');
    const btn = document.getElementById('buildFarmBtn');
    if (btn) btn.addEventListener('click', () => {
      try {
        const farm = REALM.data.structures.find(s=>s.id==='farm');
        const home = REALM.data.tiles.find(t=>t.owner===REALM.state.player.id);
        if (!farm || !home) return alert('No farm/home');
        if (!Economy.canAfford(farm.cost)) return alert('Not enough resources');
        Economy.applyCost(farm.cost);
        State.addStructure(home.id, 'farm');
        Economy.tick();
        renderAll();
      } catch (e){ DIAG.fail('ui:buildFarm', e); }
    });
  }

  function renderAll(){
    try {
      UI.refreshHeader();
      MapRender.draw(REALM.data.tiles, new Set(REALM.state.player.visibility||[]), REALM.state);
      Chat.render();
    } catch(e){ DIAG.fail('renderAll', e); }
  }

  window.UI = {
    refreshHeader(){
      const rb = REALM.ui.resBar; if (!rb) return;
      const r = REALM.state.player.resources || {};
      rb.innerHTML = `🌾 ${r.food||0}  ⛏️ ${r.ore||0}  🌲 ${r.timber||0}  💠 ${r.essence||0}  💰 ${r.gold||0}`;
    },
    showTooltip(){}, hideTooltip(){}
  };
})();
