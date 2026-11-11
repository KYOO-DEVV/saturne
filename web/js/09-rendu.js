/* ---------- Rendu ---------- */
function tracksOf(src){
  if (src === 'main') return S.home.main.tracks;
  if (src === 'fresh') return S.home.fresh.tracks;
  if (src === 'recent') return S.history;
  if (src === 'plays') return playsTracks();
  if (src === 'mix') return (S.mix || {tracks:[]}).tracks;
  if (src === 'follownew') return S.home.follow ? S.home.follow.tracks : [];
  if (src && src.startsWith('shelf:')) return (S.home.shelves[src.slice(6)] || {}).tracks || [];
  if (src === 'list') return S.list.tracks;
  if (src === 'search') return S.search.tracks;
  if (src === 'artist') return S.artist.tracks;
  if (src === 'pub') return (S.pub.data || {tracks:[]}).tracks;
  if (src === 'pl') return plView();
  return [];
}
const defaultSrc = () => ({home:'main', list:'list', search:'search', playlist:'pl', artist:'artist', pubpl:'pub'}[S.view.type]);
const countText = l => plural(l.length, 'song');
const playActions = () => `<button class="btn" data-act="playall">${ic('play')}Play</button><button class="ghost" data-act="shuffleall">${ic('shuffle')}Shuffle</button>`;
const chLink = t => t.channelId ? `<button class="alink" data-artist="${esc(t.channelId)}">${esc(t.channel)}</button>` : esc(t.channel);
function card(t, i){
  const c = current(), on = c && c.id === t.id;
  return `<li class="card ${on?'on':''}" data-i="${i}" draggable="true" style="--d:${Math.min(i, 14)}">
    <button class="thumb" data-act="play" aria-label="Lire ${esc(t.title)}"><img src="${esc(t.thumb)}" alt="" loading="lazy"><span class="pb">${ic('play')}</span></button>
    <div class="cacts">${bmBtn(t)}<button class="ib" data-act="queue" aria-label="Ajouter à la file d'attente" title="Ajouter à la file d'attente">${ic('addq')}</button><button class="ib" data-act="menu" aria-label="Ajouter à une playlist" title="Ajouter à une playlist">${ic('plus')}</button></div>
    <div class="tt" title="${esc(t.title)}">${esc(t.title)}</div><div class="ch">${chLink(t)}</div></li>`;
}
function row(t, i, n){
  const c = current(), on = c && c.id === t.id, own = S.view.type === 'playlist', plain = own && plPlain();
  let acts = bmBtn(t) + `<button class="ib" data-act="queue" aria-label="Ajouter à la file d'attente" title="Ajouter à la file d'attente">${ic('addq')}</button><button class="ib" data-act="menu" aria-label="Ajouter à une playlist" title="Ajouter à une playlist">${ic('plus')}</button>`;
  if (own && S.plv.sel) acts = '';
  else if (own && !plain) acts += `<button class="ib" data-act="remove" aria-label="Retirer" title="Retirer">${ic('close')}</button>`;
  else if (own) acts += `<button class="ib" data-act="up" aria-label="Monter" ${i===0?'disabled':''}>${ic('up')}</button><button class="ib" data-act="down" aria-label="Descendre" ${i===n-1?'disabled':''}>${ic('down')}</button><button class="ib" data-act="remove" aria-label="Retirer" title="Retirer">${ic('close')}</button>`;
  return `<li class="row ${on?'on':''} ${own && S.plv.sel && S.plv.sel.has(t.id) ? 'picked' : ''}" data-i="${i}" draggable="true" style="--d:${Math.min(i, 14)}">
    ${own && S.plv.sel ? `<button class="selbox" data-do="pick" role="checkbox" aria-checked="${S.plv.sel.has(t.id)}" aria-label="${esc(t.title)}">${S.plv.sel.has(t.id) ? ic('check') : ''}</button>` : ''}<button class="cover" data-act="play" aria-label="Lire ${esc(t.title)}"><img src="${esc(t.thumb)}" alt="" loading="lazy"><span class="ov">${ic('play')}</span></button>
    <div style="min-width:0"><div class="tt">${esc(t.title)}</div><div class="ch">${chLink(t)}</div></div>
    <div class="dur">${t.duration ? fmt(t.duration) : ''}</div><div class="acts">${acts}</div></li>`;
}
const grid = (l, src) => `<ul class="grid" data-src="${src}">${l.slice(0, capOf(src)).map(card).join('')}</ul>${moreItems(l, src)}`;
const shelf = (l, src) => `<div class="shelfwrap"><ul class="shelf" data-src="${src}">${l.map(card).join('')}</ul><button class="sarrow l" data-sh="-1" aria-label="Scroll left" hidden>${ic('left')}</button><button class="sarrow r" data-sh="1" aria-label="Scroll right">${ic('right')}</button></div>`;
const rows = (l, src) => `<ul class="rows" data-src="${src}">${l.slice(0, capOf(src)).map((t, i) => row(t, i, l.length)).join('')}</ul>${moreItems(l, src)}`;
const skeleton = (n = 8, cls = 'grid', extra = '') => `<ul class="${cls}">${`<li><div class="sk ${extra}"></div></li>`.repeat(n)}</ul>`;
const retry = (msg, act) => `<div class="errbox"><span class="err">${esc(msg)}</span><button class="ghost" data-act="${act}">${ic('refresh')}Réessayer</button></div>`;
const avatarHtml = u => u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : esc(initial(u.display || u.username));
const artistTile = a => `<li><button class="artist" data-artist="${esc(a.id)}"><span class="avatar">${a.thumb ? `<img src="${esc(a.thumb)}" alt="" loading="lazy">` : esc(initial(a.name))}</span><span style="min-width:0;max-width:100%"><b>${esc(a.name)}</b><small>${esc(a.subsText || '')}</small></span></button></li>`;
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const privIcon = p => isPublic(p) ? ic('globe') : ic('lock');
const covInner = p => p.cover ? `<img src="${esc(p.cover)}" alt="">` : p.id === 'favs' ? ic('bookmarkf') : (mosaic(p) || esc(initial(p.name)));
function pthumb(p){
  if (p.id === 'favs') return `<span class="pthumb">${ic('bookmarkf')}</span>`;
  return `<span class="pthumb">${mosaic(p) || esc(initial(p.name))}</span>`;
}

function heroHtml(){
  const F = S.home.fresh, list = F.tracks.slice(0, 6);
  if (F.loading && !list.length) return `<div class="hero"><div class="hero-empty"><p class="eyebrow">New releases</p><div class="sk" style="height:40px;width:50%;aspect-ratio:auto"></div></div></div>`;
  if (!list.length) return `<div class="hero"><div class="hero-empty"><p class="eyebrow">New releases</p><h1 style="margin:0">Let's listen to something amazing today.</h1>${F.error ? `<p class="err" style="margin:0">${esc(F.error)}</p>` : ''}<div class="head-actions" style="margin-top:10px">${S.home.main.tracks.length ? `<button class="btn" data-act="playmain">${ic('play')}Play your mix</button>` : ''}<button class="ghost" data-act="refresh">${ic('refresh')}Actualiser</button></div></div></div>`;
  const idx = Math.min(S.heroIdx, list.length - 1);
  return `<div class="hero" id="hero">${list.map((t, i) => `<div class="slide ${i===idx?'on':''}" data-slide="${i}">
      <img class="bg" src="https://i.ytimg.com/vi/${esc(t.id)}/maxresdefault.jpg" alt="" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${esc(t.thumb)}'}">
      <div class="sl-body"><p class="eyebrow">New release${t.ageMin != null ? ' · ' + ago(t.ageMin) : ''}</p>
        <h2 class="sl-title">${esc(t.title)}</h2>
        <p class="sl-by">${t.channelId ? `<button class="alink" data-artist="${esc(t.channelId)}">${esc(t.channel)}</button>` : esc(t.channel)}${t.duration ? ' · ' + fmt(t.duration) : ''}</p>
        <div class="sl-actions"><button class="btn" data-act="heroplay" data-i="${i}">${ic('play')}Play</button><button class="btn alt" data-act="heroqueue" data-i="${i}">${ic('addq')}Add to queue</button>${bmBtn(t)}</div></div></div>`).join('')}
    <div class="hero-nav"><button data-act="heroprev" aria-label="Précédent">${ic('left')}</button><button data-act="heronext" aria-label="Suivant">${ic('right')}</button></div>
    <div class="hero-dots">${list.map((t, i) => `<button class="${i===idx?'on':''}" data-act="herodot" data-i="${i}" aria-label="Sortie ${i+1} : ${esc(t.title)}"></button>`).join('')}</div></div>`;
}
function heroGo(i){
  const n = Math.min(S.home.fresh.tracks.length, 6); if (!n) return;
  S.heroIdx = (i + n) % n;
  document.querySelectorAll('.slide').forEach((s, k) => s.classList.toggle('on', k === S.heroIdx));
  document.querySelectorAll('.hero-dots button').forEach((b, k) => b.classList.toggle('on', k === S.heroIdx));
}
setInterval(() => { const h = $('#hero'); if (h && S.view.type === 'home' && !h.matches(':hover') && !document.hidden && S.settings.heroAuto) heroGo(S.heroIdx + 1); }, 7000);

/* Page « Playlists » */
function libPlaylists(){
  const c = S.lib.chip;
  let l = S.playlists.filter(p => c === 'all' ? true : c === 'bookmarks' ? p.id === 'favs' : c === 'mine' ? !p.system : c === 'public' ? isPublic(p) : c === 'private' ? !p.system && !isPublic(p) : false);
  const key = {added:p => -(p.created || 0), played:p => -(p.lastPlayed || 0), name:p => (p.name || '').toLowerCase(), size:p => -p.tracks.length}[S.lib.sort];
  l = [...l].sort((a, b) => (b.id === 'favs') - (a.id === 'favs') || (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0));
  return l;
}
function libHtml(){
  const L = S.lib, c = L.chip, community = c === 'community';
  let h = `<div class="plhero"><h1>Playlists</h1><p class="sub">Your favourite playlists, all in one place.</p><div class="head-actions"><button class="btn" data-act="newpl">${ic('plus')}Create Playlist</button><button class="ghost" data-act="importpl">${ic('upload')}Import</button></div></div>
    <div class="toolbar"><div class="chips">${CHIPS.map(([k, n]) => `<button class="chip ${L.chip===k?'on':''}" data-chip="${k}">${n}</button>`).join('')}</div>
    ${community ? '' : `<div class="sortbox">Sort by ${dd('sort', 'Trier')}</div>`}</div>`;
  let main = '';
  if (community) {
    const C = S.community;
    if (C.loading && !C.items.length) main = skeleton(6, 'libgrid');
    else if (C.error) main = retry(C.error, 'community-retry');
    else if (!C.items.length) main = '<p class="empty">Aucune playlist publique pour le moment. Les playlists que les autres comptes de cet ordinateur rendent publiques apparaissent ici.</p>';
    else main = `<ul class="libgrid">${C.items.map(p => `<li class="libcard"><button class="cov" data-pub="${esc(p.owner)}|${esc(p.id)}" aria-label="Ouvrir ${esc(p.name)}">${p.cover ? `<img src="${esc(p.cover)}" alt="">` : esc(initial(p.name))}</button><div class="lc-meta"><div><b>${esc(p.name)}</b><small>${ic('globe')}by ${esc(p.ownerDisplay)} · ${plural(p.count, 'song')}</small></div></div></li>`).join('')}</ul>`;
  } else {
    const l = libPlaylists();
    main = `<ul class="libgrid">${l.map((p, n) => `<li class="libcard" data-pl="${p.id}" style="--d:${Math.min(n, 14)}"><button class="cov" data-pl="${p.id}" aria-label="Ouvrir ${esc(p.name)}">${covInner(p)}</button><div class="lc-meta"><div><b>${esc(p.name)}</b><small>${p.id === 'favs' ? '' : privIcon(p)}${plural(p.tracks.length, 'song')}</small></div><button class="ib sm" data-act="plmenu" data-pid="${p.id}" aria-label="Options de ${esc(p.name)}">${ic('more')}</button></div></li>`).join('')}
      ${c === 'all' || c === 'mine' || c === 'private' ? `<li class="libcard create"><button class="cov" data-act="newpl" aria-label="Create Playlist">${ic('plusc')}</button><div class="lc-meta"><div><b>Create Playlist</b><small>New playlist</small></div></div></li>` : ''}</ul>`;
    if (!l.length && c !== 'all') main = `<p class="empty">Aucune playlist dans cette catégorie.</p>`;
  }
  const recent = S.history.slice(0, 5);
  const side = `<aside class="libside"><div class="box"><h3>Recently Played</h3>${recent.length ? recent.map((t, i) => `<button class="mini-row ${current() && current().id === t.id ? 'on' : ''}" data-act="playrecent" data-i="${i}"><img src="${esc(t.thumb)}" alt=""><span class="m"><b>${esc(t.title)}</b><small>${esc(t.channel)}</small></span></button>`).join('') : '<p class="hint" style="padding:0">Rien pour le moment.</p>'}</div>
    <div class="box"><h3>Quick Access</h3><div class="quick"><button class="${S.shuffle ? 'act' : ''}" data-act="qshuffle">${ic('shuffle')}Shuffle</button><button class="${S.repeat !== 'off' ? 'act' : ''}" data-act="qrepeat">${ic(S.repeat === 'one' ? 'repeat1' : 'repeat')}Repeat</button><button data-act="qqueue">${ic('queue')}Queue</button></div></div></aside>`;
  const welcome = (c === 'all' && !S.playlists.some(p => !p.system)) ? `<div class="welcome"><h3>Ta bibliothèque est vide</h3><p>Crée ta première playlist, importes-en une avec un code, ou découvre celles de la communauté.</p><div class="head-actions"><button class="btn" data-act="newpl">${ic('plus')}Create Playlist</button><button class="ghost" data-act="importpl">${ic('upload')}Import</button><button class="ghost" data-chip="community">${ic('globe')}Community</button></div></div>` : '';
  return h + `<div class="libwrap"><div>${welcome}${main}</div>${side}</div>`;
}

function banner({p, owner, readonly}){
  const own = !readonly;
  return `<div class="banner ${p.banner?'has':''}" id="banner" ${own ? 'data-drop="banner"' : ''}>
      ${own ? `<div class="bhint">Dépose l'image de la bannière</div><div class="btools"><button data-act="banner-pick">${ic('image')}Bannière</button>${p.banner ? `<button data-act="banner-clear" aria-label="Retirer la bannière">${ic('close')}</button>` : ''}</div>` : ''}
      <div class="pfp ${own ? '' : 'static'} ${p.id === 'favs' ? 'fav' : ''}" ${own ? 'id="pfp" data-drop="pfp" data-act="pfp-pick" role="button" tabindex="0" aria-label="Changer l\'image de la playlist"' : ''}>
        ${p.cover ? `<img src="${esc(p.cover)}" alt="">` : (p.id === 'favs' ? ic('bookmarkf') : (mosaic(p) || esc(initial(p.name))))}
        ${own ? `<span class="pov">${ic('image')}Dépose une image</span>` : ''}</div>
      <div class="bmeta"><p class="eyebrow" style="color:#fff;opacity:.85">Playlist${p.id !== 'favs' && !readonly ? `<span class="badge">${privIcon(p)}${isPublic(p) ? 'Public' : 'Private'}</span>` : readonly ? '<span class="badge">' + ic('globe') + 'Public</span>' : ''}</p>
        ${own ? `<input class="title-input" id="plTitle" value="${esc(p.name)}" aria-label="Nom de la playlist" maxlength="60" ${p.system?'disabled':''}>
        <input class="desc-input" id="plDesc" value="${esc(p.description || '')}" placeholder="${p.system ? 'Tes titres enregistrés' : 'Ajoute une description'}" aria-label="Description" maxlength="160" ${p.system?'disabled':''}>` : `<h1>${esc(p.name)}</h1>${p.description ? `<p class="desc-input" style="border:0">${esc(p.description)}</p>` : ''}`}
        <p class="sub">${own ? esc(S.user.display) : 'by ' + esc(owner)} · ${countText(p.tracks)}${own && !p.cover && !p.banner && !p.system ? ' · Glisse une image sur la pochette ou la bannière' : ''}</p></div></div>`;
}

let lastViewSig = '', enterTimer = 0;
function render(){ renderSide(); renderTop(); renderView(); renderBar(); settleImages(); }
function offlineHtml(msg){ return `<div class="welcome"><h3>${L('YouTube is not responding right now', 'YouTube ne répond pas pour le moment')}</h3><p>${esc(msg)}</p><div class="head-actions"><button class="btn" data-act="refresh">${ic('refresh')}${L('Retry', 'Réessayer')}</button><button class="ghost" data-go="library">${L('Open your library', 'Ouvrir ma bibliothèque')}</button></div></div>`; }
function renderView(){
  const v = S.view, el = $('#view'); let h = '';
  const keepScroll = el.scrollTop;
  if (ddOpen) closeDD();
  if (v.type === 'home') {
    const H = S.home, M = H.main, F = H.fresh;
    h = `<p class="greet">${greeting()}, <b>${esc(S.user.display)}</b></p>` + heroHtml();
    if (S.history.length) h += `<section class="block"><div class="sechd"><h2 class="sh">Recently Played</h2><button class="more" data-go="history">See all${ic('right')}</button></div>${shelf(S.history.slice(0, 12), 'recent')}</section>`;
    if (F.tracks.length > 6) h += `<section class="block"><div class="sechd"><h2 class="sh">New Releases</h2><button class="more" data-more="__new__">See all${ic('right')}</button></div>${shelf(F.tracks, 'fresh')}</section>`;
    h += `<section class="block"><div class="sechd"><h2 class="sh">${esc(L('Trending ' + HOME_NAME, HOME_NAME + ' du moment'))}</h2><span style="display:flex;gap:14px">${M.tracks.length ? `<button class="more" data-act="playmain">Play all${ic('right')}</button>` : ''}<button class="more" data-act="refresh" aria-label="Actualiser">${ic('refresh')}</button></span></div>` +
      (M.loading ? skeleton(10) : M.error ? (F.error ? offlineHtml(M.error) : retry(M.error, 'refresh')) : M.tracks.length ? grid(M.tracks, 'main') : '<p class="empty">Rien à afficher pour le moment.</p>') + '</section>';
    h += homeExtraHtml();
    SHELVES.forEach(s => {
      const X = H.shelves[s.key]; if (!X || (X.error && M.error)) return;
      h += `<section class="block"><div class="sechd"><h2 class="sh">${esc(s.title)}</h2><button class="more" data-more="${s.key}">See all${ic('right')}</button></div>` +
        (X.loading ? skeleton(6, 'shelf') : X.error ? `<p class="err">${esc(X.error)}</p>` : shelf(X.tracks, 'shelf:' + s.key)) + '</section>';
    });
  } else if (v.type === 'search') {
    const R = S.search;
    if (!v.q) h = `<div class="pagehead"><p class="eyebrow">Search</p><h1>Browse all</h1><p class="sub">Cherche un titre ou un artiste dans la barre du haut, ou choisis un genre.</p></div>
      <ul class="tiles">${GENRES.map((g, i) => `<li><button class="tile" data-genre="${i}">${esc(g.n)}</button></li>`).join('')}</ul>`;
    else {
      h = `<div class="pagehead"><p class="eyebrow">Search</p><h1>« ${esc(v.q)} »</h1>`;
      if (R.loading) h += `<p class="sub" style="margin:0">Recherche en cours…</p></div>${skeleton(8)}`;
      else if (R.error) h += `</div>${retry(R.error, 'retrysearch')}`;
      else h += `<p class="sub">${countText(R.tracks)}</p>${R.tracks.length ? `<div class="head-actions">${playActions()}</div>` : ''}</div>` + (R.tracks.length ? rows(R.tracks, 'search') + moreBtn(R, 'search') : '<p class="empty">Aucun titre trouvé. Essaie d\'autres mots.</p>');
    }
  } else if (v.type === 'list') {
    const L = S.list, l = L.tracks;
    h = `<div class="pagehead"><p class="eyebrow">${esc(L.eyebrow)}</p><h1>${esc(L.title)}</h1>`;
    if (L.loading) h += `<p class="sub" style="margin:0">Recherche en cours…</p></div>${skeleton(10)}`;
    else if (L.error) h += `</div>${retry(L.error, 'retrylist')}`;
    else h += `<p class="sub">${countText(l)}</p>${l.length ? `<div class="head-actions">${playActions()}</div>` : ''}</div>` + (l.length ? grid(l, 'list') + moreBtn(L, 'list') : '<p class="empty">Aucun titre trouvé.</p>');
  } else if (v.type === 'artists') {
    const A = S.artists, got = A.items.filter(Boolean);
    h = `<div class="pagehead"><p class="eyebrow">Artists</p><h1>Artists</h1><p class="sub">${A.mode === 'search' ? `Résultats pour « ${esc(A.query)} ».` : 'Une sélection d\'artistes à découvrir. Cherche un nom pour en trouver d\'autres.'}</p></div>
      <form class="asearch" id="artistForm"><div class="search"><span>${ic('search')}</span><input id="artistQ" type="search" placeholder="Nom d'un artiste" aria-label="Chercher un artiste" autocomplete="off" value="${esc(A.query)}"></div><button class="btn">Chercher</button>${A.mode === 'search' ? `<button type="button" class="ghost" data-act="artists-back">${ic('left')}Retour</button>` : ''}</form>`;
    if (A.mode !== 'search') h += followsHtml();
    if (A.loading && !got.length) h += skeleton(12, 'artists', 'round');
    else if (A.error) h += retry(A.error, 'artists-retry');
    else h += got.length ? `<ul class="artists">${got.map(artistTile).join('')}</ul>` : '<p class="empty">Aucun artiste trouvé.</p>';
  } else if (v.type === 'artist') {
    const A = S.artist, info = A.info || {}, l = A.tracks;
    h = `<button class="more back" data-go="artists">${ic('left')}Artists</button>
      <div class="banner" id="abanner"><div class="pfp round">${info.thumb ? `<img src="${esc(info.thumb)}" alt="">` : esc(initial(info.name))}</div>
        <div class="bmeta"><p class="eyebrow" style="color:#fff;opacity:.85">Artiste</p><h1>${esc(info.name || '…')}</h1><p class="sub">${esc([info.subsText, l.length ? countText(l) : ''].filter(Boolean).join(' · '))}</p></div></div>`;
    if (A.loading) h += `<p class="sub">Chargement des titres…</p>${skeleton(6, 'grid')}`;
    else if (A.error) h += retry(A.error, 'artist-retry');
    else h += (l.length ? `<div class="head-actions" style="margin-bottom:20px">${playActions()}${followBtn(info)}</div>${rows(l, 'artist')}` : '<p class="empty">Aucun titre lisible trouvé pour cet artiste.</p>');
  } else if (v.type === 'library') {
    h = libHtml();
  } else if (v.type === 'pubpl') {
    const P = S.pub, d = P.data;
    h = `<button class="more back" data-go="library">${ic('left')}Playlists</button>`;
    if (P.loading) h += skeleton(6, 'grid');
    else if (P.error) h += `<div class="errbox"><span class="err">${esc(P.error)}</span></div>`;
    else if (d) h += banner({p:{...d, tracks:d.tracks}, owner:d.ownerDisplay, readonly:true}) +
      `<div class="head-actions" style="margin-bottom:20px">${d.tracks.length ? playActions() : ''}<button class="ghost" data-act="savepub">${ic('copy')}Save to library</button><button class="ghost" data-act="sharepub">${ic('share')}Share</button></div>` +
      (d.tracks.length ? rows(d.tracks, 'pub') : '<p class="empty">Cette playlist est vide.</p>');
  } else if (v.type === 'playlist') {
    const p = curPl(); if (!p) { S.view = {type:'library'}; return render(); }
    const l = p.tracks;
    h = `<button class="more back" data-go="library">${ic('left')}Playlists</button>` + banner({p, owner:S.user.display, readonly:false}) +
      `<div class="head-actions" style="margin-bottom:6px">${l.length ? playActions() : ''}<button class="ghost" data-act="share">${ic('share')}Share</button>
        ${p.system ? '' : `<div class="seg" role="group" aria-label="Confidentialité"><button data-act="setpriv" data-v="private" class="${!isPublic(p)?'on':''}">${ic('lock')}Private</button><button data-act="setpriv" data-v="public" class="${isPublic(p)?'on':''}">${ic('globe')}Public</button></div>`}
        ${p.cover ? `<button class="ghost" data-act="pfp-clear">${ic('close')}Retirer la pochette</button>` : ''}${p.system ? '' : `<button class="ghost ${v.confirm?'warn':''}" data-act="delpl">${ic('trash')}${v.confirm ? 'Confirmer la suppression' : 'Supprimer'}</button>`}</div>
      <p class="privacy-note">${p.system ? ic('lock') + 'Tes bookmarks sont toujours privés.' : isPublic(p) ? ic('globe') + 'Public : les autres comptes de cet ordinateur peuvent voir et écouter cette playlist (onglet Community).' : ic('lock') + 'Private : toi seul peux voir cette playlist.'}</p>
      ${l.length ? plToolsHtml(p) + (plView().length ? rows(plView(), 'pl') : `<p class="empty">${L('No song matches this filter.', 'Aucun titre ne correspond à ce filtre.')}</p>`) : '<p class="empty">Cette playlist est vide. Glisse un titre sur elle dans la barre latérale, ou utilise le bouton « + ».</p>'}`;
  } else if (v.type === 'history') {
    h = historyHtml();
  } else if (v.type === 'mix') {
    h = mixHtml();
  } else if (v.type === 'now') {
    h = nowHtml();
  } else if (v.type === 'settings') {
    h = settingsHtml();
  }
  el.innerHTML = h;
  if (v.type === 'playlist') { const p = curPl(), b = $('#banner'); if (p && p.banner) { b.style.backgroundImage = `url("${p.banner.replace(/"/g, '%22')}")`; b.style.backgroundPosition = `50% ${p.bannerY ?? 50}%`; } }
  if (v.type === 'pubpl' && S.pub.data && S.pub.data.banner) { const b = $('#banner'); if (b) b.style.backgroundImage = `url("${S.pub.data.banner.replace(/"/g, '%22')}")`; }
  if (v.type === 'artist' && S.artist.info && S.artist.info.banner) { const b = $('#abanner'); if (b) b.style.backgroundImage = `url("${S.artist.info.banner.replace(/"/g, '%22')}")`; }
  if (keepScroll && (v.type === 'home' || v.type === 'library')) el.scrollTop = keepScroll;
  const busy = v.type === 'list' ? S.list.loading : v.type === 'search' ? S.search.loading : v.type === 'artist' ? S.artist.loading : v.type === 'artists' ? S.artists.loading && !S.artists.items.filter(Boolean).length : v.type === 'pubpl' ? S.pub.loading : false;
  const sig = [v.type, v.id || v.q || v.owner || '', busy ? 'L' : 'D', v.type === 'library' ? S.lib.chip : '', v.type === 'settings' ? S.setTab : ''].join('|');
  settleImages(); document.querySelectorAll('.shelf').forEach(updShelf); afterRender();
  if (sig !== lastViewSig) { lastViewSig = sig; el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); clearTimeout(enterTimer); enterTimer = setTimeout(() => el.classList.remove('enter'), 800); }
}
function renderTop(){
  const u = S.user; if (!u) return;
  $('#avatarBtn').innerHTML = avatarHtml(u);
  $('#backBtn').disabled = S.hpos <= 0; $('#fwdBtn').disabled = S.hpos >= S.hist.length - 1;
}
function renderSide(){
  const v = S.view, u = S.user; if (!u) return;
  $('#app').classList.toggle('collapsed', S.collapsed);
  const cb = $('#collapse');
  cb.setAttribute('aria-label', S.collapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'); cb.title = cb.getAttribute('aria-label');
  const navOn = v.type === 'artist' ? 'artists' : (v.type === 'list' || v.type === 'search') ? 'search' : (v.type === 'playlist' || v.type === 'pubpl') ? 'library' : v.type;
  document.querySelectorAll('#nav button').forEach(b => { b.classList.toggle('on', b.dataset.nav === navOn); b.setAttribute('aria-current', b.dataset.nav === navOn ? 'page' : 'false'); if (!b.querySelector('svg')) b.insertAdjacentHTML('afterbegin', ic(b.dataset.ic)); });
  $('#plList').innerHTML = S.playlists.map(p => `<button class="pli ${v.type==='playlist'&&v.id===p.id?'on':''}" ${v.type==='playlist'&&v.id===p.id?'aria-current="page"':''} data-pl="${p.id}" title="${esc(p.name)}">${pthumb(p)}<b>${esc(p.name)}</b>${p.system ? '' : isPublic(p) ? ic('globe', 'lk') : ic('lock', 'lk')}</button>`).join('') +
    `<button class="pli create" data-act="newpl" title="Create Playlist"><span class="pthumb">${ic('plus')}</span><b>Create Playlist</b></button>`;
  $('#accAvatar').innerHTML = avatarHtml(u); $('#accName').textContent = u.display; $('#accUser').textContent = '@' + u.username;
}
function renderBar(){
  const t = current();
  $('#nowImg').hidden = !t; $('#nowPh').hidden = !!t; if (t) $('#nowImg').src = t.thumb;
  $('#nowTitle').textContent = t ? t.title : 'Rien en lecture'; $('#nowCh').textContent = t ? t.channel : 'Choisis un titre pour commencer';
  const f = $('#nowFav'); f.hidden = !t;
  if (t) { f.dataset.bm = t.id; f.dataset.act = 'fav'; if (!f.firstChild) f.innerHTML = bmSvg; const on = isFav(t.id); f.classList.toggle('on', on); f.setAttribute('aria-pressed', on); f.setAttribute('aria-label', on ? 'Retirer des bookmarks' : 'Ajouter aux bookmarks'); }
  const bp = $('#bPlay'); bp.innerHTML = ic(playing ? 'pause' : 'play'); bp.setAttribute('aria-label', playing ? 'Pause' : L('Play', 'Lecture'));
  const rs = $('#bShuffle'); rs.classList.toggle('act', S.shuffle); rs.setAttribute('aria-pressed', S.shuffle);
  const rr = $('#bRepeat'); rr.innerHTML = ic(S.repeat === 'one' ? 'repeat1' : 'repeat'); rr.classList.toggle('act', S.repeat !== 'off');
  rr.title = {off:'Répétition désactivée', all:'Répéter toute la file', one:'Répéter ce titre'}[S.repeat];
  $('#volBtn').innerHTML = ic(S.muted || S.volume === 0 ? 'mute' : 'vol');
  $('#qClear').hidden = !S.queue.length; $('#qSave').hidden = !S.queue.length;
  $('#qList').innerHTML = S.queue.length ? S.queue.map((q, i) => `<div class="nq ${i===S.cur?'on':''}" data-qi="${i}" draggable="true" title="${esc(q.title)}"><button class="qplay" data-act="qplay"><img src="${esc(q.thumb)}" alt=""><span class="qm"><b>${esc(q.title)}</b><small>${esc(q.channel)}</small></span></button><span class="qd">${q.duration ? fmt(q.duration) : ''}</span><button class="ib sm" data-act="qrm" aria-label="Retirer de la file">${ic('close')}</button></div>`).join('')
    : '<p class="hint">La file est vide. Lance un titre, ou glisse-en un ici.</p>';
  syncMediaSession(); syncPresence(); updateSleepBtn();
}

