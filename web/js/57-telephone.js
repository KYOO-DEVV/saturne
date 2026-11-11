/* ---------- 0.7.4 : téléphone ---------- */
const MOBILE = () => innerWidth <= 900;
/* Barre d'onglets : renvoie le clic au bouton correspondant de la navigation. */
$('#tabbar').addEventListener('click', e => { const b = e.target.closest('[data-nav]'); if (!b) return; const t = $(`#nav [data-nav="${b.dataset.nav}"]`); if (t) t.click(); });
/* Sur téléphone, toucher le lecteur ouvre le panneau « En lecture » plein écran. */
$('#nowImg').addEventListener('click', e => { if (MOBILE()) { e.stopImmediatePropagation(); setQueueOpen(true, 'now'); } }, true);
$('#nowTitle').addEventListener('click', e => { if (MOBILE() && current()) { e.stopImmediatePropagation(); setQueueOpen(true, 'now'); } }, true);
$('#nowCh').addEventListener('click', () => { if (MOBILE() && current()) setQueueOpen(true, 'now'); });
const pnCtrlHtml = () => `<div class="pn-ctrl"><input type="range" id="pnSeek" min="0" max="100" value="0" step="1" aria-label="Position dans le titre"><div class="pn-times"><span id="pnCur">0:00</span><span id="pnDur">0:00</span></div>
  <div class="pn-btns"><button class="ib ${S.shuffle ? 'act' : ''}" data-pc="shuffle" aria-label="Lecture aléatoire">${ic('shuffle')}</button><button class="ib" data-pc="prev" aria-label="Titre précédent">${ic('prev')}</button><button class="bigplay" data-pc="play" aria-label="Lecture">${ic(playing ? 'pause' : 'play')}</button><button class="ib" data-pc="next" aria-label="Titre suivant">${ic('next')}</button><button class="ib ${S.repeat !== 'off' ? 'act' : ''}" data-pc="repeat" aria-label="Répétition">${ic(S.repeat === 'one' ? 'repeat1' : 'repeat')}</button></div></div>`;
$('#qdrawer').addEventListener('click', e => {
  const b = e.target.closest('[data-pc]'); if (!b) return;
  const k = b.dataset.pc;
  if (k === 'play') togglePlay(); else if (k === 'next') next(false); else if (k === 'prev') prev();
  else if (k === 'shuffle') $('#bShuffle').click(); else if (k === 'repeat') $('#bRepeat').click();
  setTimeout(renderPanel, 60);
});
let pnSeeking = false;
$('#qdrawer').addEventListener('input', e => { if (e.target.id === 'pnSeek') { pnSeeking = true; $('#pnCur').textContent = fmt(e.target.value); fill(e.target); } });
$('#qdrawer').addEventListener('change', e => { if (e.target.id === 'pnSeek') { if (ready && current()) player.seekTo(+e.target.value, true); pnSeeking = false; } });
setInterval(() => {
  const s = $('#pnSeek'); if (!s || pnSeeking || !ready || !current()) return;
  const d = player.getDuration() || 0, c = player.getCurrentTime() || 0;
  s.max = Math.max(1, Math.floor(d)); s.value = Math.floor(c); fill(s); $('#pnCur').textContent = fmt(c); $('#pnDur').textContent = fmt(d);
  const pb = document.querySelector('[data-pc="play"]'); if (pb && pb.dataset.p !== String(playing)) { pb.dataset.p = playing; pb.innerHTML = ic(playing ? 'pause' : 'play'); }
}, 500);
