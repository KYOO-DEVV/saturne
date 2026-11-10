/* ---------- Bookmarks (mise à jour sur place pour que l'animation de remplissage joue) ---------- */
function setBookmarkUi(id, on, animate){
  document.querySelectorAll(`[data-bm="${CSS.escape(id)}"]`).forEach(b => {
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', on ? 'Retirer des bookmarks' : 'Ajouter aux bookmarks');
    if (on && animate) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 600); }
  });
}
function toggleFav(t){
  const f = favs(), i = f.tracks.findIndex(x => x.id === t.id), on = i < 0;
  if (on) f.tracks.unshift(slim(t)); else f.tracks.splice(i, 1);
  save(); setBookmarkUi(t.id, on, true); renderSide();
  toast(on ? 'Ajouté aux bookmarks' : 'Retiré des bookmarks');
  if (S.view.type === 'playlist' && S.view.id === 'favs') setTimeout(() => { if (S.view.type === 'playlist' && S.view.id === 'favs') renderView(); }, 520);
  else if (S.view.type === 'library') setTimeout(renderView, 520);
}
const bmBtn = (t, extra = '') => { const on = isFav(t.id); return `<button class="ib bmk ${on?'on':''} ${extra}" data-act="fav" data-bm="${esc(t.id)}" aria-pressed="${on}" aria-label="${on?'Retirer des bookmarks':'Ajouter aux bookmarks'}">${bmSvg}</button>`; };

