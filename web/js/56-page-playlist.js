/* ---------- Page Playlist : en-tête en dégradé, barre d'actions, tableau ---------- */
function fmtTotal(sec){
  const m = Math.round(sec / 60), h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60 ? String(m % 60).padStart(2, '0') + ' min' : ''}`.trim() : `${Math.max(1, m)} min`;
}
const fmtAdded = ts => ts ? new Date(ts).toLocaleDateString(dateLocale(), {day:'numeric', month:'short', year:'numeric'}) : '';
/* Ligne du tableau (playlists) : numéro, titre + chaîne, « album » (chaîne), date d'ajout, durée. */
function trow(t, i, n){
  const c = current(), on = c && c.id === t.id, own = S.view.type === 'playlist', sel = own && S.plv.sel;
  const picked = sel && sel.has(t.id);
  let acts = bmBtn(t) + `<button class="ib" data-act="queue" aria-label="Ajouter à la file d'attente" title="Ajouter à la file d'attente">${ic('addq')}</button><button class="ib" data-act="menu" aria-label="Ajouter à une playlist" title="Ajouter à une playlist">${ic('plus')}</button>`;
  if (own && !sel) acts += `<button class="ib" data-act="remove" aria-label="Retirer" title="Retirer">${ic('close')}</button>`;
  const first = sel ? `<button class="selbox" data-do="pick" role="checkbox" aria-checked="${picked}" aria-label="${esc(t.title)}">${picked ? ic('check') : ''}</button>`
    : `<span class="tnum"><span class="n">${on && playing ? ic('note') : i + 1}</span><button class="tplay" data-act="play" aria-label="Lire ${esc(t.title)}">${ic('play')}</button></span>`;
  return `<li class="trow ${on ? 'on' : ''} ${picked ? 'picked' : ''}" data-i="${i}" draggable="true" style="--d:${Math.min(i, 14)}">${first}
    <div class="tmain"><img src="${esc(t.thumb)}" alt="" loading="lazy"><div style="min-width:0"><div class="tt" title="${esc(t.title)}">${esc(t.title)}</div><div class="ch">${chLink(t)}</div></div></div>
    <div class="talb" data-notr>${esc(t.channel)}</div><div class="tdate">${fmtAdded(t.added)}</div><div class="dur">${t.duration ? fmt(t.duration) : ''}</div><div class="acts">${acts}</div></li>`;
}
const theadHtml = () => `<div class="thead"><span>#</span><span>${L('Title', 'Titre')}</span><span>${L('Channel', 'Chaîne')}</span><span>${L('Date added', 'Date d’ajout')}</span><span class="r" aria-label="${L('Duration', 'Durée')}">${ic('history')}</span><span></span></div>`;

function plRightHtml(){
  return `<div class="plright"><label class="plsearch"><span>${ic('search')}</span><input id="plFilter" type="search" placeholder="${L('Filter', 'Filtrer')}" aria-label="${L('Filter this playlist', 'Filtrer cette playlist')}" value="${esc(S.plv.q)}" autocomplete="off"></label>${dd('plsort', L('Sort', 'Trier'))}</div>`;
}
function plHeroHtml({p, owner, readonly, avatar}){
  const own = !readonly, total = p.tracks.reduce((a, t) => a + (t.duration || 0), 0), n = p.tracks.length;
  const kind = p.id === 'favs' ? L('Playlist', 'Playlist') : readonly || isPublic(p) ? L('Public playlist', 'Playlist publique') : L('Private playlist', 'Playlist privée');
  const sw = (act, icon, label, extra = '') => `<button class="ib big" data-act="${act}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${ic(icon)}</button>`;
  const actions = `<div class="plbar"><button class="bigplay" data-act="playall" aria-label="${L('Play', 'Lecture')}" ${n ? '' : 'disabled'}>${ic('play')}</button>${sw('shuffleall', 'shuffle', L('Shuffle play', 'Lecture aléatoire'), n ? '' : 'disabled')}
    ${own ? sw('share', 'share', L('Share', 'Partager')) : sw('sharepub', 'share', L('Share', 'Partager')) + `<button class="ghost" data-act="savepub">${ic('copy')}${L('Save to library', 'Ajouter à ma bibliothèque')}</button>`}
    ${own && !p.system ? sw('setpriv', isPublic(p) ? 'globe' : 'lock', isPublic(p) ? L('Public: click to make private', 'Publique : clique pour la rendre privée') : L('Private: click to make public', 'Privée : clique pour la rendre publique'), `data-v="${isPublic(p) ? 'private' : 'public'}"`) : ''}
    ${own ? `<button class="ib big" data-act="plmenu" data-pid="${p.id}" aria-label="${L('More', 'Plus')}" title="${L('More', 'Plus')}">${ic('more')}</button>` : ''}${n ? plRightHtml() : ''}</div>`;
  const chips = own ? `<div class="plchips"><button class="chipb" data-do="goadd">${ic('plus')}${L('Add songs', 'Ajouter')}</button>${p.system ? '' : `<button class="chipb" data-do="focustitle">${ic('edit')}${L('Name and info', 'Nom et informations')}</button>`}${n ? `<button class="chipb" data-do="${S.plv.sel ? 'seloff' : 'selon'}">${ic('check')}${S.plv.sel ? L('Done', 'Terminé') : L('Select', 'Sélectionner')}</button><button class="chipb" data-do="dedupe">${L('Remove duplicates', 'Retirer les doublons')}</button>` : ''}</div>` : '';
  return `<div class="plhero ${p.banner ? 'hasbanner' : ''}" id="banner" ${own ? 'data-drop="banner"' : ''}>
    ${own ? `<div class="bhint">${L('Drop the banner image (GIFs work)', 'Dépose l’image de la bannière (les GIF marchent)')}</div><div class="btools"><button data-act="banner-pick">${ic('image')}${L('Banner', 'Bannière')}</button>${p.banner ? `<button data-act="banner-clear" aria-label="${L('Remove the banner', 'Retirer la bannière')}">${ic('close')}</button>` : ''}${p.cover ? `<button data-act="pfp-clear" aria-label="${L('Remove the cover', 'Retirer la pochette')}">${ic('trash')}</button>` : ''}</div>` : ''}
    <div class="plhead"><div class="pfp plcover ${own ? '' : 'static'} ${p.id === 'favs' ? 'fav' : ''}" ${own ? 'id="pfp" data-drop="pfp" data-act="pfp-pick" role="button" tabindex="0" aria-label="Changer l\'image de la playlist"' : ''}>
        ${p.cover ? `<img src="${esc(p.cover)}" alt="">` : p.id === 'favs' ? ic('bookmarkf') : (mosaic(p) || esc(initial(p.name)))}${own ? `<span class="pov">${ic('image')}${L('Drop an image', 'Dépose une image')}</span>` : ''}</div>
      <div class="bmeta"><p class="eyebrow">${kind}</p>
        ${own ? `<input class="title-input pltitle" id="plTitle" value="${esc(p.name)}" aria-label="Nom de la playlist" maxlength="60" ${p.system ? 'disabled' : ''} data-notr><input class="desc-input" id="plDesc" value="${esc(p.description || '')}" placeholder="${p.system ? 'Tes titres enregistrés' : 'Ajoute une description'}" aria-label="Description" maxlength="160" ${p.system ? 'disabled' : ''} data-notr>` : `<h1 class="pltitle" data-notr>${esc(p.name)}</h1>${p.description ? `<p class="desc-input" style="border:0" data-notr>${esc(p.description)}</p>` : ''}`}
        <p class="sub plmeta">${avatar ? `<span class="oav">${avatar}</span>` : ''}<b data-notr>${esc(owner)}</b> · ${n} ${n > 1 ? L('songs', 'titres') : L('song', 'titre')}${total ? ', ' + fmtTotal(total) : ''}</p></div></div>
    ${actions}${chips}</div>`;
}
function playlistPageHtml(p){
  const l = p.tracks, view = plView(), sel = S.plv.sel, n = sel ? sel.size : 0;
  const selbar = sel ? `<div class="selbar"><b>${n} ${n > 1 ? L('selected', 'sélectionnés') : L('selected', 'sélectionné')}</b><button class="ghost" data-do="selall">${L('Select all', 'Tout sélectionner')}</button><button class="ghost" data-do="selqueue" ${n ? '' : 'disabled'}>${ic('addq')}${L('Add to queue', 'Ajouter à la file')}</button><button class="ghost" data-do="seladd" ${n ? '' : 'disabled'}>${ic('plus')}${L('Add to playlist…', 'Ajouter à une playlist…')}</button><button class="ghost warn" data-do="selremove" ${n ? '' : 'disabled'}>${ic('trash')}${L('Remove', 'Retirer')}</button></div>` : '';
  return plHeroHtml({p, owner:S.user.display, readonly:false, avatar:avatarHtml(S.user)}) + selbar +
    (l.length ? theadHtml() + (view.length ? rows(view, 'pl') : `<p class="empty">${L('No song matches this filter.', 'Aucun titre ne correspond à ce filtre.')}</p>`) : '<p class="empty">Cette playlist est vide. Glisse un titre sur elle dans la barre latérale, ou utilise le bouton « + ».</p>');
}
function pubPageHtml(){
  const P = S.pub, d = P.data;
  let h = '';
  if (P.loading) return h + skeleton(6, 'grid');
  if (P.error) return h + `<div class="errbox"><span class="err">${esc(P.error)}</span></div>`;
  if (!d) return h;
  return h + plHeroHtml({p:{...d, tracks:d.tracks}, owner:d.ownerDisplay, readonly:true}) + (d.tracks.length ? theadHtml() + rows(d.tracks, 'pub') : '<p class="empty">Cette playlist est vide.</p>');
}
/* Couleur de l'en-tête : celle de la pochette (ou du premier titre). */
function colorizeHead(){
  const el = document.querySelector('.plhero'); if (!el || el.classList.contains('hasbanner')) return;
  const p = S.view.type === 'playlist' ? curPl() : S.pub.data; if (!p) return;
  const url = p.cover || (p.tracks[0] && p.tracks[0].thumb); if (!url) return;
  coverColor(url).then(c => { const e2 = document.querySelector('.plhero'); if (e2 && c) e2.style.setProperty('--hd', toneOf(c, 150)); });
}
/* Boutons propres à la page. */
$('#view').addEventListener('click', e => {
  const b = e.target.closest('[data-do]'); if (!b) return;
  if (b.dataset.do === 'goadd') go({type:'search', q:''});
  else if (b.dataset.do === 'focustitle') { const t = $('#plTitle'); if (t) { t.focus(); t.select(); } }
});
$('#view').addEventListener('dblclick', e => { const li = e.target.closest('.trow'); if (li && !e.target.closest('button,a,input')) { const b = li.querySelector('[data-act="play"]'); if (b) b.click(); } });
