/* ---------- Clic droit sur un titre ---------- */
let ctx = null;
function trackFromEl(el){
  const li = el.closest('[data-i],[data-qi]'); if (!li) return null;
  if (li.dataset.qi !== undefined) { const i = +li.dataset.qi; return S.queue[i] ? {t:S.queue[i], src:'queue', i} : null; }
  const h = li.closest('[data-src]'), src = h ? h.dataset.src : defaultSrc(), i = +li.dataset.i, t = tracksOf(src)[i];
  return t ? {t, src, i} : null;
}
function placeMenuAt(x, y){
  const m = $('#menu'); if (m.hidden) menuOpener = document.activeElement; m.hidden = false;
  m.style.left = Math.max(8, Math.min(x, innerWidth - m.offsetWidth - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, innerHeight - m.offsetHeight - 8)) + 'px';
  const f1 = m.querySelector('button'); if (f1) f1.focus({preventScroll:true});
}
document.addEventListener('contextmenu', e => {
  if (e.target.closest('input,textarea') || !S.user) return;
  const hit = trackFromEl(e.target); if (!hit) return;
  e.preventDefault(); closeDD(); ctx = hit; menuTrack = null;
  const t = hit.t, fav = isFav(t.id);
  $('#menu').innerHTML = `<div class="label">${esc(t.title.slice(0, 34))}</div><button data-cx="play">${ic('play')}Play</button><button data-cx="next">${ic('queue')}Play next</button><button data-cx="queue">${ic('addq')}Add to queue</button><button data-cx="playlist">${ic('plus')}Add to playlist…</button><button data-cx="bookmark">${ic('bookmarkf')}${fav ? 'Remove bookmark' : 'Bookmark'}</button>${t.channelId ? `<button data-cx="artist">${ic('person')}Go to artist</button>` : ''}<button data-cx="radio">${ic('radio')}Start radio</button><button data-cx="link">${ic('copy')}Copy YouTube link</button>`;
  const kb = !e.clientX && !e.clientY, rc = e.target.getBoundingClientRect();
  placeMenuAt(kb ? rc.left : e.clientX, kb ? rc.bottom : e.clientY);
});
async function copyText(text){
  try { await navigator.clipboard.writeText(text); toast('Lien copié'); }
  catch { const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); toast('Lien copié'); } catch {} a.remove(); }
}
function playNext(t){
  if (!current()) return addToQueue(t);
  const at = S.cur + 1; S.queue.splice(at, 0, slim(t));
  S.order = S.order.map(i => i >= at ? i + 1 : i); S.order.splice(S.pos + 1, 0, at);
  save(); render(); toast('Sera lu ensuite');
}
$('#menu').addEventListener('click', e => {
  const b = e.target.closest('[data-cx]'); if (!b || !ctx) return;
  const {t, src, i} = ctx, k = b.dataset.cx;
  if (k === 'playlist') {
    menuTrack = t; const m = $('#menu'), x = parseFloat(m.style.left), y = parseFloat(m.style.top);
    m.innerHTML = `<div class="label">Ajouter à</div>` + S.playlists.map(p => `<button data-pid="${p.id}">${esc(p.name)}</button>`).join('') +
      `<form id="menuNew"><input class="input" id="menuNewName" placeholder="Nouvelle playlist" aria-label="Nom de la nouvelle playlist" maxlength="60"><button class="ib" aria-label="Créer et ajouter">${ic('plus')}</button></form>`;
    placeMenuAt(x, y); return;
  }
  closeMenu();
  if (k === 'play') { if (src === 'queue') jump(i); else playList(tracksOf(src), i); }
  else if (k === 'next') playNext(t);
  else if (k === 'queue') addToQueue(t);
  else if (k === 'bookmark') toggleFav(t);
  else if (k === 'artist') go({type:'artist', id:t.channelId});
  else if (k === 'link') copyText('https://www.youtube.com/watch?v=' + t.id);
  else if (k === 'radio') startRadio(t);
});

