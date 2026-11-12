#!/usr/bin/env node
/* Test de fumée de l'interface, sans fenêtre : le script assemblé est exécuté dans un faux navigateur (DOM « permissif »).
   Il attrape ce que `node --check` ne voit pas : une exception au chargement (écran noir), une page qui plante au rendu,
   un filtre du Store qui laisse passer une adresse externe.
   Usage : node tests/ui-smoke.js <script-assemblé.js>   (lancé par le test Rust `web_tests::ui_smoke`) */
const fs = require('fs'), vm = require('vm');
const file = process.argv[2]; if (!file) { console.error('Usage : node tests/ui-smoke.js script.js'); process.exit(2); }
const code = fs.readFileSync(file, 'utf8');

/* DOM de fortune : tout accès renvoie un objet qui accepte tout (propriétés, appels, constructions). */
const handlers = [];
function stub(name = 'el') {
  const target = function () {};
  const store = {};
  return new Proxy(target, {
    get(_, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      if (k === Symbol.iterator) return function* () {};
      if (k in store) return store[k];
      if (k === 'addEventListener') return (t, fn) => handlers.push({el: name, t, fn});
      if (k === 'dataset') return (store[k] = {});
      if (k === 'classList') return {add() {}, remove() {}, toggle() { return false; }, contains() { return false; }};
      if (k === 'getComputedStyle') return () => stub();
      if (k === 'querySelectorAll') return () => [];
      if (k === 'matches' || k === 'closest') return () => null;
      if (k === 'getBoundingClientRect') return () => ({left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0});
      if (k === 'getPropertyValue') return () => '';
      return (store[k] = stub(name + '.' + String(k)));
    },
    set(_, k, v) { store[k] = v; return true; },
    apply() { return stub(name + '()'); },
    construct() { return stub(name + ' new'); },
  });
}
const mem = new Map();
const problems = [];
const ctx = {
  console: {log() {}, warn() {}, error(...a) { problems.push('console.error: ' + a.join(' ')); }, info() {}},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  localStorage: {getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)},
  sessionStorage: {getItem: () => null, setItem() {}, removeItem() {}},
  navigator: {language: 'fr-FR', languages: ['fr-FR'], userAgent: 'node-smoke', mediaSession: null, clipboard: {writeText: async () => {}}, maxTouchPoints: 0},
  location: {search: '', hash: '', href: 'http://127.0.0.1:8787/', origin: 'http://127.0.0.1:8787', reload() {}},
  matchMedia: () => ({matches: false, addEventListener() {}, addListener() {}}),
  getComputedStyle: () => stub(),
  MutationObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} }, IntersectionObserver: class { observe() {} disconnect() {} },
  Image: class { set src(v) {} }, Audio: class {}, FileReader: class {}, Blob: class { constructor(p) { this.size = (p || []).join('').length; } },
  URL: Object.assign(URL, {createObjectURL: () => 'blob:x', revokeObjectURL() {}}), URLSearchParams, TextEncoder, TextDecoder, Promise, JSON, Math, Date, Map, Set, Intl, Array, Object, Number, String, RegExp, Error, Symbol, Boolean, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent, escape, unescape,
  fetch: async (url, opt) => { const body = ctx.__route(String(url), opt || {}); return {ok: body.status === undefined, status: body.status || 200, headers: {get: () => 'application/json'}, json: async () => body, text: async () => JSON.stringify(body)}; },
  __route: url => (url.includes('/api/me') ? {user: null} : {}),
  Notification: undefined, CSS: {supports: () => false}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, screen: {width: 1280, height: 800},
  addEventListener() {}, removeEventListener() {}, postMessage() {}, open() {}, focus() {}, scrollTo() {}, history: {pushState() {}, replaceState() {}},
};
const doc = stub('document'); doc.body = stub('body'); doc.documentElement = stub('html'); doc.hidden = false; doc.cookie = '';
doc.querySelector = () => stub('el'); doc.getElementById = () => stub('el'); doc.createElement = () => stub('created'); doc.querySelectorAll = () => [];
doc.createDocumentFragment = () => stub('frag'); doc.activeElement = stub('active');
ctx.document = doc; ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.YT = undefined;
vm.createContext(ctx);

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('✗ ' + msg); } };
const run = src => vm.runInContext(src, ctx, {timeout: 5000});

/* 1. Chargement : aucune exception, et le script signale son démarrage. */
process.on('unhandledRejection', e => problems.push('promesse rejetée : ' + (e && e.stack || e)));
try { vm.runInContext(code, ctx, {filename: 'bundle.js', timeout: 10000}); } catch (e) { console.error('✗ exception au chargement : ' + (e && e.stack || e)); process.exit(1); }
ok(ctx.__booted === true, 'window.__booted doit être vrai après le chargement');

(async () => {
  await new Promise(r => setImmediate(r));
  /* 2. Fonctions pures : filtre CSS du Store, réglages de thème, paroles, filtre par chaîne. */
  const css = src => run(`cssProblem(${JSON.stringify(src)})`);
  for (const good of [':root{--accent:#f0f}', '.a{background:url(images/bg.png)}', '.a{background:url("data:image/png;base64,AAAA")}', '/* url(http://x) */ .a{color:red}']) ok(css(good) === '', 'CSS accepté : ' + good);
  for (const bad of ["@import url('x.css');", '.a{background:url(http://evil.test/a.png)}', '.a{background:url(//evil.test/a.png)}', '.a{background:url(/api/data)}', '.a{background:url(../x.png)}', '.a{background:\\75rl(x)}', '.a{width:expression(alert(1))}', '.a{background:image-set("http://evil.test/a.png" 1x)}', '.a{background:url(data:image/svg+xml;base64,AAAA)}', '</style><script>'])
    ok(css(bad) !== '', 'CSS refusé : ' + bad);
  const set = run(`JSON.stringify(cleanModSettings({bg:'light', accentCustom:'#112233', radius:'weird', bgBlur:99, bgImage:'a.png', evil:1, accent:'violet', hideLogo:'oui'}, 'mon-theme'))`);
  ok(set === '{"bg":"light","accent":"violet","accentCustom":"#112233","bgImage":"/mods/mon-theme/a.png"}', 'réglages de thème filtrés : ' + set);
  ok(run(`JSON.stringify(cleanModSettings({bgImage:'../../x.png'}, 'a-b'))`) === '{}', 'bgImage avec .. refusé');
  ok(run(`parseLrc('[00:01.50] Bonjour\\n[00:03.00]Monde\\nnote').length`) === 2, 'parseLrc lit deux lignes');
  ok(run(`parseLrc('[01:02.5]x')[0].t`) === 62.5, 'parseLrc convertit minutes:secondes');
  ok(run(`slug('Mon Thème Été !')`) === 'mon-theme-ete', 'slug des noms de thèmes');
  ok(run(`fold('Été Ça')`) === 'ete ca', 'fold supprime les accents');

  /* 3. Rendu : chaque page produit du HTML sain avec des données réalistes. */
  run(`S.user = {username:'t', display:'Testeur', avatar:''};
    const T = n => Array.from({length:n}, (_, i) => ({id:'abcdefghi' + String(i).padStart(2, '0'), title:'Titre ' + i, channel:i % 2 ? 'Chaîne B' : 'Chaîne A', channelId:'UC' + 'x'.repeat(22), thumb:'https://i.ytimg.com/vi/x/mqdefault.jpg', duration:100 + i, added:Date.now() - i * 1e6}));
    globalThis.__T = T;
    applyData({playlists:[{id:'favs', tracks:T(3)}, {id:'p1', name:'Ma liste', tracks:T(12), created:Date.now()}], queue:T(4), cur:1, history:T(5), plays:T(5).map(t => [t.id, t.title, t.channel, t.channelId, Date.now(), 120]), follows:[], settings:{}});
    S.home.main.tracks = T(10); S.home.fresh.tracks = T(8); S.search = {q:'x', tracks:T(6), loading:false, error:''}; S.list = {title:'Genre', eyebrow:'Genre', tracks:T(5), loading:false, error:'', q:'x', cc:''};
    S.artists = {items:[{id:'UC' + 'a'.repeat(22), name:'Artiste', thumb:'', subsText:'1 M'}], loading:false, error:'', mode:'popular', query:''}; S.artist = {id:'UC' + 'a'.repeat(22), info:{name:'Artiste', thumb:'', subsText:'1 M'}, tracks:T(4), loading:false, error:''};
    S.store.items = [{id:'neon-oled', name:'Néon', author:'x', type:'theme', version:'1.0.0', description:'d', preview:['#000000', '#ff0000'], permissions:[], files:[], builtin:true}, {id:'pomodoro', name:'Pomodoro', author:'x', type:'app', version:'1.0.0', description:'d', preview:[], permissions:['storage'], files:[], builtin:true}];
    S.store.installed = [{id:'neon-oled', name:'Néon', author:'x', type:'theme', version:'1.0.0', permissions:[], hasCss:true, hasSettings:true}]; S.store.loaded = true;`);
  const views = [
    ['home', `S.view = {type:'home'}; heroHtml()`], ['search', `S.view = {type:'search', q:'x'}; rows(S.search.tracks, 'search')`], ['list', `rows(S.list.tracks, 'list')`],
    ['artists', `artistTile(S.artists.items[0]) + followsHtml()`], ['playlist', `S.view = {type:'playlist', id:'p1'}; playlistPageHtml(S.playlists[1])`], ['library', `libHtml()`],
    ['history', `historyHtml()`], ['profile', `profileHtml()`], ['lyrics', `S.view = {type:'now'}; lyricsPageHtml()`], ['search-vide', `searchHomeHtml()`],
    ['store-decouvrir', `S.store.tab = 'discover'; storeHtml()`], ['store-installes', `S.store.tab = 'installed'; storeHtml()`], ['store-creer', `S.store.tab = 'create'; storeHtml()`],
    ['app', `S.settings.modsOn = ['neon-oled']; appPageHtml('neon-oled')`], ['modCard', `modCard(S.store.items[1])`],
  ];
  for (const [name, expr] of views) {
    let h; try { h = run(expr); } catch (e) { ok(false, `page « ${name} » : exception ${e && e.message}`); continue; }
    ok(typeof h === 'string' && h.length > 20, `page « ${name} » : HTML vide`);
    ok(!/undefined|\[object|NaN/.test(h), `page « ${name} » : contient undefined/[object]/NaN → ` + (h.match(/.{0,40}(undefined|\[object|NaN).{0,40}/) || [''])[0]);
  }
  for (const tab of ['account', 'general', 'playback', 'appearance', 'privacy', 'data', 'updates', 'about', 'changelog']) {
    let h; try { h = run(`S.setTab = '${tab}'; settingsHtml()`); } catch (e) { ok(false, `réglages « ${tab} » : exception ${e && e.message}`); continue; }
    ok(typeof h === 'string' && h.length > 50, `réglages « ${tab} » : HTML vide`);
    ok(!/undefined|\[object|NaN/.test(h), `réglages « ${tab} » : contient undefined/[object]/NaN`);
  }

  /* 3b. Extensions : options (valeurs corrigées), décors, repères CSS. */
  run(`S.store.installed = [{id:'runner-bar', name:'Runner', author:'x', type:'extension', version:'1.0.0', permissions:[], hasCss:true, hasSettings:false, icon:'i.png', thumb:'t.png',
      options:[{id:'size', type:'range', label:'T', min:20, max:64, step:1, unit:'px', default:36}, {id:'trail', type:'toggle', label:'L', default:true}, {id:'tint', type:'color', label:'C', default:'#ff0000'}, {id:'mode', type:'choice', label:'M', choices:[{value:'a', label:'A'}, {value:'b', label:'B'}], default:'a'}, {id:'sprite', type:'image', label:'S'}],
      decor:[{id:'p', anchor:'seekbar', image:'run.gif', size:'option:size', behavior:'follow'}, {id:'s', anchor:'playbtn', image:'option:sprite', size:40}]}];
    S.settings.modsOn = ['runner-bar']; S.settings.modsOpts = {'runner-bar':{size:9999, trail:'oui', tint:'rouge', mode:'zzz', sprite:'http://evil.test/x.gif'}};`);
  const m0 = 'S.store.installed[0]', optv = i => run(`optValue(${m0}, ${m0}.options[${i}])`);
  ok(optv(0) === 36 && optv(1) === true && optv(2) === '#ff0000' && optv(3) === 'a' && optv(4) === '', 'options invalides : retour aux valeurs par défaut (et pas d’image externe)');
  run(`S.settings.modsOpts = {'runner-bar':{size:50, trail:false, tint:'#00ff00', mode:'b', sprite:'/media/abc123.gif'}}`);
  ok(optv(0) === 50 && optv(1) === false && optv(2) === '#00ff00' && optv(3) === 'b' && optv(4) === '/media/abc123.gif', 'options valides conservées');
  for (const [name, expr] of [['applyOptions', `applyOptions()`], ['renderDecor', `renderDecor()`], ['placeDecor', `placeDecor()`], ['hostHooks', `hostHooks()`], ['modCard extension', `modCard(S.store.installed[0])`], ['optControl', `S.store.installed[0].options.map(o => optControl(S.store.installed[0], o)).join('')`]]) {
    try { const r = run(expr); if (typeof r === 'string') ok(!/undefined|\[object|NaN/.test(r), `${name} : contient undefined/[object]/NaN`); } catch (e) { ok(false, `${name} : exception ${e && e.message}`); }
  }
  ok(run(`decorSize(${m0}, ${m0}.decor[0])`) === 50 && run(`decorSize(${m0}, ${m0}.decor[1])`) === 40, 'taille des décors (fixe ou liée à une option)');
  ok(run(`editable({nodeType:1, closest: s => s.includes('input') ? {} : null})`) === true && run(`editable({nodeType:1, closest: () => null})`) === false, 'la sélection reste permise dans les champs de saisie seulement');

  /* 4. Listes : le filtre (clic sur une chaîne) garde exactement les titres de cette chaîne, et ne touche pas aux autres sources. */
  ok(run(`S.plv = {q:'', sort:'manual', sel:null}; tracksOf('search').length`) === 6, 'sans filtre : tous les titres');
  ok(run(`S.plv = {q:'Chaîne A', sort:'manual', sel:null}; tracksOf('search').length`) === 3, 'filtre par chaîne : la moitié des titres');
  ok(run(`S.plv = {q:'Chaîne A', sort:'manual', sel:null}; tracksOf('recent').length`) === 5, 'le filtre ne touche pas l’historique');
  run(`S.plv = {q:'', sort:'manual', sel:null}`);

  /* 5. Lecture sans fin : la file s'allonge avec la radio, et ne touche pas une file remplacée entre-temps. */
  const radio = [{id:'zzzzzzzzz01', title:'R1', channel:'c', channelId:'', thumb:'', duration:100}, {id:'zzzzzzzzz02', title:'R2', channel:'c', channelId:'', thumb:'', duration:100}];
  ctx.__route = url => (url.includes('/api/radio') ? {items: radio} : {});
  run(`S.queue = __T(2).map(slim); S.cur = 1; rebuildOrder(); S.repeat = 'off'; S.settings.endless = true;`);
  run(`next(true)`); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  ok(run(`S.queue.length`) === 4 && run(`S.cur`) === 2, 'lecture sans fin : 2 titres ajoutés et lecture du premier');
  run(`S.queue = __T(2).map(slim); S.cur = 1; rebuildOrder(); next(true); S.queue = __T(1).map(slim); S.cur = 0; rebuildOrder();`); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  ok(run(`S.queue.length`) === 1, 'lecture sans fin : une file remplacée pendant l’attente reste intacte');

  if (problems.length) { for (const p of problems) console.error('✗ ' + p); failed += problems.length; }
  if (failed) { console.error(`\n${failed} échec(s)`); process.exit(1); }
  console.log('ui-smoke : tout est bon');
})().catch(e => { console.error('✗ erreur du test : ' + (e && e.stack || e)); process.exit(1); });
