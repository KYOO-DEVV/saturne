/* ---------- Playlists ---------- */
function newPlaylist(){
  const n = S.playlists.filter(p => !p.system).length + 1;
  const p = {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name:'Ma playlist n°' + n, description:'', tracks:[], visibility:S.defaultPrivacy, created:Date.now()};
  S.playlists.push(p); save(); go({type:'playlist', id:p.id});
  const i = $('#plTitle'); if (i) { i.focus(); i.select(); }
}
function setPrivacy(p, v){
  if (p.system) return;
  p.visibility = v; save(); render();
  toast(v === 'public' ? 'Playlist publique : les autres comptes de cet ordinateur peuvent la voir' : 'Playlist privée : toi seul peux la voir');
}
function addToPlaylist(p, t){
  if (p.tracks.some(x => x.id === t.id)) return toast('Déjà dans « ' + p.name + ' »');
  p.tracks.push({...slim(t), added:Date.now()}); save(); render(); toast('Ajouté à « ' + p.name + ' »');
}
let menuTrack = null;
function placeMenu(btn){
  const m = $('#menu'); if (m.hidden) menuOpener = document.activeElement; m.hidden = false;
  const r = btn.getBoundingClientRect(), w = m.offsetWidth, hgt = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
  m.style.top = Math.max(8, r.bottom + 8 + hgt > innerHeight ? r.top - hgt - 8 : r.bottom + 8) + 'px';
  const f1 = m.querySelector('button'); if (f1) f1.focus({preventScroll:true});
}
function openMenu(btn, t){
  menuTrack = t; const m = $('#menu');
  m.innerHTML = `<div class="label">Ajouter à</div>` + S.playlists.map(p => `<button data-pid="${p.id}">${esc(p.name)}</button>`).join('') +
    `<form id="menuNew"><input class="input" id="menuNewName" placeholder="Nouvelle playlist" aria-label="Nom de la nouvelle playlist" maxlength="60"><button class="ib" aria-label="Créer et ajouter">${ic('plus')}</button></form>`;
  placeMenu(btn);
}
function openPlMenu(btn, p){
  menuTrack = null; const m = $('#menu');
  m.innerHTML = `<div class="label">${esc(p.name)}</div><button data-plact="play" data-pid="${p.id}">${ic('play')}Play</button><button data-plact="share" data-pid="${p.id}">${ic('share')}Share</button>` +
    (p.system ? '' : `<button data-plact="toggle" data-pid="${p.id}">${isPublic(p) ? ic('lock') + 'Make private' : ic('globe') + 'Make public'}</button><button class="danger" data-plact="delete" data-pid="${p.id}">${ic('trash')}Delete</button>`);
  placeMenu(btn);
}
function openAccountMenu(btn){
  menuTrack = null; const m = $('#menu');
  m.innerHTML = `<div class="label">@${esc(S.user.username)}</div><button data-menu="profile">${ic('person')}Edit profile</button><button data-menu="settings">${ic('settings')}Settings</button><button data-menu="logout">${ic('logout')}Se déconnecter</button>`;
  placeMenu(btn);
}
const closeMenu = () => { $('#menu').hidden = true; menuTrack = null; };
function closeDrawer(){ $('#app').classList.remove('open'); }
function savePublicCopy(){
  const d = S.pub.data; if (!d) return;
  const p = {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name:d.name, description:d.description || '', tracks:d.tracks.map(slim), cover:d.cover || undefined, visibility:'private', created:Date.now(), savedFrom:{owner:d.owner, id:d.id}};
  if (!p.cover) delete p.cover;
  S.playlists.push(p); save(); renderSide(); toast('Playlist ajoutée à ta bibliothèque (privée)');
}

