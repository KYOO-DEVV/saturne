/* ---------- 0.7.1 : GIF, personnalisation de l'apparence ---------- */
const isGif = f => f instanceof Blob && f.type === 'image/gif';
const fileDataUrl = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('image')); r.readAsDataURL(f); });
const GIF_MAX = 4 * 1024 * 1024, GIF_AVATAR_MAX = 1100 * 1024;
const hexOk = h => /^#[0-9a-f]{6}$/i.test(h || '');
const lum = c => (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000;
const TINTS = () => [['bg', L('Background color', 'Couleur du fond')], ['black', L('Black', 'Noir')], ['white', L('White', 'Blanc')], ['accent', L('Accent', 'Accent')], ['none', L('None', 'Aucun')]];
function veilColor(){
  const T = S.settings, root = document.documentElement, a = Math.max(0, Math.min(100, +T.bgOverlay)) / 100;
  if (T.bgTint === 'none' || !a) return 'transparent';
  const c = T.bgTint === 'black' ? [0, 0, 0] : T.bgTint === 'white' ? [255, 255, 255] : T.bgTint === 'accent' ? hexRgb(getComputedStyle(root).getPropertyValue('--accent').trim()) || [124, 58, 237] : hexRgb(BG_THEMES[root.dataset.bg] || '#000000');
  return `rgba(${c.join(',')},${a})`;
}
/* Réglages d'apparence qui s'ajoutent au thème (appelé par applyTheme via applyThemeExtra). */
function applyLook(){
  const T = S.settings, root = document.documentElement, st = root.style, light = root.dataset.bg === 'light';
  const acc = hexRgb(getComputedStyle(root).getPropertyValue('--accent').trim()) || [124, 58, 237], bgc = hexRgb(BG_THEMES[root.dataset.bg] || '#000000');
  // Accent trop proche du fond : liseré pour que les boutons restent visibles ; accent clair sur fond clair : texte d'accent assombri.
  st.setProperty('--accent-edge', Math.abs(lum(acc) - lum(bgc)) < 45 ? (light ? '#4a4a58' : '#8b8b99') : 'transparent');
  if (light && lum(acc) > 140) st.setProperty('--accent-hi', rgbHex(mixRgb(acc, [0, 0, 0], .6)));
  st.setProperty('--veil', T.bgImage ? veilColor() : 'transparent');
  st.setProperty('--bgblur', (Math.max(0, Math.min(30, +T.bgBlur || 0))) + 'px');
  root.classList.toggle('no-logo', !!T.hideLogo);
  root.classList.toggle('no-sidethumbs', T.sideThumbs === false);
}
const lookRows = () => { const T = S.settings; return setRow(L('Interface', 'Interface'), '', '<span></span>', 'sethead').replace(/<div class="set sethead">.*<\/div>$/s, '') +
  `<h4>${L('Layout', 'Disposition')}</h4>` +
  setRow(L('Hide the Saturne logo', 'Masquer le logo Saturne'), L('Removes the logo and name at the top of the sidebar.', 'Retire le logo et le nom en haut de la barre latérale.'), swc('hideLogo', !!T.hideLogo, L('Hide the Saturne logo', 'Masquer le logo Saturne'))) +
  setRow(L('Playlist pictures in the sidebar', 'Images des playlists dans la barre latérale'), L('Turn off to show only the playlist names.', 'Désactive pour n’afficher que les noms des playlists.'), swc('sideThumbs', T.sideThumbs !== false, L('Playlist pictures in the sidebar', 'Images des playlists dans la barre latérale'))); };
const overlayRows = () => { const T = S.settings; return T.bgImage ? setRow(L('Image overlay', 'Voile sur l’image'), L('How much the color veil covers the background image (0 shows it as is).', 'À quel point le voile de couleur recouvre l’image de fond (0 la montre telle quelle).'), `<div style="display:flex;gap:10px;align-items:center"><input type="range" id="bgOv" min="0" max="100" value="${+T.bgOverlay}" style="width:160px" aria-label="${L('Image overlay', 'Voile sur l’image')}"><b id="bgOvN" style="width:42px">${+T.bgOverlay}%</b></div>`) +
  setRow(L('Overlay color', 'Couleur du voile'), '', dd('bgtint', L('Overlay color', 'Couleur du voile'))) +
  setRow(L('Image blur', 'Flou de l’image'), L('Softens the image behind the pages.', 'Adoucit l’image derrière les pages.'), `<div style="display:flex;gap:10px;align-items:center"><input type="range" id="bgBl" min="0" max="30" value="${+T.bgBlur}" style="width:160px" aria-label="${L('Image blur', 'Flou de l’image')}"><b id="bgBlN" style="width:42px">${+T.bgBlur}px</b></div>`) : ''; };
DD.bgtint = {opts:TINTS, value:() => S.settings.bgTint || 'bg', set:v => { S.settings.bgTint = v; applyTheme(); save(); renderView(); }};
$('#view').addEventListener('input', e => {
  if (e.target.id === 'bgOv') { S.settings.bgOverlay = +e.target.value; $('#bgOvN').textContent = e.target.value + '%'; applyTheme(); save(); }
  else if (e.target.id === 'bgBl') { S.settings.bgBlur = +e.target.value; $('#bgBlN').textContent = e.target.value + 'px'; applyTheme(); save(); }
});
$('#view').addEventListener('click', e => { if (e.target.closest('[data-do2="accentreset"]')) { S.settings.accentCustom = ''; applyTheme(); save(); renderView(); } });

/* ---------- Page Profil ---------- */
function profileHtml(){
  const u = S.user, P = S.profile, pubs = S.playlists.filter(isPublic), tops = S.plays.length;
  return `<div class="banner profile-banner ${P.banner ? 'has' : ''}" id="pbanner" data-drop="pbanner">
      <div class="bhint">${L('Drop the banner image (GIFs work)', 'Dépose l’image de la bannière (les GIF marchent)')}</div>
      <div class="btools"><button data-do3="pbpick">${ic('image')}${L('Banner', 'Bannière')}</button>${P.banner ? `<button data-do3="pbclear" aria-label="${L('Remove the banner', 'Retirer la bannière')}">${ic('close')}</button>` : ''}</div>
      <button class="pfp round" data-drop="avatar" data-do3="avpick" aria-label="${L('Change the photo', 'Changer la photo')}">${u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : esc(initial(u.display))}<span class="pov">${ic('image')}${L('Drop an image', 'Dépose une image')}</span></button>
      <div class="bmeta"><p class="eyebrow" style="color:#fff;opacity:.85">${L('Profile', 'Profil')}</p>
        <input class="title-input" id="pfName" value="${esc(u.display)}" maxlength="40" aria-label="${L('Display name', 'Nom affiché')}" data-notr>
        <input class="desc-input" id="pfBio" value="${esc(P.bio)}" maxlength="160" placeholder="${L('Add a short bio', 'Ajoute une courte bio')}" aria-label="Bio" data-notr>
        <p class="sub" data-notr>@${esc(u.username)}</p></div></div>
    <div class="head-actions" style="margin-bottom:18px">${u.avatar ? `<button class="ghost" data-do3="avclear">${L('Remove the photo', 'Retirer la photo')}</button>` : ''}<button class="ghost" data-settab-go="account">${ic('settings')}${L('Account and security', 'Compte et sécurité')}</button><button class="ghost" data-go="history">${ic('history')}${L('Listening stats', 'Statistiques d’écoute')}</button></div>
    <div class="statgrid"><div class="stat"><small>${L('Playlists', 'Playlists')}</small><b>${S.playlists.filter(p => !p.system).length}</b></div><div class="stat"><small>${L('Following', 'Suivis')}</small><b>${S.follows.length}</b></div><div class="stat"><small>${L('Songs played', 'Titres écoutés')}</small><b>${tops}</b></div></div>
    ${pubs.length ? `<section class="block"><div class="sechd"><h2 class="sh">${L('Public playlists', 'Playlists publiques')}</h2></div><ul class="libgrid">${pubs.map((p, n) => `<li class="libcard" data-pl="${p.id}" style="--d:${Math.min(n, 14)}"><button class="cov" data-pl="${p.id}" aria-label="${esc(p.name)}">${covInner(p)}</button><div class="lc-meta"><div><b data-notr>${esc(p.name)}</b><small>${plural(p.tracks.length, 'song')}</small></div></div></li>`).join('')}</ul></section>` : `<p class="privacy-note">${ic('lock')}${L('You have no public playlist: everything is private.', 'Tu n’as aucune playlist publique : tout est privé.')}</p>`}
    ${S.follows.length ? `<section class="block"><div class="sechd"><h2 class="sh">${L('Following', 'Suivis')}</h2></div><ul class="artists">${S.follows.map(artistTile).join('')}</ul></section>` : ''}`;
}
async function saveProfileName(v){
  const d = v.trim(); if (!d) { $('#pfName').value = S.user.display; return; }
  if (d === S.user.display) return;
  try { S.user = (await send('/api/me', {display:d}, 'PUT')).user; renderSide(); renderTop(); toast(L('Profile updated', 'Profil mis à jour')); } catch (e) { toast(e.message); }
}
$('#view').addEventListener('change', e => {
  if (e.target.id === 'pfName') saveProfileName(e.target.value);
  else if (e.target.id === 'pfBio') { S.profile.bio = e.target.value.trim().slice(0, 160); save(); }
});
$('#view').addEventListener('keydown', e => { if ((e.target.id === 'pfName' || e.target.id === 'pfBio') && e.key === 'Enter') e.target.blur(); });
async function setProfileBanner(src){
  if (!(src instanceof Blob)) return toast(L('Drop an image file', 'Dépose un fichier image'));
  try {
    if (isGif(src) && src.size <= GIF_MAX) S.profile.banner = await fileDataUrl(src);
    else { const url = URL.createObjectURL(src); try { S.profile.banner = await toDataURL(url, 1280, 720, false); } finally { URL.revokeObjectURL(url); } if (isGif(src)) toast(L('This GIF is over 4 MB: it is shown without animation.', 'Ce GIF dépasse 4 Mo : il est affiché sans animation.')); }
    save(); renderView();
  } catch { toast(L('Could not read this image', 'Impossible de lire cette image')); }
}
$('#view').addEventListener('click', e => {
  const b = e.target.closest('[data-do3]'), sg = e.target.closest('[data-settab-go]');
  if (sg) { S.setTab = sg.dataset.settabGo; return go({type:'settings'}); }
  if (!b) return;
  const k = b.dataset.do3;
  if (k === 'pbpick') pickImage('pbanner');
  else if (k === 'pbclear') { S.profile.banner = ''; save(); renderView(); }
  else if (k === 'avpick') pickImage('avatar');
  else if (k === 'avclear') send('/api/me', {avatar:''}, 'PUT').then(j => { S.user = j.user; render(); toast(L('Photo removed', 'Photo retirée')); }).catch(err => toast(err.message));
});
document.addEventListener('drop', e => {
  const t = e.target.closest && e.target.closest('[data-drop="pbanner"]'); if (!t || isTrackDrag(e) || !hasImageDrag(e)) return;
  e.preventDefault(); e.stopImmediatePropagation(); clearOver(); const f = dropSource(e.dataTransfer); setProfileBanner(f instanceof Blob ? f : null);
}, true);

/* ---------- Page Recherche épurée : seulement la barre, au milieu ---------- */
function searchHomeHtml(){
  return `<div class="search-hero"><form class="search big" id="bigSearch" role="search"><span>${ic('search')}</span><input id="bigQ" type="search" placeholder="${L('Search for songs, artists, playlists…', 'Rechercher des titres, artistes, playlists…')}" aria-label="${L('Search', 'Recherche')}" autocomplete="off"></form></div>`;
}
$('#view').addEventListener('submit', e => {
  if (e.target.id !== 'bigSearch') return;
  e.preventDefault(); const q = $('#bigQ').value.trim(); if (!q) return;
  $('#q').value = q; if (ytListId(q) && !/[?&]v=/.test(q)) return ytImportModal(q); go({type:'search', q});
}, true);
/* À la fin de chaque rendu : état « recherche vide » de l'application (la barre du haut s'efface) et mise au point. */
function afterRender2(){
  const empty = S.view.type === 'search' && !S.view.q;
  $('#app').classList.toggle('searchhome', empty); $('#app').classList.toggle('lyricspage', S.view.type === 'now'); colorizeHead();
  if (empty) { const b = $('#bigQ'); if (b && !b.matches(':focus')) setTimeout(() => b.focus(), 30); }
}
