/* ---------- Liste : « Afficher plus » et allègement des longues listes ---------- */
const capOf = src => S.cap[src] || 120;
const moreItems = (l, src) => l.length > capOf(src) ? `<div class="loadmore"><button class="ghost" data-act="showmore" data-src="${src}">${L('Show more', 'Afficher plus')} (${l.length - capOf(src)})</button></div>` : '';
const moreBtn = (R, kind) => R.next ? `<div class="loadmore"><button class="ghost" data-act="loadmore" data-kind="${kind}" ${R.more ? 'disabled' : ''}>${R.more ? L('Loading…', 'Chargement…') : L('Show more results', 'Afficher plus de résultats')}</button></div>` : '';
const fetchPage = (q, gl) => api('search', {type:'video', q, gl:gl || ''});
async function loadMore(kind){
  const R = kind === 'search' ? S.search : S.list; if (!R.next || R.more) return;
  R.more = true; renderView();
  try {
    const j = await api('more', {t:R.next.t, k:R.next.k, v:R.next.v, gl:kind === 'search' ? S.cc : (R.cc || S.cc)}), seen = new Set(R.tracks.map(t => t.id));
    R.tracks.push(...j.items.filter(t => !seen.has(t.id))); R.next = j.next;
    if (!j.items.length) R.next = null;
  } catch (e) { toast(errText(e)); }
  R.more = false; if ((kind === 'search' ? S.search : S.list) === R) renderView();
}
/* Met à jour la surbrillance du titre en cours sans redessiner la page. */
function markPlaying(){
  const c = current();
  document.querySelectorAll('#view ul[data-src]').forEach(ul => {
    const l = tracksOf(ul.dataset.src);
    ul.querySelectorAll(':scope > [data-i]').forEach(li => { const t = l[+li.dataset.i]; li.classList.toggle('on', !!(c && t && t.id === c.id)); });
  });
}

