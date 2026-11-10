/* ---------- Accessibilité ---------- */
let modalReturn = null, menuOpener = null;
$('#modal').addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = [...$('#mbox').querySelectorAll('button:not([disabled]),input,textarea,select,a[href]')].filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1], a = document.activeElement;
  if (!$('#mbox').contains(a) || (e.shiftKey && a === first)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
});
$('#menu').addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const items = [...$('#menu').querySelectorAll('button:not([disabled])')]; if (!items.length) return;
  e.preventDefault(); const i = items.indexOf(document.activeElement);
  items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
});
document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); const v = $('#view'); v.focus(); });

