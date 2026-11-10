/* ---------- Étagères : flèches (les barres de défilement sont masquées) ---------- */
function updShelf(ul){
  const w = ul.parentElement, l = w && w.querySelector('.sarrow.l'), r = w && w.querySelector('.sarrow.r'); if (!l || !r) return;
  l.hidden = ul.scrollLeft < 8; r.hidden = ul.scrollLeft + ul.clientWidth >= ul.scrollWidth - 8;
}
$('#view').addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('shelf')) updShelf(e.target); }, true);
addEventListener('resize', () => document.querySelectorAll('.shelf').forEach(updShelf));

