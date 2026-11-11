/* ---------- Paroles (Now playing) ---------- */
/* S.lyr = {id, state:'loading'|'ok'|'none'|'error', lines:[{t, text}] (synchronisées) ou plain:'…', msg} */
function parseLrc(text){
  const out = [];
  String(text || '').split('\n').forEach(l => {
    const m = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(l.trim());
    if (m) out.push({t:+m[1] * 60 + parseFloat(m[2]), text:m[3].trim()});
  });
  return out;
}
async function loadLyrics(t){
  S.lyr = {id:t.id, state:'loading'};
  try {
    const j = await api('lyrics', {title:t.title, artist:t.channel, dur:t.duration || 0});
    if (!S.lyr || S.lyr.id !== t.id) return;
    const lines = j.found && j.synced ? parseLrc(j.synced) : [];
    if (lines.length > 2) S.lyr = {id:t.id, state:'ok', lines, src:[j.track, j.artist].filter(Boolean).join(' · ')};
    else if (j.found && j.plain) S.lyr = {id:t.id, state:'ok', plain:j.plain, src:[j.track, j.artist].filter(Boolean).join(' · ')};
    else S.lyr = {id:t.id, state:'none'};
  } catch (e) { if (!S.lyr || S.lyr.id !== t.id) return; S.lyr = {id:t.id, state:'error', msg:errText(e)}; }
  const box = $('#lyrics'); if (box && S.view.type === 'now') { box.outerHTML = lyricsHtml(t); lyrLine = -1; syncLyrics(); }
  if (S.qopen && S.ptab === 'now') renderPanel();
}
function lyricsHtml(t){
  const Y = S.lyr && S.lyr.id === t.id ? S.lyr : {state:'loading'};
  let body;
  if (Y.state === 'loading') body = `<p class="ly-info">${L('Looking for lyrics…', 'Recherche des paroles…')}</p>`;
  else if (Y.state === 'none') body = `<p class="ly-info">${L('No lyrics found for this song.', 'Pas de paroles trouvées pour ce titre.')}</p>`;
  else if (Y.state === 'error') body = `<p class="ly-info">${esc(Y.msg)}</p>`;
  else if (Y.lines) body = `<div class="ly-lines" data-notr>${Y.lines.map((l, i) => `<p data-ly="${i}">${esc(l.text) || '♪'}</p>`).join('')}</div>`;
  else body = `<div class="ly-plain" data-notr>${esc(Y.plain)}</div>`;
  return `<section class="np-lyrics" id="lyrics"><h4 class="np-h">${L('Lyrics', 'Paroles')}${Y.lines ? `<span class="ly-tag">${L('synced', 'synchronisées')}</span>` : ''}</h4>${body}${Y.src ? `<p class="ly-src" data-notr>${esc(Y.src)} · lrclib.net</p>` : ''}</section>`;
}
let lyrLine = -1;
function syncLyrics(){
  const Y = S.lyr; if (!Y || !Y.lines || S.view.type !== 'now' || !ready) return;
  const c = current(); if (!c || c.id !== Y.id) return;
  let now = 0; try { now = player.getCurrentTime() || 0; } catch {}
  let i = -1; for (let k = 0; k < Y.lines.length; k++) { if (Y.lines[k].t <= now + 0.25) i = k; else break; }
  if (i === lyrLine) return; lyrLine = i;
  const box = document.querySelector('.ly-lines'); if (!box) return;
  box.querySelectorAll('.on').forEach(x => x.classList.remove('on'));
  const el = box.querySelector(`[data-ly="${i}"]`);
  if (el) { el.classList.add('on'); box.scrollTo({top:el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2, behavior:S.settings.reduceMotion ? 'auto' : 'smooth'}); }
}
setInterval(syncLyrics, 300);
$('#view').addEventListener('click', e => {
  const l = e.target.closest('[data-ly]'); if (!l || !S.lyr || !S.lyr.lines || !ready) return;
  try { player.seekTo(S.lyr.lines[+l.dataset.ly].t, true); } catch {}
});

/* ---------- Clip vidéo (le lecteur YouTube, d'habitude caché, se place sur la pochette de Now playing) ---------- */
function placeClip(){
  const yb = document.querySelector('.ytbox'), art = document.querySelector('.np-art') || (S.qopen && S.ptab === 'now' ? document.querySelector('.pn-art') : null);
  if (!S.clip || !art) { yb.classList.remove('clip'); yb.style.cssText = ''; return; }
  const r = art.getBoundingClientRect(), h = Math.min(r.height, r.width * 9 / 16);
  yb.classList.add('clip');
  yb.style.left = r.left + 'px'; yb.style.top = (r.top + (r.height - h) / 2) + 'px'; yb.style.width = r.width + 'px'; yb.style.height = h + 'px'; yb.style.right = 'auto'; yb.style.bottom = 'auto';
}
function setClip(on){
  if (S.clip === !!on) return;
  S.clip = !!on; document.documentElement.classList.toggle('clip-on', S.clip); placeClip();
  if (S.view.type === 'now') renderView();
}
(function clipLoop(){ if (S.clip) placeClip(); requestAnimationFrame(clipLoop); })();
setInterval(() => { if (S.clip) placeClip(); }, 500); // quand la fenêtre est en arrière-plan, requestAnimationFrame s'arrête

/* Appelé à la fin de chaque rendu de page. */
function afterRender(){
  placeClip();
  if (S.view.type === 'now') { const t = current(); if (t && (!S.lyr || S.lyr.id !== t.id)) loadLyrics(t); lyrLine = -1; }
}
