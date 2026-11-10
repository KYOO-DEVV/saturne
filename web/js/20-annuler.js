/* ---------- Annuler ---------- */
function deletePlaylist(p){
  const idx = S.playlists.indexOf(p);
  S.playlists = S.playlists.filter(x => x.id !== p.id); save();
  toast('Playlist « ' + p.name + ' » supprimée', {undo:() => { S.playlists.splice(Math.min(idx, S.playlists.length), 0, p); save(); render(); }});
}
function removeTrackAt(list, i){
  const [rm] = list.splice(i, 1); save(); render();
  toast('Titre retiré', {undo:() => { list.splice(Math.min(i, list.length), 0, rm); save(); render(); }});
}

