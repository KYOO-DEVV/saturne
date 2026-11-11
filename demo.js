/* Démo de Saturne : l'application Windows fournit normalement l'API (/api/…). Ici, elle est simulée dans le navigateur avec quelques données publiques. */
(function () {
  const D = window.DEMO, KEY = 'saturne.demo.';
  const seen = new Set(), catalog = Object.values(D.byQuery).flat().filter(t => !seen.has(t.id) && seen.add(t.id));
  const load = k => { try { return JSON.parse(localStorage.getItem(KEY + k)); } catch { return null; } };
  const save = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch {} };
  let user = load('user') || {username:'demo', display:'Démo', avatar:''};
  const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers:{'Content-Type':'application/json'}});
  const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pick = (arr, n) => arr.slice(0, n);
  const realFetch = window.fetch.bind(window);
  function search(q, type) {
    const key = fold(q).trim();
    if (type === 'channel') return {items:D.artists.filter(a => fold(a.name).includes(key) || !key)};
    const exact = Object.entries(D.byQuery).find(([k]) => fold(k) === key);
    if (exact) return {items:exact[1], next:null};
    const words = key.split(/\s+/).filter(Boolean);
    let hits = catalog.filter(t => words.every(w => fold(t.title + ' ' + t.channel).includes(w)));
    if (!hits.length) hits = catalog.filter(t => words.some(w => fold(t.title + ' ' + t.channel).includes(w)));
    return {items:pick(hits.length ? hits : catalog, 24), next:null};
  }
  async function handle(u, opt) {
    const p = u.pathname, q = Object.fromEntries(u.searchParams), method = (opt.method || 'GET').toUpperCase();
    if (p === '/api/me') { if (method === 'PUT') { const b = JSON.parse(opt.body || '{}'); if (typeof b.display === 'string') user.display = b.display; if (typeof b.avatar === 'string') user.avatar = b.avatar; save('user', user); } return json({user}); }
    if (p === '/api/data') { if (method === 'PUT') { try { localStorage.setItem(KEY + 'data', opt.body); } catch {} return json({ok:true}); } return new Response(localStorage.getItem(KEY + 'data') || '{}', {headers:{'Content-Type':'application/json'}}); }
    if (p === '/api/search') return json(search(q.q || '', q.type));
    if (p === '/api/new') return json({items:D.news});
    if (p === '/api/artists') return json({items:D.artists, pending:false, total:D.artists.length});
    if (p === '/api/lyrics') return json({found:false});
    if (p === '/api/radio') return json({items:catalog.filter(t => t.id !== q.id).sort(() => Math.random() - .5).slice(0, 24)});
    if (p === '/api/channel') { const a = D.artists.find(x => x.id === q.id) || {id:q.id, name:'Artiste', thumb:''}; return json({info:{...a, banner:''}, tracks:catalog.filter(t => t.channelId === q.id).slice(0, 30)}); }
    if (p === '/api/video') { const t = catalog.find(x => x.id === q.id); return t ? json(t) : json({error:'Indisponible dans la démo'}, 404); }
    if (p === '/api/about') return json({version:'démo', dataDir:'(dans ce navigateur)', repo:'KYOO-DEVV/saturne'});
    if (p === '/api/update/check') return json({available:false, current:'démo', latest:'démo', canInstall:false});
    if (p === '/api/backups') return json({items:[]});
    if (p === '/api/public') return json({items:[]});
    if (p === '/api/follows/new') return json({items:[]});
    if (p === '/api/more') return json({items:[], next:null});
    if (p === '/api/presence') return json({ok:true});
    if (p === '/api/alt') return json({error:'Indisponible dans la démo'}, 404);
    return json({error:'Indisponible dans la démo : télécharge Saturne pour Windows.'}, 404);
  }
  window.fetch = (url, opt) => { const s = typeof url === 'string' ? url : url.url; return s.startsWith('/api/') ? handle(new URL(s, location.href), opt || {}) : realFetch(url, opt); };
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('a');
    b.href = 'https://github.com/KYOO-DEVV/saturne/releases/latest'; b.target = '_blank'; b.rel = 'noopener';
    b.textContent = 'Démo web · Saturne pour Windows ↗';
    b.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 4px);left:50%;transform:translateX(-50%);z-index:9999;font:600 11px system-ui,sans-serif;color:#cfcfe0;background:rgba(20,20,28,.88);border:1px solid #2a2a35;border-radius:999px;padding:3px 10px;text-decoration:none;backdrop-filter:blur(6px)';
    document.body.appendChild(b);
  });
})();
