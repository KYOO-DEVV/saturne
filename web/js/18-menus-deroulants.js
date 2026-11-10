/* ---------- Menus déroulants ---------- */
const SORT_OPTS = [['added', 'Recently Added'], ['played', 'Recently Played'], ['name', 'Name'], ['size', 'Most songs']];
const DD = {
  lang:{opts:() => [['fr', 'Français'], ['en', 'English']], value:() => LANG, set:v => { S.settings.lang = v; applyLang(v); save(); render(); }},
  sort:{opts:() => SORT_OPTS, value:() => S.lib.sort, set:v => { S.lib.sort = v; renderView(); }},
  region:{opts:() => Object.entries(COUNTRIES), value:() => S.cc, set:v => { S.cc = v; save(); toast('Région : ' + COUNTRIES[v]); renderView(); }}
};
const dd = (key, label) => { const d = DD[key], o = d.opts(), cur = o.find(x => x[0] === d.value()) || o[0]; return `<button class="dd-btn" data-dd="${key}" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(label)}"><span>${esc(cur[1])}</span>${ic('chevd')}</button>`; };
let ddOpen = null;
function closeDD(refocus){
  if (!ddOpen) return;
  $('#ddmenu').hidden = true; ddOpen.btn.setAttribute('aria-expanded', 'false'); if (refocus) ddOpen.btn.focus(); ddOpen = null;
}
function openDD(btn){
  closeDD(); const d = DD[btn.dataset.dd], m = $('#ddmenu'), cur = d.value();
  m.innerHTML = d.opts().map(([v, n]) => `<button role="option" data-val="${esc(v)}" aria-selected="${v === cur}" class="${v === cur ? 'sel' : ''}"><span>${esc(n)}</span>${v === cur ? ic('check') : ''}</button>`).join('');
  m.hidden = false; btn.setAttribute('aria-expanded', 'true'); ddOpen = {btn, key:btn.dataset.dd};
  const r = btn.getBoundingClientRect(); m.style.minWidth = r.width + 'px';
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  m.style.top = (r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  (m.querySelector('.sel') || m.firstElementChild).focus();
}
$('#ddmenu').addEventListener('click', e => { const o = e.target.closest('[data-val]'); if (!o || !ddOpen) return; const key = ddOpen.key; closeDD(true); DD[key].set(o.dataset.val); });
$('#ddmenu').addEventListener('keydown', e => {
  const items = [...$('#ddmenu').children], i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  else if (e.key === 'Escape') { e.stopPropagation(); closeDD(true); }
  else if (e.key === 'Tab') closeDD();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-dd]');
  if (b) { e.stopPropagation(); return ddOpen && ddOpen.btn === b ? closeDD() : openDD(b); }
  if (ddOpen && !e.target.closest('#ddmenu')) closeDD();
}, true);
document.addEventListener('keydown', e => { if (e.key === 'ArrowDown' && e.target.matches && e.target.matches('[data-dd]') && !ddOpen) { e.preventDefault(); openDD(e.target); } });

