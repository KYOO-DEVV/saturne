/* ---------- Now playing ---------- */
function nowHtml(){
  const t = current();
  if (!t) return `<div class="pagehead"><p class="eyebrow">Now playing</p><h1>Rien en lecture</h1><p class="sub">Lance un titre pour le voir ici.</p></div>`;
  const nextUp = S.order.slice(S.pos + 1, S.pos + 7).map(i => ({i, t:S.queue[i]})).filter(x => x.t);
  return `<div class="np-page"><div class="np-art"><img src="${esc(bigArt(t))}" alt="" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${esc(t.thumb)}'}"></div>
    <div class="np-info"><p class="eyebrow">Now playing</p><h1>${esc(t.title)}</h1><p class="sub" style="margin-bottom:20px">${chLink(t)}${t.duration ? ' · ' + fmt(t.duration) : ''}</p>
      <div class="head-actions">${bmBtn(t)}<button class="ghost" data-act="npmenu">${ic('plus')}Add to playlist</button><button class="ghost" data-act="qqueue">${ic('queue')}Queue</button><button class="ghost" data-act="radio">${ic('radio')}Start radio</button>${isSc(t) ? '' : `<button class="ghost ${S.clip ? 'on' : ''}" data-do="clip" aria-pressed="${S.clip}">${ic('mini')}${L('Music video', 'Clip vidéo')}</button>`}</div>
      ${nextUp.length ? `<h4 class="np-h">Next up</h4><div class="np-list">${nextUp.map(x => `<button class="mini-row" data-act="qjump" data-qi="${x.i}"><img src="${esc(x.t.thumb)}" alt=""><span class="m"><b>${esc(x.t.title)}</b><small>${esc(x.t.channel)}</small></span></button>`).join('')}</div>` : ''}</div>${lyricsHtml(t)}</div>`;
}
$('#nowImg').addEventListener('click', () => go({type:'now'}));
$('#nowTitle').addEventListener('click', () => { if (current()) go({type:'now'}); });

