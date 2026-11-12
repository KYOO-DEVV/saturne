/* ---------- Playlists : filtre, tri, sélection multiple, doublons ---------- */
/* S.plv = {q:filtre, sort:'manual'|'recent'|'title'|'artist'|'duration', sel:null | Set d'identifiants} */
const plPlain = () => !S.plv.q && S.plv.sort === 'manual';
function plView(){
  const p = curPl(); if (!p) return [];
  let l = p.tracks; const q = S.plv.q.trim().toLowerCase(), s = S.plv.sort;
  if (q) l = l.filter(t => (t.title + ' ' + t.channel).toLowerCase().includes(q));
  if (s === 'recent') l = [...l].reverse();
  else if (s !== 'manual') { const key = {title:t => t.title.toLowerCase(), artist:t => (t.channel || '').toLowerCase(), duration:t => t.duration || 0}[s]; l = [...l].sort((a, b) => key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0); }
  return l;
}
const PL_SORTS = () => [['manual', L('Custom order', 'Ordre manuel')], ['recent', L('Recently added', 'Ajouts récents')], ['title', L('Title', 'Titre')], ['artist', L('Artist', 'Artiste')], ['duration', L('Duration', 'Durée')]];
DD.plsort = {opts:PL_SORTS, value:() => S.plv.sort, set:v => { S.plv.sort = v; renderView(); }};
function plToolsHtml(p){
  const sel = S.plv.sel, n = sel ? sel.size : 0;
  const bar = sel ? `<div class="selbar"><b>${n} ${n > 1 ? L('selected', 'sélectionnés') : L('selected', 'sélectionné')}</b><button class="ghost" data-do="selall">${L('Select all', 'Tout sélectionner')}</button><button class="ghost" data-do="selqueue" ${n ? '' : 'disabled'}>${ic('addq')}${L('Add to queue', 'Ajouter à la file')}</button><button class="ghost" data-do="seladd" ${n ? '' : 'disabled'}>${ic('plus')}${L('Add to playlist…', 'Ajouter à une playlist…')}</button><button class="ghost warn" data-do="selremove" ${n ? '' : 'disabled'}>${ic('trash')}${L('Remove', 'Retirer')}</button><button class="ghost" data-do="seloff">${L('Done', 'Terminé')}</button></div>` : '';
  return `<div class="pltools"><div class="search plfilter"><span>${ic('search')}</span><input id="plFilter" type="search" placeholder="${L('Filter this playlist', 'Filtrer cette playlist')}" aria-label="${L('Filter this playlist', 'Filtrer cette playlist')}" value="${esc(S.plv.q)}" autocomplete="off"></div>
    <div class="sortbox">${dd('plsort', L('Sort', 'Trier'))}</div>${sel ? '' : `<button class="ghost" data-do="selon">${ic('check')}${L('Select', 'Sélectionner')}</button>`}<button class="ghost" data-do="dedupe">${L('Remove duplicates', 'Retirer les doublons')}</button></div>${bar}`;
}
$('#view').addEventListener('input', e => {
  if (e.target.id !== 'plFilter') return;
  S.plv.q = e.target.value; const pos = e.target.selectionStart; renderView();
  const f = $('#plFilter'); if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch {} }
});
const normTitle = t => (t.title || '').toLowerCase().replace(/[\s\W_]+/g, '') + '|' + (t.channel || '').toLowerCase();
function plDo(k, b, e){
  const p = curPl(); if (!p) return;
  const sel = S.plv.sel, picked = () => p.tracks.filter(t => sel && sel.has(t.id));
  if (k === 'selon') { S.plv.sel = new Set(); renderView(); }
  else if (k === 'seloff') { S.plv.sel = null; renderView(); }
  else if (k === 'selall') { const v = plView(); S.plv.sel = new Set(sel && sel.size === v.length ? [] : v.map(t => t.id)); renderView(); }
  else if (k === 'pick') { const li = b.closest('[data-i]'), t = plView()[+li.dataset.i]; if (!t || !sel) return; if (sel.has(t.id)) sel.delete(t.id); else sel.add(t.id); renderView(); }
  else if (k === 'selqueue') { const l = picked(); l.forEach(t => { S.queue.push(slim(t)); S.order.push(S.queue.length - 1); }); if (S.cur < 0 && S.queue.length) { S.cur = 0; rebuildOrder(); loadCurrent(); } save(); render(); toast(l.length + ' ' + L('added to queue', 'ajoutés à la file')); }
  else if (k === 'selremove') {
    const before = [...p.tracks], n = sel.size; p.tracks = p.tracks.filter(t => !sel.has(t.id)); S.plv.sel = new Set(); save(); render();
    toast(n + ' ' + L('removed', 'retirés'), {undo:() => { p.tracks = before; save(); render(); }});
  }
  else if (k === 'seladd') {
    e.stopPropagation(); const l = picked(), m = $('#menu'); menuTrack = null;
    m.innerHTML = `<div class="label">${L('Add to', 'Ajouter à')}</div>` + S.playlists.filter(x => x.id !== p.id).map(x => `<button data-bulk="${x.id}" data-notr>${esc(x.name)}</button>`).join('');
    m.onclick = ev => { const t = ev.target.closest('[data-bulk]'); if (!t) return; const dst = S.playlists.find(x => x.id === t.dataset.bulk); closeMenu(); m.onclick = null; if (!dst) return; let n = 0; l.forEach(x => { if (!dst.tracks.some(y => y.id === x.id)) { dst.tracks.push(slim(x)); n++; } }); save(); render(); toast(n + ' ' + L('added to ', 'ajoutés à ') + '« ' + dst.name + ' »'); };
    placeMenu(b);
  }
  else if (k === 'dedupe') {
    const seen = new Set(), ids = new Set(), before = [...p.tracks];
    p.tracks = p.tracks.filter(t => { const key = normTitle(t); if (ids.has(t.id) || seen.has(key)) return false; ids.add(t.id); seen.add(key); return true; });
    const n = before.length - p.tracks.length;
    if (!n) return toast(L('No duplicates in this playlist', 'Aucun doublon dans cette playlist'));
    save(); render(); toast(n + ' ' + (n > 1 ? L('duplicates removed', 'doublons retirés') : L('duplicate removed', 'doublon retiré')), {undo:() => { p.tracks = before; save(); render(); }});
  }
}

/* ---------- Palette de commandes (Ctrl+K) ---------- */
function paletteItems(){
  const nav = (label, v, icon) => ({label, icon, kind:L('Page', 'Page'), run:() => go(v)});
  const set = (label, tab) => ({label:L('Settings: ', 'Réglages : ') + label, icon:'settings', kind:L('Settings', 'Réglages'), run:() => { S.setTab = tab; go({type:'settings'}); if (['updates', 'about', 'data', 'changelog'].includes(tab)) loadAbout(); if (tab === 'data') loadBackups(); }});
  const act = (label, icon, run) => ({label, icon, kind:'Action', run});
  return [
    nav(L('Home', 'Accueil'), {type:'home'}, 'home'), nav(L('Search', 'Recherche'), {type:'search', q:''}, 'search'), nav(L('Artists', 'Artistes'), {type:'artists'}, 'person'),
    nav(L('Your Library', 'Ma bibliothèque'), {type:'library'}, 'lib'), nav(L('History', 'Historique'), {type:'history'}, 'history'), nav(L('Lyrics', 'Paroles'), {type:'now'}, 'lyrics'), nav('Store', {type:'store'}, 'store'),
    ...(typeof S.store !== 'undefined' ? S.store.installed.filter(m => m.type === 'app' && modOn(m.id)).map(m => ({label:m.name, icon:'apps', kind:'App', raw:true, run:() => go({type:'app', id:m.id})})) : []),
    ...S.playlists.map(p => ({label:p.name, icon:p.id === 'favs' ? 'bookmarkf' : 'queue', kind:'Playlist', raw:true, run:() => go({type:'playlist', id:p.id})})),
    ...S.follows.map(a => ({label:a.name, icon:'person', kind:L('Artist', 'Artiste'), raw:true, run:() => go({type:'artist', id:a.id})})),
    ...GENRES.map(g => ({label:g.n, icon:'genres', kind:L('Genre', 'Genre'), raw:true, run:() => go({type:'list', q:g.q, title:g.n, cc:g.cc, eyebrow:'Genre'})})),
    ...SET_TABS.map(([k, n]) => set(trText(n), k)),
    act(L('Play / pause', 'Lecture / pause'), 'play', togglePlay), act(L('Next song', 'Titre suivant'), 'next', () => next(false)), act(L('Previous song', 'Titre précédent'), 'prev', prev),
    act(L('Shuffle on/off', 'Aléatoire : activer / désactiver'), 'shuffle', () => $('#bShuffle').click()), act(L('Open the queue', 'Ouvrir la file d’attente'), 'queue', () => setQueueOpen(true)),
    act(L('Create a playlist', 'Créer une playlist'), 'plus', newPlaylist), act(L('Import a playlist', 'Importer une playlist'), 'upload', importModal),
    act(L('Sleep timer: 30 minutes', 'Minuterie de sommeil : 30 minutes'), 'moon', () => setSleep(30)), act(L('Music video on/off', 'Clip vidéo : activer / désactiver'), 'mini', () => { if (current()) { go({type:'now'}); setClip(!S.clip); } }),
    ...(NATIVE ? [act(L('Mini player', 'Mini-lecteur'), 'mini', () => setMini(!S.mini))] : []),
    act(LANG === 'fr' ? 'Switch to English' : 'Passer en français', 'globe', () => DD.lang.set(LANG === 'fr' ? 'en' : 'fr')), act(L('Keyboard shortcuts', 'Raccourcis clavier'), 'info', helpModal), act(L('Log out', 'Se déconnecter'), 'logout', logout)
  ];
}
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function paletteModal(){
  const all = paletteItems(); let shown = [], idx = 0;
  openModal(`<div class="pal"><div class="search"><span>${ic('search')}</span><input id="palQ" type="search" placeholder="${L('Type a page, a playlist, an action…', 'Tape une page, une playlist, une action…')}" aria-label="${L('Command palette', 'Palette de commandes')}" autocomplete="off"></div><div class="pal-list" id="palList" role="listbox"></div><p class="pal-hint">↑ ↓ ${L('to move', 'pour choisir')} · ${L('Enter to run', 'Entrée pour lancer')} · ${L('Esc to close', 'Échap pour fermer')}</p></div>`,
  m => {
    const q = m.querySelector('#palQ'), list = m.querySelector('#palList');
    const draw = () => {
      const words = fold(q.value).split(/\s+/).filter(Boolean);
      shown = all.filter(it => words.every(w => fold(it.label + ' ' + it.kind).includes(w))).slice(0, 9);
      if (q.value.trim()) shown.push({label:L('Search “', 'Chercher « ') + q.value.trim() + L('” on YouTube', ' » sur YouTube'), icon:'search', kind:L('Search', 'Recherche'), raw:true, run:() => go({type:'search', q:q.value.trim()})});
      idx = Math.min(idx, Math.max(0, shown.length - 1));
      list.innerHTML = shown.map((it, i) => `<button role="option" aria-selected="${i === idx}" class="${i === idx ? 'on' : ''}" data-pi="${i}">${ic(it.icon)}<span ${it.raw ? 'data-notr' : ''}>${esc(it.label)}</span><small>${esc(it.kind)}</small></button>`).join('') || `<p class="ly-info">${L('Nothing found', 'Rien trouvé')}</p>`;
    };
    const run = i => { const it = shown[i]; if (!it) return; closeModal(); it.run(); };
    q.addEventListener('input', () => { idx = 0; draw(); });
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (shown.length) { idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length; draw(); } }
      else if (e.key === 'Enter') { e.preventDefault(); run(idx); }
    });
    list.addEventListener('click', e => { const b = e.target.closest('[data-pi]'); if (b) run(+b.dataset.pi); });
    draw();
  });
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K') && S.user) { e.preventDefault(); paletteModal(); }
});
SHORTCUTS.splice(3, 0, ['Ctrl + K', 'Palette de commandes']);
