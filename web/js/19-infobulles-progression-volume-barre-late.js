/* ---------- Infobulles (progression, volume, barre latérale repliée) ---------- */
function showTip(x, y, text, side){ const t = $('#tip'); t.textContent = text; t.dataset.side = side || 'top'; t.style.left = x + 'px'; t.style.top = y + 'px'; t.hidden = false; }
const hideTip = () => { $('#tip').hidden = true; };
seek.addEventListener('mousemove', e => { const r = seek.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); showTip(e.clientX, r.top - 6, fmt(p * (+seek.max || 0)), 'top'); });
seek.addEventListener('mouseleave', hideTip);
let volTipTimer = 0;
const showVolTip = () => { const r = vol.getBoundingClientRect(); showTip(r.left + 6.5 + (S.volume / 100) * (r.width - 13), r.top - 6, S.muted ? 'Muet' : S.volume + '%', 'top'); };
vol.addEventListener('input', () => { showVolTip(); clearTimeout(volTipTimer); volTipTimer = setTimeout(hideTip, 1200); });
vol.addEventListener('mouseenter', showVolTip); vol.addEventListener('mouseleave', hideTip);
$('#side').addEventListener('mouseover', e => {
  if (!S.collapsed || innerWidth <= 900) return;
  const el = e.target.closest('.nav button, .pli, .account'); if (!el) return;
  const r = el.getBoundingClientRect();
  showTip(r.right + 10, r.top + r.height / 2, el.classList.contains('account') ? $('#accName').textContent : (el.dataset.tip || el.title || el.textContent.trim()), 'right');
});
$('#side').addEventListener('mouseout', e => { if (e.target.closest('.nav button, .pli, .account')) hideTip(); });
$('#side').addEventListener('scroll', hideTip, true);

