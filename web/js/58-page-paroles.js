/* ---------- Page Paroles : pochette à gauche, paroles à droite, vidéo floue en fond (désactivable) ---------- */
const lyVideoOn = () => S.settings.lyricsVideo !== false;
function lyricsPageHtml(){
  const t = current();
  if (!t) return `<div class="pagehead"><p class="eyebrow">${L('Lyrics', 'Paroles')}</p><h1>${L('Nothing playing', 'Rien en lecture')}</h1><p class="sub">${L('Play a song to see its lyrics here.', 'Lance un titre pour voir ses paroles ici.')}</p></div>`;
  return `<div class="lypage ${lyVideoOn() ? '' : 'novid'}" id="lypage"><div class="ly-left">
      <div class="ly-art"><img src="https://i.ytimg.com/vi/${esc(t.id)}/maxresdefault.jpg" alt="" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${esc(t.thumb)}'}"></div>
      <div class="ly-meta"><b data-notr>${esc(t.title)}</b><span data-notr>${chLink(t)}</span></div>
      <div class="ly-tools">${bmBtn(t)}<button class="chipb" data-do="lyvid" aria-pressed="${lyVideoOn()}">${ic('mini')}${L('Video background', 'Fond vidéo')} : ${lyVideoOn() ? L('on', 'oui') : L('off', 'non')}</button><button class="chipb" data-do="lyqueue">${ic('queue')}${L('Queue', 'File d’attente')}</button></div></div>
    <div class="ly-right">${lyricsHtml(t)}</div></div>`;
}
/* La vidéo (le lecteur YouTube habituellement caché) est étirée sur la page, floutée et assombrie, derrière le contenu. */
function placeBgVideo(){
  const yb = document.querySelector('.ytbox'), m = document.querySelector('main'), root = document.documentElement;
  const on = !!yb && !!m && S.view.type === 'now' && lyVideoOn() && !!current() && !$('#app').classList.contains('mini') && !S.settings.showPlayer;
  if (!on) { if (yb && yb.classList.contains('bgvid')) { yb.classList.remove('bgvid'); yb.style.cssText = ''; } root.classList.remove('bgvid-active'); return false; }
  const r = m.getBoundingClientRect(), w = Math.max(r.width, r.height * 16 / 9), h = w * 9 / 16;
  yb.classList.add('bgvid'); root.classList.add('bgvid-active');
  yb.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;right:auto;bottom:auto;--bgw:${w}px;--bgh:${h}px;--bgl:${(r.width - w) / 2}px;--bgt:${(r.height - h) / 2}px`;
  return true;
}
new ResizeObserver(() => placeBgVideo()).observe(document.querySelector('main'));
/* Couleur de fond quand la vidéo est désactivée : celle de la pochette. */
function paintLyrics(){
  const el = $('#lypage'), t = current(); if (!el || !t) return;
  coverColor(`https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`).then(c => { const e2 = $('#lypage'); if (e2 && c) e2.style.setProperty('--lyc', toneOf(c, 120)); });
}
$('#view').addEventListener('click', e => {
  const fav = e.target.closest('.lypage [data-act="fav"]'); if (fav && current()) { toggleFav(current()); return; }
  const b = e.target.closest('[data-do]'); if (!b) return;
  if (b.dataset.do === 'lyvid') { S.settings.lyricsVideo = !lyVideoOn(); save(); renderView(); }
  else if (b.dataset.do === 'lyqueue') setQueueOpen(true, 'queue');
});
$('#bLyrics').addEventListener('click', () => go({type:'now'}));

/* ---------- Minuterie de sommeil : dans Réglages › Lecture (le bouton a quitté la barre) ---------- */
const sleepRow = () => setRow(L('Sleep timer', 'Minuterie de sommeil'), L('Pauses playback after a delay, fading the volume. Also available in the Ctrl + K palette.', 'Met la lecture en pause après un délai, avec un fondu du volume. Aussi dans la palette Ctrl + K.'),
  `<div style="display:grid;gap:8px;justify-items:end"><div class="seg" role="group" aria-label="${L('Sleep timer', 'Minuterie de sommeil')}">${[[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h'], ['track', L('End of song', 'Fin du titre')], ['off', L('Off', 'Non')]].map(([v, n]) => `<button data-sleepset="${v}" class="${(v === 'off' && !S.sleep) || (v === 'track' && S.sleep && S.sleep.track) ? 'on' : ''}">${n}</button>`).join('')}</div><small style="color:var(--mute)">${sleepLabel()}</small></div>`);
$('#view').addEventListener('click', e => { const b = e.target.closest('[data-sleepset]'); if (!b) return; setSleep(b.dataset.sleepset); renderView(); });
