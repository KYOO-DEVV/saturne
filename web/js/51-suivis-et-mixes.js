/* ---------- Artistes suivis ---------- */
const isFollowed = id => S.follows.some(a => a.id === id);
const followBtn = info => info && info.id ? `<button class="ghost ${isFollowed(info.id) ? 'on' : ''}" data-do="follow" aria-pressed="${isFollowed(info.id)}">${ic(isFollowed(info.id) ? 'check' : 'plus')}${isFollowed(info.id) ? L('Following', 'Suivi') : L('Follow', 'Suivre')}</button>` : '';
function toggleFollow(info){
  if (!info || !info.id) return;
  const i = S.follows.findIndex(a => a.id === info.id);
  if (i >= 0) S.follows.splice(i, 1);
  else { if (S.follows.length >= 60) return toast(L('You can follow up to 60 artists.', 'Tu peux suivre 60 artistes au maximum.')); S.follows.unshift({id:info.id, name:info.name || '', thumb:info.thumb || '', subsText:info.subsText || ''}); }
  save(); S.home.follow = null; renderView();
  toast(i >= 0 ? L('Unfollowed ', 'Tu ne suis plus ') + (info.name || '') : L('Following ', 'Tu suis ') + (info.name || ''));
}
const followChip = a => `<button class="fa" data-artist="${esc(a.id)}" title="${esc(a.name)}"><span class="avatar">${a.thumb ? `<img src="${esc(a.thumb)}" alt="" loading="lazy">` : esc(initial(a.name))}</span><b>${esc(a.name)}</b></button>`;
const followsHtml = () => S.follows.length ? `<section class="block"><div class="sechd"><h2 class="sh">${L('Following', 'Suivis')}</h2><span class="sub">${S.follows.length}</span></div><div class="fstrip">${S.follows.map(followChip).join('')}</div></section><div class="sechd"><h2 class="sh">${L('Discover', 'À découvrir')}</h2></div>` : '';
$('#view').addEventListener('click', e => {
  const b = e.target.closest('[data-afollow]'); if (!b) return; e.stopPropagation();
  const a = [...S.artists.items.filter(Boolean), ...S.follows].find(x => x.id === b.dataset.afollow); if (a) toggleFollow(a);
});
/* Derniers titres des artistes suivis : chargés après le reste de l'accueil, pour ne pas le ralentir. */
let followSeq = 0;
async function loadFollowNew(){
  if (!S.follows.length) { S.home.follow = null; return; }
  if (S.home.follow && (S.home.follow.loading || S.home.follow.tracks.length)) return;
  const seq = ++followSeq; S.home.follow = {tracks:[], loading:true};
  try { const j = await api('follows/new', {ids:S.follows.slice(0, 12).map(a => a.id).join(',')}); if (seq !== followSeq) return; S.home.follow = {tracks:j.items, loading:false}; }
  catch { if (seq !== followSeq) return; S.home.follow = {tracks:[], loading:false}; }
  if (S.view.type === 'home') renderView();
}

/* ---------- Mixes automatiques (à partir de l'historique d'écoute) ---------- */
function buildMixes(){
  const P = S.plays; if (P.length < 5) return [];
  const now = Date.now(), DAY = 864e5, byId = new Map(), count = new Map(), last = new Map(), recent = new Map();
  P.forEach(p => { byId.set(p[0], p); count.set(p[0], (count.get(p[0]) || 0) + 1); last.set(p[0], Math.max(last.get(p[0]) || 0, p[4])); if (now - p[4] < 30 * DAY) recent.set(p[0], (recent.get(p[0]) || 0) + 1); });
  const tr = id => playTrack(byId.get(id)), out = [];
  const top = [...recent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([id]) => tr(id));
  if (top.length >= 4) out.push({key:'top', title:L('Your top songs', 'Tes titres du moment'), sub:L('What you play the most these days', 'Ce que tu écoutes le plus en ce moment'), tracks:top});
  const old = [...count.keys()].filter(id => now - last.get(id) > 14 * DAY).sort((a, b) => count.get(b) - count.get(a)).slice(0, 40).map(tr);
  if (old.length >= 4) out.push({key:'back', title:L('Rediscover', 'Redécouvertes'), sub:L('Songs you have not played for a while', 'Des titres que tu n’as pas écoutés depuis un moment'), tracks:old});
  const artists = new Map(); P.forEach(p => { if (p[2]) artists.set(p[2], (artists.get(p[2]) || 0) + 1); });
  [...artists.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([name], n) => {
    const ids = [...new Set(P.filter(p => p[2] === name).map(p => p[0]))].sort((a, b) => count.get(b) - count.get(a));
    if (ids.length >= 2) out.push({key:'artist' + n, title:name + ' Mix', sub:L('Your favourites by ' + name + ', and similar songs', 'Tes préférés de ' + name + ', et des titres proches'), tracks:ids.slice(0, 20).map(tr), seed:ids[0]});
  });
  return out;
}
const mixCard = m => `<li class="libcard mixcard"><button class="cov" data-do="mix" data-key="${m.key}" aria-label="${esc(m.title)}">${mosaic({tracks:m.tracks}) || ic('note')}</button><div class="lc-meta"><div><b data-notr>${esc(m.title)}</b><small>${m.tracks.length} ${L('songs', 'titres')}</small></div></div></li>`;
async function openMix(key){
  const m = buildMixes().find(x => x.key === key); if (!m) return;
  S.mix = {...m, tracks:[...m.tracks]}; go({type:'mix', id:key});
  if (!m.seed) return;
  // Mix d'artiste : complété par des titres proches (la « radio » du titre le plus écouté).
  try { const j = await api('radio', {id:m.seed}); if (!S.mix || S.mix.key !== key) return; const seen = new Set(S.mix.tracks.map(t => t.id)); S.mix.tracks.push(...j.items.filter(t => !seen.has(t.id)).slice(0, 20)); if (S.view.type === 'mix') renderView(); } catch {}
}
function mixHtml(){
  const m = S.mix; if (!m) return `<p class="empty">${L('This mix is no longer available.', 'Ce mix n’est plus disponible.')}</p>`;
  return `<button class="more back" data-go="home">${ic('left')}${L('Home', 'Accueil')}</button><div class="pagehead"><p class="eyebrow">${L('Made for you', 'Fait pour toi')}</p><h1 data-notr>${esc(m.title)}</h1><p class="sub">${esc(m.sub)} · ${m.tracks.length} ${L('songs', 'titres')}</p>
    <div class="head-actions">${playActions()}<button class="ghost" data-do="mixsave">${ic('plus')}${L('Save as playlist', 'Enregistrer comme playlist')}</button></div></div>${rows(m.tracks, 'mix')}`;
}
function saveAsPlaylist(name, tracks){
  const p = {id:Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name:String(name).slice(0, 60), description:'', tracks:tracks.map(slim), visibility:S.defaultPrivacy, created:Date.now()};
  S.playlists.push(p); save(); go({type:'playlist', id:p.id}); toast(L('Playlist created', 'Playlist créée'));
}

/* ---------- Accueil : étagères « Fait pour toi » et « Nouveautés de tes artistes » ---------- */
function homeExtraHtml(){
  let h = ''; const mixes = buildMixes(), F = S.home.follow;
  if (S.follows.length && !F) setTimeout(loadFollowNew, 0); // pas encore chargé (ou liste des suivis modifiée)
  if (mixes.length) h += `<section class="block"><div class="sechd"><h2 class="sh">${L('Made for you', 'Fait pour toi')}</h2></div><div class="shelfwrap"><ul class="shelf mixshelf">${mixes.map(mixCard).join('')}</ul></div></section>`;
  if (S.follows.length && F && (F.loading || F.tracks.length)) h += `<section class="block"><div class="sechd"><h2 class="sh">${L('New from artists you follow', 'Nouveautés de tes artistes')}</h2></div>${F.loading ? skeleton(6, 'shelf') : shelf(F.tracks, 'follownew')}</section>`;
  return h;
}

/* ---------- Actions des nouveaux boutons (attribut data-do) ---------- */
$('#view').addEventListener('click', e => {
  const b = e.target.closest('[data-do]'); if (!b) return;
  const k = b.dataset.do;
  if (k === 'follow') toggleFollow(S.artist.info && {...S.artist.info, id:S.artist.id});
  else if (k === 'mix') openMix(b.dataset.key);
  else if (k === 'mixsave') { if (S.mix) saveAsPlaylist(S.mix.title, S.mix.tracks); }
  else if (k === 'clip') setClip(!S.clip);
  else plDo(k, b, e);
});
$('#qSave').addEventListener('click', () => { if (S.queue.length) { setQueueOpen(false); saveAsPlaylist(L('Queue of ', 'File du ') + new Date().toLocaleDateString(dateLocale()), S.queue); } });
