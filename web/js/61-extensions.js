/* ---------- 0.8.0 : extensions : options réglables, décors animés (GIF/images posés sur l'interface), repères CSS ---------- */
/* Une extension n'exécute aucun JavaScript dans Saturne : elle DÉCRIT (manifest.json) ce qu'elle veut afficher, et Saturne le dessine.
   - options  : réglages proposés à l'utilisateur ; chacun devient une variable CSS --x-<id>-<option> et un attribut data-x-<id>-<option> sur <html>
   - decor    : images/GIF accrochés à une partie de l'interface (barre de progression, bouton lecture, pochette…) avec un comportement
   - repères  : <html data-view data-playing>, --seek-pct, --cover-img, --track-color, à utiliser dans theme.css */
const modOpts = () => S.settings.modsOpts && typeof S.settings.modsOpts === 'object' && !Array.isArray(S.settings.modsOpts) ? S.settings.modsOpts : {};
function optValue(m, o){
  const v = (modOpts()[m.id] || {})[o.id];
  switch (o.type) {
    case 'toggle': return typeof v === 'boolean' ? v : !!o.default;
    case 'range': { const n = Number(v); return v !== undefined && Number.isFinite(n) && n >= o.min && n <= o.max ? n : o.default; }
    case 'color': return hexOk(v) ? v : o.default;
    case 'choice': return (o.choices || []).some(c => c.value === v) ? v : o.default;
    case 'image': return typeof v === 'string' && /^\/media\/[\w.]+$/.test(v) ? v : '';
  }
  return '';
}
const activeLooks = () => modsOff() ? [] : S.store.installed.filter(m => m.type !== 'app' && modOn(m.id));
let appliedOpts = [];
function applyOptions(){
  const root = document.documentElement, next = [];
  for (const m of activeLooks()) for (const o of (m.options || [])) {
    const v = optValue(m, o), name = `${m.id}-${o.id}`, cssv = o.type === 'range' ? `${v}${o.unit || ''}` : o.type === 'toggle' ? (v ? '1' : '0') : o.type === 'image' ? (v ? `url("${v}")` : 'none') : String(v);
    root.style.setProperty(`--x-${name}`, cssv); root.setAttribute(`data-x-${name}`, o.type === 'toggle' ? (v ? '1' : '0') : String(v));
    next.push(name);
  }
  for (const name of appliedOpts) if (!next.includes(name)) { root.style.removeProperty(`--x-${name}`); root.removeAttribute(`data-x-${name}`); }
  appliedOpts = next;
}
function setOpt(id, opt, value){ S.settings.modsOpts = {...modOpts(), [id]:{...(modOpts()[id] || {}), [opt]:value}}; applyOptions(); renderDecor(); save(); }

/* --- Fenêtre d'options --- */
function optControl(m, o){
  const v = optValue(m, o), id = esc(o.id);
  if (o.type === 'toggle') return `<button class="switch" role="switch" data-opt="${id}" data-ot="toggle" aria-checked="${v}" aria-label="${esc(o.label)}"></button>`;
  if (o.type === 'range') return `<span class="optr"><input type="range" data-opt="${id}" data-ot="range" min="${o.min}" max="${o.max}" step="${o.step}" value="${v}" aria-label="${esc(o.label)}"><b data-optv="${id}">${v}${esc(o.unit || '')}</b></span>`;
  if (o.type === 'color') return `<input type="color" data-opt="${id}" data-ot="color" value="${esc(v)}" aria-label="${esc(o.label)}">`;
  if (o.type === 'choice') return `<div class="seg" role="group" aria-label="${esc(o.label)}">${o.choices.map(c => `<button data-opt="${id}" data-ot="choice" data-val="${esc(c.value)}" class="${c.value === v ? 'on' : ''}">${esc(c.label)}</button>`).join('')}</div>`;
  return `<span class="optimg">${v ? `<img src="${esc(v)}" alt="">` : ''}<button class="ghost sm" data-opt="${id}" data-ot="imgpick">${ic('image')}${v ? L('Change', 'Changer') : L('Choose an image', 'Choisir une image')}</button>${v ? `<button class="ghost sm" data-opt="${id}" data-ot="imgclear" aria-label="${L('Remove', 'Retirer')}">${ic('close')}</button>` : ''}</span>`;
}
let optModId = '';
function openOptions(id){
  const m = modOf(id); if (!m) return; optModId = id;
  openModal(`<h3>${esc(m.name)}</h3><p>${L('Changes apply right away.', 'Les changements s’appliquent tout de suite.')}</p><div class="optlist">${(m.options || []).map(o => `<div class="optrow"><label data-notr>${esc(o.label)}</label>${optControl(m, o)}</div>`).join('')}</div>
    <div class="mactions"><button class="ghost" data-st2="optreset">${L('Reset', 'Réinitialiser')}</button><button class="btn" data-mclose>${L('Done', 'Terminé')}</button></div>`);
}
const optOf = k => { const m = modOf(optModId); return m && (m.options || []).find(o => o.id === k); };
$('#mbox').addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.opt) return; const o = optOf(t.dataset.opt); if (!o) return;
  if (o.type === 'range') { setOpt(optModId, o.id, +t.value); const b = $('#mbox').querySelector(`[data-optv="${o.id}"]`); if (b) b.textContent = t.value + (o.unit || ''); }
  else if (o.type === 'color') setOpt(optModId, o.id, t.value);
});
$('#mbox').addEventListener('click', async e => {
  const reset = e.target.closest('[data-st2="optreset"]'); if (reset) { const all = {...modOpts()}; delete all[optModId]; S.settings.modsOpts = all; applyOptions(); renderDecor(); save(); return openOptions(optModId); }
  const b = e.target.closest('[data-opt]'); if (!b) return; const o = optOf(b.dataset.opt); if (!o) return;
  if (b.dataset.ot === 'toggle') { setOpt(optModId, o.id, b.getAttribute('aria-checked') !== 'true'); openOptions(optModId); }
  else if (b.dataset.ot === 'choice') { setOpt(optModId, o.id, b.dataset.val); openOptions(optModId); }
  else if (b.dataset.ot === 'imgpick') { optPickFor = o.id; $('#optPick').click(); }
  else if (b.dataset.ot === 'imgclear') { setOpt(optModId, o.id, ''); openOptions(optModId); }
});
let optPickFor = '';
document.body.insertAdjacentHTML('beforeend', '<input type="file" id="optPick" accept="image/png,image/jpeg,image/gif,image/webp" hidden>');
$('#optPick').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !optPickFor) return;
  try {
    if (f.size > 8 * 1024 * 1024) throw new Error(L('This image is over 8 MB', 'Cette image dépasse 8 Mo'));
    const url = await storeGif(f); if (!/^\/media\/[\w.]+$/.test(url)) throw new Error(L('Could not save this image', 'Impossible d’enregistrer cette image'));
    setOpt(optModId, optPickFor, url); openOptions(optModId);
  } catch (er) { toast(er.message || L('Could not read this image', 'Impossible de lire cette image')); }
});

/* --- Décors : images/GIF posés sur l'interface, sans aucun script de l'extension --- */
let decorEls = [];
function decorLayer(){ let l = document.getElementById('decor'); if (!l) { l = document.createElement('div'); l.id = 'decor'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); } return l; }
function renderDecor(){
  const l = decorLayer(); l.innerHTML = ''; decorEls = [];
  for (const m of activeLooks()) for (const d of (m.decor || [])) {
    let src = '';
    if (String(d.image).startsWith('option:')) { const o = (m.options || []).find(x => x.id === d.image.slice(7)); src = o ? optValue(m, o) : ''; }
    else src = `/mods/${encodeURIComponent(m.id)}/${d.image}`;
    if (!src) continue;
    const img = document.createElement('img'); img.className = `dc dc-${d.behavior || 'none'} dc-${d.layer === 'below' ? 'below' : 'above'}`; img.src = src; img.alt = ''; img.draggable = false;
    if (d.flip) img.style.setProperty('--fx', '-1'); if (typeof d.opacity === 'number') img.style.opacity = d.opacity;
    l.appendChild(img); decorEls.push({img, d, m});
  }
  placeDecor();
}
function decorSize(m, d){
  if (typeof d.size === 'number') return d.size;
  if (typeof d.size === 'string' && d.size.startsWith('option:')) { const o = (m.options || []).find(x => x.id === d.size.slice(7)); if (o) return +optValue(m, o) || 32; }
  return 32;
}
const ANCHOR_EL = {seekbar:'#seek', playbtn:'#bPlay', cover:'#nowImg', bar:'#bar', side:'#side'};
function anchorRect(a){
  if (a === 'corner') return {left:0, top:0, width:innerWidth, height:innerHeight};
  const el = document.querySelector(ANCHOR_EL[a]); if (!el) return null;
  const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null;
}
function placeDecor(){
  if (!decorEls.length) return;
  const seek = $('#seek'), pct = seek && +seek.max > 0 ? Math.min(1, Math.max(0, +seek.value / +seek.max)) : 0;
  for (const {img, d, m} of decorEls) {
    const s = decorSize(m, d), r = anchorRect(d.anchor), hide = !r || (d.when === 'playing' && !playing) || !!$('#app').hidden;
    img.style.display = hide ? 'none' : ''; if (hide) continue;
    const dx = d.x || 0, dy = d.y || 0; let left, top;
    if (d.anchor === 'seekbar') { left = r.left + r.width * (d.behavior === 'follow' ? pct : .5) - s / 2 + dx; top = r.top + r.height / 2 - (d.valign === 'center' ? s / 2 : s) + dy; } // « sit » (défaut) : posé sur la barre ; « center » : centré sur la barre
    else if (d.anchor === 'corner') { const b = $('#bar').getBoundingClientRect(); left = r.width - s - 20 + dx; top = (b.height ? b.top : r.height) - s - 10 + dy; }
    else { left = r.left + r.width / 2 - s / 2 + dx; top = r.top + r.height / 2 - s / 2 + dy; }
    img.style.width = img.style.height = s + 'px'; img.style.transform = ''; img.style.left = Math.round(left) + 'px'; img.style.top = Math.round(top) + 'px';
  }
}

/* --- Repères pour theme.css : <html data-view data-playing>, --seek-pct, --cover-img, --track-color --- */
const hook = {};
function hostHooks(){
  const root = document.documentElement, put = (k, v) => { if (hook[k] === v) return; hook[k] = v; if (k.startsWith('data-')) root.setAttribute(k, v); else root.style.setProperty(k, v); };
  put('data-view', String(S.view.type)); put('data-playing', playing ? '1' : '0');
  const seek = $('#seek'); put('--seek-pct', (seek && +seek.max > 0 ? +seek.value / +seek.max * 100 : 0).toFixed(1) + '%');
  const t = current(), url = t ? `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg` : '';
  put('--cover-img', url ? `url("${url}")` : 'none');
  if (url !== hook.coverUrl) { hook.coverUrl = url; if (url) coverColor(url).then(c => { if (hook.coverUrl === url) put('--track-color', c ? toneOf(c, 175) : 'transparent'); }); else put('--track-color', 'transparent'); }
}
setInterval(() => { hostHooks(); placeDecor(); }, 250);
window.addEventListener('resize', placeDecor);
