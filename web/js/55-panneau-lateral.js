/* ---------- Couleur dominante d'une pochette (en-tête de playlist, carte des paroles) ---------- */
const colorCache = new Map();
function coverColor(url){
  if (!url) return Promise.resolve(null);
  if (colorCache.has(url)) return Promise.resolve(colorCache.get(url));
  return new Promise(res => {
    const im = new Image(); if (!/^data:/.test(url)) im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d', {willReadFrequently:true}); x.drawImage(im, 0, 0, 16, 16);
        const d = x.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]), wt = 0.15 + (mx - mn) / (mx || 1) * 2 + (mx > 30 ? .2 : 0); r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt; }
        const col = [r / w, g / w, b / w]; colorCache.set(url, col); res(col);
      } catch { colorCache.set(url, null); res(null); }
    };
    im.onerror = () => res(null); im.src = url;
  });
}
/* Couleur « vive mais sombre » pour un dégradé : on plafonne la luminosité. */
const toneOf = (c, max = 175) => { if (!c) return null; const m = Math.max(...c, 1), k = Math.min(1, max / m); return `rgb(${c.map(v => Math.round(v * k)).join(',')})`; };

/* ---------- Panneau latéral : En lecture / File d'attente / Écoutés récemment ---------- */
S.ptab = 'queue'; S.artistInfo = S.artistInfo || {};
const PTABS = () => [['now', L('Now playing', 'En lecture')], ['queue', L('Queue', 'File d’attente')], ['recent', L('Recent', 'Récents')]];
const qRow = (q, i) => `<div class="nq ${i === S.cur ? 'on' : ''}" data-qi="${i}" draggable="true" title="${esc(q.title)}"><button class="qplay" data-act="qplay"><img src="${esc(q.thumb)}" alt=""><span class="qm"><b data-notr>${esc(q.title)}</b><small data-notr>${esc(q.channel)}</small></span></button><span class="qd">${q.duration ? fmt(q.duration) : ''}</span><button class="ib sm" data-act="qrm" aria-label="Retirer de la file">${ic('close')}</button></div>`;
function lyricsPreviewHtml(Y){
  if (!Y || Y.state === 'loading') return `<p class="pn-dim">${L('Looking for lyrics…', 'Recherche des paroles…')}</p>`;
  if (Y.lines) return Y.lines.map((l, i) => `<p class="${i === lyrLine ? 'cur' : i < lyrLine ? 'past' : ''}" data-notr>${esc(l.text) || '♪'}</p>`).join('');
  if (Y.plain) return Y.plain.split('\n').filter(Boolean).slice(0, 4).map(l => `<p data-notr>${esc(l)}</p>`).join('');
  return '';
}
function aboutHtml(t){
  const A = S.artistInfo[t.channelId || t.channel]; if (!A) return '';
  return `<section class="pn-card"><h4>${L('About the artist', 'À propos de l’artiste')}</h4><div class="pn-about"><span class="avatar">${A.thumb ? `<img src="${esc(A.thumb)}" alt="">` : esc(initial(A.name))}</span>
    <div><b data-notr>${esc(A.name)}</b><small data-notr>${esc(A.subsText || '')}</small></div><button class="ghost sm ${isFollowed(A.id) ? 'on' : ''}" data-do="followp">${isFollowed(A.id) ? L('Following', 'Suivi') : L('Follow', 'Suivre')}</button></div></section>`;
}
function nowPanelHtml(t){
  const Y = S.lyr && S.lyr.id === t.id ? S.lyr : null, ctxPl = S.view.type === 'playlist' ? curPl() : null;
  const ni = S.order[S.pos + 1], nx = ni != null ? S.queue[ni] : null, lp = lyricsPreviewHtml(Y);
  return `<div class="pn"><p class="pn-ctx" data-notr>${esc(ctxPl ? ctxPl.name : t.channel)}</p>
    <div class="pn-art"><img src="${esc(bigArt(t))}" alt="" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${esc(t.thumb)}'}">${S.clip || isSc(t) ? '' : `<button class="pn-vid" data-do="clip" aria-pressed="false">${ic('play')}${L('Switch to video', 'Passer à la vidéo')}</button>`}</div>
    ${S.clip ? `<button class="pn-toggle" data-do="clip" aria-pressed="true">${ic('note')}${L('Switch to song', 'Passer au titre')}</button>` : ''}
    <div class="pn-meta"><div style="min-width:0"><b class="tt" data-notr>${esc(t.title)}</b><span class="ch" data-notr>${chLink(t)}</span></div>${bmBtn(t)}</div>
    ${pnCtrlHtml()}
    ${lp ? `<section class="pn-card pn-lyr" id="pnLyr"><h4>${L('Lyrics preview', 'Aperçu des paroles')}</h4><div class="pn-lines ${Y && Y.lines ? 'sync' : ''}">${lp}</div><button class="more" data-do="fulllyr">${L('Show all', 'Tout afficher')}${ic('right')}</button></section>` : ''}
    ${aboutHtml(t)}
    ${nx ? `<section class="pn-card"><div class="pn-row"><h4>${L('Next in queue', 'À suivre dans la file d’attente')}</h4><button class="more" data-ptab="queue">${L('Open queue', 'Ouvrir la file d’attente')}</button></div><button class="mini-row" data-act="qjump" data-qi="${ni}"><img src="${esc(nx.thumb)}" alt=""><span class="m"><b data-notr>${esc(nx.title)}</b><small data-notr>${esc(nx.channel)}</small></span></button></section>` : ''}</div>`;
}
async function loadArtistInfo(t){
  const key = t.channelId || t.channel; if (!t.channel || S.artistInfo[key] !== undefined) return; S.artistInfo[key] = null;
  try { const items = (await api('search', {type:'channel', q:t.channel})).items; const a = items.find(x => x.id === t.channelId) || items[0]; if (a) S.artistInfo[key] = a; } catch {}
  if (S.qopen && S.ptab === 'now' && current() && (current().channelId || current().channel) === key) renderPanel();
}
function renderPanel(){
  const box = $('#qList'); if (!box) return;
  document.querySelectorAll('#qdrawer [data-ptab]').forEach(b => { const on = b.dataset.ptab === S.ptab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  const isQ = S.ptab === 'queue'; $('#qClear').hidden = !isQ || !S.queue.length; $('#qSave').hidden = !isQ || !S.queue.length;
  if (!S.qopen) return;
  const keep = box.scrollTop, t = current(); $('#qdrawer').classList.toggle('tint', S.ptab === 'now' && !!t);
  if (S.ptab === 'queue') {
    const rest = S.queue.map((q, i) => i === S.cur ? '' : qRow(q, i)).join('');
    box.innerHTML = S.queue.length ? `${t ? `<h4 class="pn-h">${L('Now playing', 'Titre en cours de lecture')}</h4>${qRow(t, S.cur)}` : ''}${rest ? `<h4 class="pn-h">${L('Next up', 'À suivre')}</h4>${rest}` : ''}` : `<p class="hint">La file est vide. Lance un titre, ou glisse-en un ici.</p>`;
  } else if (S.ptab === 'recent') {
    box.innerHTML = S.history.length ? S.history.map((h, i) => `<div class="nq ${t && t.id === h.id ? 'on' : ''}" data-ri="${i}"><button class="qplay"><img src="${esc(h.thumb)}" alt=""><span class="qm"><b data-notr>${esc(h.title)}</b><small data-notr>${esc(h.channel)}</small></span></button></div>`).join('') : `<p class="hint">${L('Nothing played yet.', 'Rien d’écouté pour le moment.')}</p>`;
  } else if (!t) box.innerHTML = `<p class="hint">${L('Play a song to see it here.', 'Lance un titre pour le voir ici.')}</p>`;
  else {
    box.innerHTML = nowPanelHtml(t); box.scrollTop = keep;
    if (!S.lyr || S.lyr.id !== t.id) loadLyrics(t);
    loadArtistInfo(t);
    $('#qdrawer').classList.add('tint');
    coverColor(smallArt(t)).then(c => { const el = $('#pnLyr'); if (el && c) el.style.setProperty('--pc', toneOf(c, 130)); if (c) $('#qdrawer').style.setProperty('--pt', toneOf(c, 150)); });
    placeClip();
  }
}
function openPanel(tab){
  if (S.qopen && S.ptab === tab) return setQueueOpen(false);
  setQueueOpen(true, tab);
}
$('#qdrawer').addEventListener('click', e => {
  const tb = e.target.closest('[data-ptab]'); if (tb) { S.ptab = tb.dataset.ptab; setQueueOpen(true, S.ptab); return; }
  const r = e.target.closest('[data-ri]'); if (r) { playList(S.history, +r.dataset.ri); return; }
  const f = e.target.closest('[data-act="fav"]'); if (f && current()) { toggleFav(current()); return; }
  const a = e.target.closest('[data-artist]'); if (a) { go({type:'artist', id:a.dataset.artist}); return; }
  const d = e.target.closest('[data-do]'); if (!d) return;
  const k = d.dataset.do, t = current();
  if (k === 'clip') { setClip(!S.clip); renderPanel(); }
  else if (k === 'fulllyr') go({type:'now'});
  else if (k === 'followp' && t) { const A = S.artistInfo[t.channelId || t.channel]; if (A) { toggleFollow(A); renderPanel(); } }
});
$('#bFull').addEventListener('click', () => go({type:'now'}));
/* Aperçu des paroles : la ligne en cours suit la lecture. */
let pvLine = -2;
setInterval(() => {
  if (!S.qopen || S.ptab !== 'now' || !S.lyr || !S.lyr.lines) return;
  if (lyrLine === pvLine) return; pvLine = lyrLine;
  const el = document.querySelector('#pnLyr .pn-lines'); if (!el) return;
  if (el.children.length !== S.lyr.lines.length) el.innerHTML = lyricsPreviewHtml(S.lyr);
  el.querySelectorAll('p').forEach((p, i) => { p.className = i === lyrLine ? 'cur' : i < lyrLine ? 'past' : ''; });
  const c = el.querySelector('.cur'); if (c) el.scrollTo({top:c.offsetTop - el.clientHeight / 2 + c.offsetHeight / 2, behavior:S.settings.reduceMotion ? 'auto' : 'smooth'});
}, 400);
setInterval(() => { if (S.qopen && S.ptab === 'now' && S.lyr && S.lyr.lines && S.view.type !== 'now' && typeof syncLyrics === 'function') { /* la ligne courante est calculée ici quand la page « En lecture » n'est pas ouverte */
  const c = current(); if (!c || !ready) return; let now = 0; try { now = player.getCurrentTime() || 0; } catch {}
  let i = -1; for (let k = 0; k < S.lyr.lines.length; k++) { if (S.lyr.lines[k].t <= now + .25) i = k; else break; } lyrLine = i; } }, 300);

/* ---------- Barre de lecture : temps de part et d'autre de la progression ---------- */
const setTimes = (c, d) => { $('#tCur').textContent = fmt(c); $('#tDur').textContent = fmt(d); };
