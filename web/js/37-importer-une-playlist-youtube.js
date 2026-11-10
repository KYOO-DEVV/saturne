/* ---------- Importer une playlist YouTube ---------- */
const ytListId = s => { const m = /[?&]list=([\w-]{2,64})/.exec(String(s)); return m && /youtu/.test(s) ? m[1] : null; };
function ytImportModal(url){
  const id = ytListId(url);
  openModal(`<h3>${L('Import from YouTube', 'Importer depuis YouTube')}</h3><p id="yiMsg">${L('Loading the playlist…', 'Chargement de la playlist…')}</p><div class="mactions"><button class="ghost" data-mclose>${L('Cancel', 'Annuler')}</button></div>`);
  const fail = msg => { const m = $('#yiMsg'); if (m) m.textContent = msg; };
  if (!id) return fail(L('This link has no playlist in it.', "Ce lien ne contient pas de playlist."));
  if (/^RD/.test(id)) return fail(L("YouTube mixes can't be imported. Use “Start radio” on a song instead.", 'Les mix YouTube ne sont pas importables. Utilise « Lancer la radio » sur un titre.'));
  api('playlist', {list:id}).then(j => {
    if (!$('#yiMsg')) return;
    const n = j.tracks.length, name = (j.title || L('YouTube playlist', 'Playlist YouTube')).slice(0, 60);
    openModal(`<h3>${esc(name)}</h3><p>${j.owner ? esc(j.owner) + ' · ' : ''}${n} ${n > 1 ? L('songs', 'titres') : L('song', 'titre')}${n >= 300 ? ' ' + L('(the first 300)', '(les 300 premiers)') : ''}</p>
      <div class="mactions"><button class="ghost" data-mclose>${L('Cancel', 'Annuler')}</button><button class="ghost" id="yiPlay">${ic('play')}${L('Play now', 'Lire maintenant')}</button><button class="btn" id="yiAdd">${ic('upload')}${L('Import', 'Importer')}</button></div>`,
    m => {
      m.querySelector('#yiPlay').addEventListener('click', () => { closeModal(); S.shuffle = false; playList(j.tracks, 0); });
      m.querySelector('#yiAdd').addEventListener('click', () => {
        const p = {id:Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, description:j.owner ? L('Imported from YouTube · ', 'Importée depuis YouTube · ') + j.owner : '', tracks:j.tracks.map(slim), visibility:'private', created:Date.now()};
        S.playlists.push(p); save(); closeModal(); go({type:'playlist', id:p.id}); toast(L('Imported ', 'Importé : ') + n + ' ' + (n > 1 ? L('songs', 'titres') : L('song', 'titre')));
      });
    });
  }).catch(e => fail(errText(e)));
}
function importModal(){
  openModal(`<h3>${L('Import a playlist', 'Importer une playlist')}</h3><p>${L('Paste a <b>SATURNE1…</b> share code from a friend, or the link of a public YouTube playlist. The playlist is added to your library, privately.', "Colle un code de partage <b>SATURNE1…</b> reçu d'un ami, ou le lien d'une playlist YouTube publique. La playlist est ajoutée à ta bibliothèque, en privé.")}</p>
    <form id="imf"><textarea class="codebox" id="imCode" placeholder="SATURNE1.…  /  https://www.youtube.com/playlist?list=…" aria-label="${L('Share code or link', 'Code ou lien')}"></textarea><div class="merr" id="imErr" role="alert"></div>
    <div class="mactions"><button type="button" class="ghost" data-mclose>${L('Cancel', 'Annuler')}</button><button class="btn">${ic('upload')}${L('Import', 'Importer')}</button></div></form>`,
  m => m.querySelector('#imf').addEventListener('submit', async e => {
    e.preventDefault();
    const raw = $('#imCode').value.trim(); if (ytListId(raw)) return ytImportModal(raw);
    try {
      const d = await decodeShare(raw);
      const p = {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name:d.name, description:d.description, tracks:d.tracks, visibility:'private', created:Date.now()};
      S.playlists.push(p); save(); closeModal(); go({type:'playlist', id:p.id}); toast(`Playlist importée : ${plural(p.tracks.length, 'titre')}`);
    } catch (err) { $('#imErr').textContent = err.message; }
  }));
}

