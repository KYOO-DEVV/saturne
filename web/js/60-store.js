/* ---------- 0.8.0 : Store (thèmes et Apps) ---------- */
/* Un thème = réglages (settings.json) + CSS filtré (theme.css). Une App = JavaScript dans une iframe isolée (sandbox), qui parle à Saturne
   par postMessage et ne peut faire que ce que ses permissions déclarées autorisent. Voir STORE.md. */
S.store = {items:[], installed:[], loaded:false, loading:false, error:'', remoteError:'', registry:'', tab:'discover', type:'all', q:'', busy:{}, serverSafe:false, cssError:''};
const SAFE_KEY = 'saturne.safe';
const safeMode = () => { try { return localStorage.getItem(SAFE_KEY) === '1' || /[?&]safe\b/.test(location.search); } catch { return false; } };
const setSafe = on => { try { if (on) localStorage.setItem(SAFE_KEY, '1'); else localStorage.removeItem(SAFE_KEY); } catch {} };
const modsOff = () => safeMode() || S.store.serverSafe;
const modsOn = () => Array.isArray(S.settings.modsOn) ? S.settings.modsOn : [];
const modOn = id => modsOn().includes(id);
const modOf = id => S.store.installed.find(m => m.id === id);
const PERM_TEXT = () => ({
  'player.read':L('See what is playing', 'Voir ce qui est en lecture'), 'player.control':L('Play, pause and skip songs', 'Lancer, mettre en pause et passer les titres'),
  'queue.add':L('Add songs to the queue', 'Ajouter des titres à la file d’attente'), search:L('Search songs', 'Rechercher des titres'), storage:L('Keep its own small data', 'Garder ses propres petites données')});

/* --- Filtre CSS : même règles que le serveur (src/modstore.rs). Renvoie '' si le CSS est accepté, sinon la raison du refus. --- */
function cssProblem(css){
  css = String(css || '');
  if (css.length > 256 * 1024) return L('CSS too large', 'CSS trop volumineux');
  if (css.includes('\\')) return L('The “\\” character is not allowed in CSS', 'Le caractère « \\ » n’est pas autorisé dans le CSS');
  const l = css.replace(/\/\*[\s\S]*?(\*\/|$)/g, '').toLowerCase();
  for (const bad of ['@import', 'expression(', 'javascript:', 'vbscript:', 'behavior:', '-moz-binding', '<', 'image-set(', 'src(', 'image(', 'element(', 'paint(', '@charset']) if (l.includes(bad)) return `“${bad}” ${L('is not allowed in CSS', 'n’est pas autorisé dans le CSS')}`;
  let rest = l, i;
  while ((i = rest.indexOf('url(')) >= 0) {
    const after = rest.slice(i + 4), end = after.indexOf(')'); if (end < 0) return L('url( without closing parenthesis', 'url( sans parenthèse fermante');
    const arg = after.slice(0, end).trim().replace(/^["']+|["']+$/g, '').trim();
    const ok = arg.startsWith('data:image/') ? /^data:image\/(png|jpe?g|gif|webp);/.test(arg) : (arg.startsWith('#') || (arg !== '' && !arg.includes(':') && !arg.startsWith('/') && !arg.includes('..') && !arg.includes('//')));
    if (!ok) return L('External addresses (url(…)) are not allowed: only the package’s own images are', 'Les adresses externes (url(…)) ne sont pas autorisées : seules les images du paquet le sont');
    rest = after.slice(end + 1);
  }
  return '';
}

/* --- Réglages qu'un thème peut changer (liste blanche) : rien d'autre ne passe. --- */
const MOD_KEYS = {
  bg:v => ['oled', 'dark', 'light'].includes(v), accent:v => !!ACCENTS[v], accentCustom:v => v === '' || hexOk(v), radius:v => ['square', 'soft', 'round'].includes(v), density:v => ['comfortable', 'compact'].includes(v),
  bgOverlay:v => Number.isFinite(v) && v >= 0 && v <= 100, bgBlur:v => Number.isFinite(v) && v >= 0 && v <= 30, bgTint:v => ['bg', 'black', 'white', 'accent', 'none'].includes(v),
  hideLogo:v => typeof v === 'boolean', sideThumbs:v => typeof v === 'boolean', heroAuto:v => typeof v === 'boolean', reduceMotion:v => typeof v === 'boolean', lyricsVideo:v => typeof v === 'boolean',
  bgImage:v => v === '' || /^[\w.-]+(\/[\w.-]+)?$/.test(v) && !v.includes('..')};
function cleanModSettings(st, id){
  const out = {}; if (!st || typeof st !== 'object' || Array.isArray(st)) return out;
  for (const k of Object.keys(MOD_KEYS)) if (k in st && MOD_KEYS[k](st[k])) out[k] = k === 'bgImage' && st[k] ? `/mods/${id}/${st[k]}` : st[k];
  return out;
}

/* --- Chargement, activation --- */
async function loadMods(){
  try { const j = await http('/api/store/installed'); S.store.installed = j.items || []; S.store.serverSafe = !!j.safe; } catch { S.store.installed = []; }
  applyMods(); renderAppNav(); renderSide(); if (S.view.type === 'store') renderView();
}
function applyMods(){
  document.querySelectorAll('link[data-mod]').forEach(l => l.remove());
  let st = document.getElementById('custom-css'); if (!st) { st = document.createElement('style'); st.id = 'custom-css'; document.head.appendChild(st); }
  st.textContent = '';
  if (!modsOff()) {
    for (const id of modsOn()) { const m = modOf(id); if (m && (m.type === 'theme' || m.type === 'extension') && m.hasCss) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `/mods/${id}/theme.css?v=${encodeURIComponent(m.version)}`; l.dataset.mod = id; document.head.appendChild(l); } }
    if (S.settings.customCss && !cssProblem(S.settings.customCss)) st.textContent = S.settings.customCss;
  }
  pushTheme(); if (typeof applyOptions === 'function') { applyOptions(); renderDecor(); }
}
async function enableMod(id){
  const m = modOf(id); if (!m || modOn(id)) return;
  if (m.type === 'theme') {
    for (const o of S.store.installed.filter(x => x.type === 'theme' && modOn(x.id))) await disableMod(o.id, true); // un seul thème à la fois
    let st = {}; if (m.hasSettings) { try { st = await (await fetch(`/mods/${id}/settings.json`)).json(); } catch {} }
    const clean = cleanModSettings(st, id), prev = {}; for (const k of Object.keys(clean)) { prev[k] = S.settings[k]; S.settings[k] = clean[k]; }
    S.settings.modsPrev = {...(S.settings.modsPrev || {}), [id]:prev};
  }
  S.settings.modsOn = [...modsOn(), id]; applyTheme(); applyMods(); renderAppNav(); renderSide(); save();
}
async function disableMod(id, quiet){
  const prev = (S.settings.modsPrev || {})[id]; if (prev) { Object.assign(S.settings, prev); const p = {...S.settings.modsPrev}; delete p[id]; S.settings.modsPrev = p; }
  S.settings.modsOn = modsOn().filter(x => x !== id); applyTheme(); applyMods(); renderAppNav(); save();
  if (!quiet) { renderSide(); if (S.view.type === 'app' && S.view.id === id) go({type:'store'}); else if (S.view.type === 'store') renderView(); }
}
async function installMod(id){
  const e = S.store.items.find(x => x.id === id); if (!e) return;
  if (e.type === 'app' && e.permissions.length && !(await askPermissions(e))) return;
  S.store.busy[id] = true; renderStoreGrid();
  try {
    const j = await send('/api/store/install', {id}); S.store.installed = j.items || [];
    if (!modOn(id)) await enableMod(id); else { applyMods(); renderAppNav(); }
    toast(L('Installed: ', 'Installé : ') + e.name);
  } catch (er) { toast(errText(er)); }
  delete S.store.busy[id]; renderView();
}
async function removeMod(id){
  const m = modOf(id); if (!m) return;
  await disableMod(id, true);
  try { const r = await http(`/api/store/${id}`, {method:'DELETE'}); S.store.installed = r.items || []; } catch (er) { toast(errText(er)); }
  if (S.settings.modsOpts && S.settings.modsOpts[id]) { const o = {...S.settings.modsOpts}; delete o[id]; S.settings.modsOpts = o; save(); }
  applyMods(); renderAppNav(); renderSide(); if (S.view.type === 'app' && S.view.id === id) go({type:'store'}); else renderView();
  toast(L('Removed: ', 'Retiré : ') + m.name);
}
function askPermissions(e){
  return new Promise(res => {
    const P = PERM_TEXT(); let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    openModal(`<h3>${L('This App asks for permissions', 'Cette App demande des autorisations')}</h3><p><b>${esc(e.name)}</b> · ${L('by', 'par')} ${esc(e.author)}</p>
      <ul class="stperm-list">${e.permissions.map(p => `<li>${ic('check')}${esc(P[p] || p)}</li>`).join('')}</ul>
      <p class="hint">${L('The App runs in an isolated frame: it cannot see your account, playlists or files, and has no internet access. Only install Apps you trust.', 'L’App tourne dans un cadre isolé : elle ne voit ni ton compte, ni tes playlists, ni tes fichiers, et n’a pas accès à Internet. N’installe que des Apps de confiance.')}</p>
      <div class="mactions"><button class="ghost" id="permNo">${L('Cancel', 'Annuler')}</button><button class="btn" id="permYes">${L('Allow and install', 'Autoriser et installer')}</button></div>`,
    m => { m.querySelector('#permNo').onclick = () => { closeModal(); fin(false); }; m.querySelector('#permYes').onclick = () => { closeModal(); fin(true); }; });
    $('#modal').addEventListener('mousedown', ev => { if (ev.target.id === 'modal') fin(false); }, {once:true});
  });
}

/* --- Barre latérale : les Apps activées --- */
function renderAppNav(){
  const box = document.getElementById('appNav'); if (!box) return;
  const apps = modsOff() ? [] : S.store.installed.filter(m => m.type === 'app' && modOn(m.id));
  box.innerHTML = apps.map(m => `<button data-nav="app:${esc(m.id)}" ${m.icon ? '' : 'data-ic="apps"'} title="${esc(m.name)}">${m.icon ? `<img class="mod-ic" src="/mods/${encodeURIComponent(m.id)}/${esc(m.icon)}" alt="">` : ''}<span class="lbl">${esc(m.name)}</span></button>`).join(''); injectIcons(box);
}

/* --- Page du Store --- */
const swatch = (c = []) => c.length > 1 ? `linear-gradient(135deg,${c.join(',')})` : c.length ? c[0] : 'linear-gradient(135deg,#1c1c24,#2a2a36)';
function modCard(e, installedView){
  const m = modOf(e.id), on = modOn(e.id), busy = S.store.busy[e.id], P = PERM_TEXT();
  const older = !!(m && e.version && m.version !== e.version), TL = {theme:L('Theme', 'Thème'), extension:L('Extension', 'Extension'), app:'App'};
  const opts = m && (m.options || []).length;
  let act;
  if (busy) act = `<button class="btn sm" disabled>${L('Installing…', 'Installation…')}</button>`;
  else if (!m) act = `<button class="btn sm" data-st="install" data-id="${esc(e.id)}">${ic('download')}${L('Install', 'Installer')}</button>`;
  else act = `${older ? `<button class="btn sm" data-st="install" data-id="${esc(e.id)}">${L('Update', 'Mettre à jour')}</button>` : ''}
    ${e.type === 'app' ? `<button class="ghost sm" data-st="open" data-id="${esc(e.id)}" ${on ? '' : 'disabled'}>${L('Open', 'Ouvrir')}</button>` : ''}
    <button class="ghost sm ${on ? 'on' : ''}" data-st="${on ? 'disable' : 'enable'}" data-id="${esc(e.id)}" aria-pressed="${on}">${on ? L('Active', 'Actif') : e.type === 'theme' ? L('Apply', 'Appliquer') : L('Enable', 'Activer')}</button>
    ${opts ? `<button class="ghost sm" data-st="options" data-id="${esc(e.id)}" aria-label="${L('Options', 'Options')} ${esc(e.name)}">${ic('tune')}${L('Options', 'Options')}</button>` : ''}
    <button class="ghost sm warn" data-st="remove" data-id="${esc(e.id)}" aria-label="${L('Remove', 'Retirer')} ${esc(e.name)}">${ic('trash')}</button>`;
  return `<li class="stcard ${on ? 'on' : ''}"><div class="stprev" style="background:${esc(swatch(e.preview))}">${e.thumb ? `<img class="stthumb" src="/api/store/thumb/${encodeURIComponent(e.id)}?v=${encodeURIComponent(e.version)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="sttype">${TL[e.type] || e.type}</span>${e.builtin ? `<span class="stbuilt">${L('Included', 'Inclus')}</span>` : ''}</div>
    <div class="stbody"><b data-notr>${e.icon ? `<img class="stic" src="/mods/${encodeURIComponent(e.id)}/${esc(e.icon)}" alt="" onerror="this.remove()">` : ''}${esc(e.name)}</b><small data-notr>${L('by', 'par')} ${esc(e.author)} · v${esc(e.version)}</small><p data-notr>${esc(e.description || '')}</p>
    ${(e.permissions || []).length ? `<div class="stperms">${e.permissions.map(p => `<span title="${esc(P[p] || p)}">${esc(P[p] || p)}</span>`).join('')}</div>` : ''}</div><div class="stact">${act}</div></li>`;
}
function storeItems(){
  const T = S.store, q = fold(T.q.trim());
  let list = T.tab === 'installed' ? T.installed.map(m => T.items.find(e => e.id === m.id) || {...m, builtin:false, files:[]}) : T.items;
  if (T.type !== 'all') list = list.filter(e => e.type === T.type);
  if (q) list = list.filter(e => fold([e.name, e.author, e.description, ...(e.tags || [])].join(' ')).includes(q));
  return list;
}
function renderStoreGrid(){ const g = document.getElementById('stgrid'); if (g) { g.innerHTML = storeGridHtml(); injectIcons(g); } }
function storeGridHtml(){
  const T = S.store; if (T.loading && !T.items.length) return `<p class="sub">${L('Loading the catalog…', 'Chargement du catalogue…')}</p>`;
  const list = storeItems();
  return list.length ? `<ul class="stgrid">${list.map(e => modCard(e)).join('')}</ul>` : `<p class="empty">${T.tab === 'installed' ? L('Nothing installed yet. Open Discover to add themes and Apps.', 'Rien d’installé pour le moment. Ouvre Découvrir pour ajouter des thèmes et des Apps.') : L('Nothing matches.', 'Aucun résultat.')}</p>`;
}
function createTabHtml(){
  const T = S.store;
  return `<div class="stcreate"><section class="stsec"><h4>${L('Custom CSS', 'CSS personnalisé')}</h4><p class="hint">${L('Restyle anything. Same rules as themes: no @import and no external addresses.', 'Change l’apparence de ce que tu veux. Mêmes règles que les thèmes : pas d’@import ni d’adresse externe.')}</p>
      <textarea id="customCss" class="input stcss" spellcheck="false" placeholder=":root { --radius: 20px; }" aria-label="${L('Custom CSS', 'CSS personnalisé')}">${esc(S.settings.customCss || '')}</textarea>
      <p class="merr" id="cssErr" role="alert">${esc(T.cssError)}</p>
      <div class="head-actions"><button class="btn" data-st="csssave">${L('Apply', 'Appliquer')}</button><button class="ghost" data-st="cssclear">${L('Clear', 'Effacer')}</button></div></section>
    <section class="stsec"><h4>${L('Share your look', 'Partager ton style')}</h4><p class="hint">${L('Export your current colors, background and CSS as a .saturne file, or add a file someone sent you.', 'Exporte tes couleurs, ton fond et ton CSS dans un fichier .saturne, ou ajoute un fichier qu’on t’a envoyé.')}</p>
      <div class="head-actions"><button class="btn" data-st="export">${ic('download')}${L('Export my theme', 'Exporter mon thème')}</button><button class="ghost" data-st="import">${ic('upload')}${L('Add a .saturne file', 'Ajouter un fichier .saturne')}</button></div>
      <p class="hint">${L('To publish it in the Store, follow the guide:', 'Pour le publier dans le Store, suis le guide :')} <a href="https://github.com/KYOO-DEVV/saturne/blob/main/STORE.md" target="_blank" rel="noopener">STORE.md</a></p></section>
    <section class="stsec"><h4>${L('Safe mode', 'Mode sans mods')}</h4><p class="hint">${L('Turns off every theme, App and custom CSS (nothing is deleted). Use it if something breaks.', 'Désactive tous les thèmes, Apps et le CSS personnalisé (rien n’est supprimé). À utiliser si quelque chose ne marche plus.')}</p>
      <button class="ghost" data-st="${safeMode() ? 'safeoff' : 'safeon'}">${safeMode() ? L('Turn mods back on', 'Réactiver les mods') : L('Turn mods off', 'Désactiver les mods')}</button></section></div>`;
}
function storeHtml(){
  const T = S.store, tab = (k, n) => `<button data-st="tab" data-tab="${k}" class="${T.tab === k ? 'on' : ''}" role="tab" aria-selected="${T.tab === k}">${n}</button>`;
  const typ = (k, n) => `<button data-st="type" data-type="${k}" class="${T.type === k ? 'on' : ''}">${n}</button>`;
  return `<div class="pagehead"><p class="eyebrow">Store</p><h1>Store</h1><p class="sub">${L('Themes, extensions and Apps made by the community. Everything is optional: Saturne works the same without.', 'Thèmes, extensions et Apps faits par la communauté. Tout est facultatif : Saturne marche pareil sans.')}</p></div>
    ${modsOff() ? `<div class="stbanner">${ic('shield')}<span>${L('Safe mode is on: themes, Apps and custom CSS are turned off.', 'Le mode sans mods est actif : thèmes, Apps et CSS personnalisé sont désactivés.')}</span><button class="ghost sm" data-st="safeoff">${L('Turn mods back on', 'Réactiver les mods')}</button></div>` : ''}
    ${T.remoteError ? `<div class="stbanner soft">${ic('info')}<span>${L('The community catalog is not reachable right now. The included themes and Apps still work. ', 'Le catalogue de la communauté est injoignable pour le moment. Les thèmes et Apps inclus fonctionnent toujours. ')}<small data-notr>${esc(T.remoteError)}</small></span><button class="ghost sm" data-st="refresh">${L('Retry', 'Réessayer')}</button></div>` : ''}
    <div class="sttabs" role="tablist">${tab('discover', L('Discover', 'Découvrir'))}${tab('installed', L('Installed', 'Installés') + (T.installed.length ? ` (${T.installed.length})` : ''))}${tab('create', L('Create', 'Créer'))}</div>
    ${T.tab === 'create' ? createTabHtml() : `<div class="stbar"><div class="search"><span>${ic('search')}</span><input id="stQ" type="search" placeholder="${L('Search the Store', 'Chercher dans le Store')}" aria-label="${L('Search the Store', 'Chercher dans le Store')}" value="${esc(T.q)}" autocomplete="off"></div>
      <div class="seg" role="group">${typ('all', L('All', 'Tout'))}${typ('theme', L('Themes', 'Thèmes'))}${typ('extension', L('Extensions', 'Extensions'))}${typ('app', 'Apps')}</div></div><div id="stgrid">${storeGridHtml()}</div>
      <p class="hint stlegal">${L('Community creations are made by third parties and reviewed before they are listed; Saturne is not responsible for them. Themes only change the look. Apps run in an isolated frame with only the permissions they declare.', 'Les créations de la communauté sont faites par des tiers et relues avant d’être listées ; Saturne n’en est pas responsable. Les thèmes ne changent que l’apparence. Les Apps tournent dans un cadre isolé avec seulement les permissions déclarées.')}</p>`}`;
}
async function loadStore(force){
  const T = S.store; if (T.loading || (T.loaded && !force)) return; T.loading = true; T.error = '';
  try { const j = await http('/api/store/index'); T.items = j.items || []; T.remoteError = j.remoteError || ''; T.registry = j.registry || ''; T.loaded = true; }
  catch (e) { T.error = errText(e); T.loaded = false; }
  T.loading = false; if (S.view.type === 'store') renderView();
}

/* --- Page d'une App : iframe isolée --- */
function appPageHtml(id){
  const m = modOf(id);
  if (!m || m.type !== 'app' || !modOn(id) || modsOff()) return `<div class="pagehead"><p class="eyebrow">App</p><h1>${L('App unavailable', 'App indisponible')}</h1></div><p class="empty">${L('This App is not installed or is turned off.', 'Cette App n’est pas installée ou est désactivée.')}</p><button class="btn" data-go="store">${L('Open the Store', 'Ouvrir le Store')}</button>`;
  return `<div class="apphead"><div><p class="eyebrow">App</p><h1 data-notr>${esc(m.name)}</h1><small data-notr>${L('by', 'par')} ${esc(m.author)} · v${esc(m.version)}</small></div>
    <div class="head-actions">${(m.permissions || []).map(p => `<span class="chip sm" title="${esc(PERM_TEXT()[p] || p)}">${esc(PERM_TEXT()[p] || p)}</span>`).join('')}<button class="ghost sm" data-st="reload">${ic('refresh')}${L('Reload', 'Recharger')}</button></div></div>
    <iframe class="appframe" data-app="${esc(id)}" sandbox="allow-scripts" referrerpolicy="no-referrer" src="/mods/${encodeURIComponent(id)}/_frame.html" title="${esc(m.name)}"></iframe>`;
}
function afterStore(){ if (S.view.type === 'store' && !S.store.loaded && !S.store.loading) loadStore(); }

/* --- Pont postMessage entre Saturne et les Apps --- */
const THEME_VARS = ['--bg', '--panel', '--raise', '--raise2', '--line', '--line2', '--fg', '--fg2', '--mute', '--faint', '--hi', '--accent', '--accent-hi', '--accent-soft', '--on-accent', '--font'];
const frameOf = () => document.querySelector('iframe.appframe');
function toFrame(f, msg){ try { f.contentWindow.postMessage({saturne:1, ...msg}, '*'); } catch {} }
function pushTheme(){
  const f = frameOf(); if (!f) return; const cs = getComputedStyle(document.documentElement), vars = {};
  THEME_VARS.forEach(k => { const v = cs.getPropertyValue(k).trim(); if (v) vars[k] = v; });
  toFrame(f, {event:'theme', data:{vars, light:document.documentElement.dataset.bg === 'light'}});
}
const _applyTheme = applyTheme; applyTheme = function(){ _applyTheme(); pushTheme(); };
const playerSnapshot = () => { const c = current(); let pos = 0, dur = 0; try { if (ready) { pos = player.getCurrentTime() || 0; dur = player.getDuration() || 0; } } catch {} return {track:c ? {id:c.id, title:c.title, channel:c.channel} : null, playing:!!playing, position:Math.round(pos), duration:Math.round(dur)}; };
const modCalls = {};
async function modCall(m, method, a){
  const has = p => (m.permissions || []).includes(p), need = p => { if (!has(p)) throw new Error(`Permission « ${p} » non accordée`); };
  const key = k => { if (!/^[\w.-]{1,40}$/.test(String(k))) throw new Error('Clé invalide'); return `saturne.mod.${m.id}.${k}`; };
  switch (method) {
    case 'hello': pushTheme(); return true;
    case 'ui.toast': toast(`${m.name} : ${String(a[0] ?? '').slice(0, 140)}`); return true;
    case 'player.current': need('player.read'); return playerSnapshot().track;
    case 'player.state': need('player.read'); return playerSnapshot();
    case 'player.play': need('player.control'); if (ready && current() && player.getPlayerState() !== 1) player.playVideo(); return true;
    case 'player.pause': need('player.control'); if (ready && player.getPlayerState() === 1) player.pauseVideo(); return true;
    case 'player.next': need('player.control'); next(false); return true;
    case 'player.prev': need('player.control'); prev(); return true;
    case 'queue.add': { need('queue.add'); const t = a[0] || {}; if (!/^[\w-]{11}$/.test(String(t.id))) throw new Error('Identifiant YouTube invalide'); addToQueue({id:t.id, title:String(t.title || '').slice(0, 150) || t.id, channel:String(t.channel || '').slice(0, 80), channelId:'', thumb:`https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`}); return true; }
    case 'search': { need('search'); const q = String(a[0] || '').trim().slice(0, 100); if (!q) return []; return ((await api('search', {q})).items || []).slice(0, 20).map(slim); }
    case 'storage.get': { need('storage'); try { return localStorage.getItem(key(a[0])); } catch { return null; } }
    case 'storage.set': { need('storage'); const v = String(a[1] ?? ''); if (v.length > 100000) throw new Error('Valeur trop grande (100 Ko)'); try { localStorage.setItem(key(a[0]), v); } catch { throw new Error('Stockage indisponible'); } return true; }
    case 'storage.remove': { need('storage'); try { localStorage.removeItem(key(a[0])); } catch {} return true; }
    default: throw new Error('Méthode inconnue');
  }
}
window.addEventListener('message', async e => {
  const f = frameOf(); if (!f || e.source !== f.contentWindow) return;
  const d = e.data; if (!d || d.saturne !== 1 || typeof d.method !== 'string') return;
  const m = modOf(f.dataset.app); if (!m || !modOn(m.id) || modsOff()) return;
  const now = Date.now(), c = modCalls[m.id] = (modCalls[m.id] || []).filter(t => now - t < 1000); c.push(now);
  try { if (c.length > 60) throw new Error('Trop d’appels'); toFrame(f, {id:d.id, result:await modCall(m, d.method, Array.isArray(d.args) ? d.args : [])}); }
  catch (er) { toFrame(f, {id:d.id, error:String(er && er.message || er).slice(0, 200)}); }
});
setInterval(() => { const f = frameOf(); if (!f || S.view.type !== 'app') return; const m = modOf(f.dataset.app); if (m && (m.permissions || []).includes('player.read') && !document.hidden) toFrame(f, {event:'player', data:playerSnapshot()}); }, 1000);

/* --- Export / import d'un thème (.saturne) --- */
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'mon-theme';
function exportTheme(){
  formModal({title:L('Export my theme', 'Exporter mon thème'), lead:L('Your colors, background settings and custom CSS go into one .saturne file.', 'Tes couleurs, réglages de fond et ton CSS personnalisé vont dans un seul fichier .saturne.'),
    fields:[{id:'tName', label:L('NAME', 'NOM'), max:60, ph:L('My theme', 'Mon thème')}, {id:'tDesc', label:L('DESCRIPTION', 'DESCRIPTION'), max:300, ph:L('A few words', 'Quelques mots')}], submit:L('Download', 'Télécharger'),
    run:v => {
      const name = (v.tName || '').trim(); if (!name) throw new Error(L('Give it a name', 'Donne-lui un nom'));
      const T = S.settings, set = {}; for (const k of Object.keys(MOD_KEYS)) if (k !== 'bgImage' && k in T && MOD_KEYS[k](T[k])) set[k] = T[k];
      const css = (S.settings.customCss || '').trim(); const bad = css && cssProblem(css); if (bad) throw new Error(bad);
      const root = getComputedStyle(document.documentElement), acc = root.getPropertyValue('--accent').trim();
      const manifest = {id:slug(name), name, author:S.user.display, version:'1.0.0', type:'theme', description:(v.tDesc || '').trim(), preview:[BG_THEMES[T.bg] || '#000000', hexOk(acc) ? acc : '#7c3aed']};
      const files = {'manifest.json':JSON.stringify(manifest, null, 2) + '\n', 'settings.json':JSON.stringify(set, null, 2) + '\n', 'theme.css':(css || '/* ' + name + ' */') + '\n'};
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({format:'saturne-package', files}, null, 2)], {type:'application/json'})); a.download = manifest.id + '.saturne'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      closeModal(); toast(L('Exported: ', 'Exporté : ') + a.download);
    }});
}
async function importPackage(file){
  try {
    const obj = JSON.parse(await file.text()); if (!obj || obj.format !== 'saturne-package' || typeof obj.files !== 'object') throw new Error(L('This is not a .saturne file', 'Ce n’est pas un fichier .saturne'));
    const j = await send('/api/store/import', {files:obj.files}); S.store.installed = j.items || [];
    await enableMod(j.id); renderView(); toast(L('Added and applied: ', 'Ajouté et appliqué : ') + j.id);
  } catch (e) { toast(e.message || L('Import failed', 'Import impossible')); }
}
document.body.insertAdjacentHTML('beforeend', '<input type="file" id="pkgPick" accept=".saturne,application/json,.json" hidden>');
$('#pkgPick').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importPackage(f); });

/* --- Clics et saisie --- */
$('#view').addEventListener('click', async e => {
  const b = e.target.closest('[data-st]'); if (!b) return; const k = b.dataset.st, id = b.dataset.id, T = S.store;
  if (k === 'tab') { T.tab = b.dataset.tab; renderView(); }
  else if (k === 'type') { T.type = b.dataset.type; renderView(); }
  else if (k === 'refresh') { T.loaded = false; loadStore(true); }
  else if (k === 'install') installMod(id);
  else if (k === 'enable') { await enableMod(id); renderView(); }
  else if (k === 'disable') { await disableMod(id); }
  else if (k === 'open') go({type:'app', id});
  else if (k === 'options') openOptions(id);
  else if (k === 'remove') { const m = modOf(id); openModal(`<h3>${L('Remove this creation?', 'Retirer cette création ?')}</h3><p><b>${esc(m ? m.name : id)}</b></p><p class="hint">${L('Your settings from before it was applied are restored.', 'Tes réglages d’avant son application sont restaurés.')}</p><div class="mactions"><button class="ghost" data-mclose>${L('Cancel', 'Annuler')}</button><button class="btn" style="background:#e11d48" id="rmYes">${L('Remove', 'Retirer')}</button></div>`, mm => { mm.querySelector('#rmYes').onclick = () => { closeModal(); removeMod(id); }; }); }
  else if (k === 'reload') { const f = frameOf(); if (f) f.src = f.src; }
  else if (k === 'csssave') { const css = $('#customCss').value, bad = cssProblem(css); T.cssError = bad; $('#cssErr').textContent = bad; if (bad) return; S.settings.customCss = css; applyMods(); save(); toast(L('CSS applied', 'CSS appliqué')); }
  else if (k === 'cssclear') { S.settings.customCss = ''; T.cssError = ''; applyMods(); save(); renderView(); }
  else if (k === 'export') exportTheme();
  else if (k === 'import') $('#pkgPick').click();
  else if (k === 'safeon') { setSafe(true); location.reload(); }
  else if (k === 'safeoff') { setSafe(false); location.reload(); }
});
$('#view').addEventListener('input', e => { if (e.target.id === 'stQ') { S.store.q = e.target.value; renderStoreGrid(); } });
document.getElementById('nav').addEventListener('click', e => { const b = e.target.closest('[data-nav^="app:"]'); if (b) { e.stopImmediatePropagation(); go({type:'app', id:b.dataset.nav.slice(4)}); } }, true);
