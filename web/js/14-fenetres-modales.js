/* ---------- Fenêtres modales ---------- */
function openModal(html, mount){
  const m = $('#mbox'); if ($('#modal').hidden) { const a = document.activeElement; modalReturn = (a && a !== document.body && !$('#menu').contains(a)) ? a : menuOpener; }
  m.innerHTML = html; injectIcons(m); $('#modal').hidden = false;
  const h = m.querySelector('h3'); m.setAttribute('aria-label', h ? h.textContent : '');
  const f = m.querySelector('input,textarea') || m.querySelector('.btn,button'); if (f) setTimeout(() => f.focus(), 30);
  if (mount) mount(m);
}
function closeModal(){
  const was = !$('#modal').hidden; $('#modal').hidden = true; $('#mbox').innerHTML = '';
  if (was && modalReturn && modalReturn.isConnected) { try { modalReturn.focus(); } catch {} } modalReturn = null;
}
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
$('#mbox').addEventListener('click', e => { if (e.target.closest('[data-mclose]')) closeModal(); });
/* Formulaire modal : champs, bouton d'envoi, erreur affichée sous le formulaire. */
function formModal({title, lead, fields, submit, danger, run}){
  openModal(`<h3>${title}</h3><p>${lead || ''}</p><form id="mf" autocomplete="off">${fields.map(f => `<div class="fld"><label for="${f.id}">${f.label}</label><input class="input" id="${f.id}" type="${f.type || 'text'}" ${f.max ? `maxlength="${f.max}"` : ''} placeholder="${f.ph || ''}" ${f.ac ? `autocomplete="${f.ac}"` : ''} value="${esc(f.value || '')}"></div>`).join('')}
    <div class="merr" id="mErr" role="alert"></div><div class="mactions"><button type="button" class="ghost" data-mclose>Annuler</button><button class="btn" ${danger ? 'style="background:#e11d48"' : ''}>${submit}</button></div></form>`,
  m => m.querySelector('#mf').addEventListener('submit', async e => {
    e.preventDefault(); const btn = m.querySelector('.btn'); btn.disabled = true; $('#mErr').textContent = '';
    try { await run(Object.fromEntries(fields.map(f => [f.id, $('#' + f.id).value]))); }
    catch (err) { $('#mErr').textContent = err.message || 'Erreur'; btn.disabled = false; }
  }));
}
function profileModal(draft){
  const u = S.user;
  openModal(`<h3>Edit profile</h3><p>Change ta photo et ton nom affiché. Tu peux aussi déposer une image sur la photo.</p>
    <form id="pf"><div class="avatar-edit"><button type="button" class="avatar-big" id="pfAvatar" data-drop="avatar" aria-label="Changer la photo">${avatarHtml(u)}</button>
      <div style="display:grid;gap:8px"><button type="button" class="ghost" id="pfPick">${ic('image')}Choisir une photo</button>${u.avatar ? '<button type="button" class="ghost" id="pfRemove">Retirer la photo</button>' : ''}</div></div>
      <div class="fld"><label for="pfName">NOM AFFICHÉ</label><input class="input" id="pfName" value="${esc(draft ?? u.display)}" maxlength="40"></div>
      <div class="merr" id="pfErr" role="alert"></div>
      <div class="mactions"><button type="button" class="ghost" data-mclose>Fermer</button><button class="btn">Enregistrer</button></div></form>`,
  m => {
    m.querySelector('#pfAvatar').addEventListener('click', () => pickImage('avatar'));
    m.querySelector('#pfPick').addEventListener('click', () => pickImage('avatar'));
    const rm = m.querySelector('#pfRemove');
    if (rm) rm.addEventListener('click', async () => { try { S.user = (await send('/api/me', {avatar:''}, 'PUT')).user; render(); profileModal($('#pfName').value); toast('Photo retirée'); } catch (e) { $('#pfErr').textContent = e.message; } });
    m.querySelector('#pf').addEventListener('submit', async e => {
      e.preventDefault(); const d = $('#pfName').value.trim(); if (!d) return $('#pfErr').textContent = 'Le nom affiché ne peut pas être vide';
      try { S.user = (await send('/api/me', {display:d}, 'PUT')).user; render(); closeModal(); toast('Profil mis à jour'); } catch (err) { $('#pfErr').textContent = err.message; }
    });
  });
}
async function uploadAvatar(f){
  try {
    const url = URL.createObjectURL(f), data = await toDataURL(url, 192, 192, true); URL.revokeObjectURL(url);
    S.user = (await send('/api/me', {avatar:data}, 'PUT')).user; render(); toast('Photo de profil mise à jour');
    if (!$('#modal').hidden && $('#pfAvatar')) profileModal($('#pfName') ? $('#pfName').value : undefined);
  } catch (e) { toast(e.message === 'image' ? 'Impossible de lire cette image' : e.message); }
}
const usernameModal = () => formModal({title:'Changer l\'identifiant', lead:'Ton identifiant sert à te connecter. Tes playlists et ton historique sont conservés.', submit:'Changer',
  fields:[{id:'muName', label:'NOUVEL IDENTIFIANT', max:24, ph:S.user.username, ac:'username'}, {id:'muPass', label:'MOT DE PASSE ACTUEL', type:'password', ac:'current-password'}],
  run: async v => { S.user = (await send('/api/me/username', {username:v.muName, password:v.muPass})).user; render(); closeModal(); toast('Identifiant changé : @' + S.user.username); }});
const passwordModal = () => formModal({title:'Changer le mot de passe', lead:'Au moins 8 caractères. Tes autres sessions seront fermées.', submit:'Changer',
  fields:[{id:'mpOld', label:'MOT DE PASSE ACTUEL', type:'password', ac:'current-password'}, {id:'mpNew', label:'NOUVEAU MOT DE PASSE', type:'password', ac:'new-password', max:200}, {id:'mpNew2', label:'CONFIRMER', type:'password', ac:'new-password', max:200}],
  run: async v => { if (v.mpNew !== v.mpNew2) throw new Error('Les deux mots de passe sont différents'); await send('/api/me/password', {current:v.mpOld, new:v.mpNew}); closeModal(); toast('Mot de passe changé'); }});
const deleteModal = () => formModal({title:'Supprimer le compte', lead:'Cette action est définitive : ton compte, tes playlists et ton historique seront supprimés de cet ordinateur.', submit:'Supprimer', danger:true,
  fields:[{id:'mdPass', label:'MOT DE PASSE', type:'password', ac:'current-password'}],
  run: async v => { await send('/api/me/delete', {password:v.mdPass}); location.reload(); }});

