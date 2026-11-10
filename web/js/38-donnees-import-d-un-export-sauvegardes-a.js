/* ---------- Données : import d'un export, sauvegardes automatiques ---------- */
async function loadBackups(){
  try { S.backups = (await http('/api/backups')).items; } catch { S.backups = []; }
  if (S.view.type === 'settings' && S.setTab === 'data') renderView();
}
const importRow = () => setRow(L('Import data', 'Importer des données'), L('Restores a file exported by Saturne, by merging it with or replacing your data.', 'Restaure un fichier exporté par Saturne, en le fusionnant avec tes données ou en les remplaçant.'), `<button class="ghost" data-act="importdata">${ic('upload')}${L('Import', 'Importer')}</button>`);
const backupRow = () => `<h4>${L('Automatic backups', 'Sauvegardes automatiques')}</h4><div class="set" style="display:block"><p class="lead" style="margin:0 0 10px;font-size:13px">${L('Saturne keeps the last 10 backups of your account, at most one per hour. Restoring one first backs up your current data.', "Saturne garde les 10 dernières sauvegardes de ton compte, une par heure au plus. Restaurer l'une d'elles sauvegarde d'abord tes données actuelles.")}</p>${
  S.backups === null ? '<span class="hint" style="padding:0">…</span>' : S.backups.length
    ? `<ul class="bklist">${S.backups.map(b => `<li><span>${esc(new Date(b.ts * 1000).toLocaleString(dateLocale()))} · ${Math.max(1, Math.round(b.size / 1024))} ${L('KB', 'Ko')}</span><button class="ghost" data-act="restorebk" data-ts="${b.ts}">${L('Restore', 'Restaurer')}</button></li>`).join('')}</ul>`
    : `<span class="hint" style="padding:0">${L('No backups yet.', 'Aucune sauvegarde pour le moment.')}</span>`}</div>`;
function restoreModal(ts){
  const when = new Date(ts * 1000).toLocaleString(dateLocale());
  openModal(`<h3>${L('Restore this backup?', 'Restaurer cette sauvegarde ?')}</h3><p>${esc(when)}<br>${L('Your current playlists, queue and settings will be replaced. A backup of them is made first.', 'Tes playlists, ta file et tes réglages actuels seront remplacés. Ils sont sauvegardés avant.')}</p>
    <div class="merr" id="rsErr" role="alert"></div><div class="mactions"><button class="ghost" data-mclose>${L('Cancel', 'Annuler')}</button><button class="btn" id="rsGo">${L('Restore', 'Restaurer')}</button></div>`,
  m => m.querySelector('#rsGo').addEventListener('click', async e => {
    e.target.disabled = true;
    try { await send('/api/backups/restore', {ts}); applyData(await http('/api/data')); rebuildOrder(); closeModal(); render(); loadBackups(); toast(L('Backup restored', 'Sauvegarde restaurée')); }
    catch (err) { $('#rsErr').textContent = errText(err); e.target.disabled = false; }
  }));
}
function mergeData(d){
  let pl = 0, tr = 0;
  (Array.isArray(d.playlists) ? d.playlists : []).forEach(p => {
    if (!p || typeof p !== 'object' || !Array.isArray(p.tracks)) return;
    const tracks = p.tracks.filter(t => t && /^[\w-]{11}$/.test(t.id)).map(slim);
    if (p.id === 'favs') { const f = favs(); tracks.forEach(t => { if (!f.tracks.some(x => x.id === t.id)) { f.tracks.push(t); tr++; } }); return; }
    if (!p.id || S.playlists.some(x => x.id === p.id)) return;
    S.playlists.push({...p, id:String(p.id).slice(0, 40), name:String(p.name || 'Playlist').slice(0, 60), tracks, visibility:'private', created:p.created || Date.now()}); pl++; tr += tracks.length;
  });
  return {pl, tr};
}
function importDataModal(d){
  const n = d.playlists.filter(p => p && Array.isArray(p.tracks) && p.id !== 'favs').length, t = d.playlists.reduce((a, p) => a + (p && Array.isArray(p.tracks) ? p.tracks.length : 0), 0);
  openModal(`<h3>${L('Import data', 'Importer des données')}</h3><p>${L(`This file contains ${n} playlist${n > 1 ? 's' : ''} and ${t} songs.`, `Ce fichier contient ${n} playlist${n > 1 ? 's' : ''} et ${t} titres.`)}</p>
    <p><b>${L('Merge', 'Fusionner')}</b> ${L('adds what is missing and keeps everything you have.', 'ajoute ce qui manque et garde tout ce que tu as.')}<br><b>${L('Replace', 'Remplacer')}</b> ${L('swaps all your playlists, queue and settings for the file’s content (a backup is made first).', 'remplace toutes tes playlists, ta file et tes réglages par le contenu du fichier (une sauvegarde est faite avant).')}</p>
    <div class="mactions"><button class="ghost" data-mclose>${L('Cancel', 'Annuler')}</button><button class="ghost" id="idRep">${L('Replace', 'Remplacer')}</button><button class="btn" id="idMerge">${L('Merge', 'Fusionner')}</button></div>`,
  m => {
    m.querySelector('#idMerge').addEventListener('click', () => { const r = mergeData(d); save(); closeModal(); render(); toast(L(`Merged: ${r.pl} playlists, ${r.tr} songs added`, `Fusion : ${r.pl} playlists, ${r.tr} titres ajoutés`)); });
    m.querySelector('#idRep').addEventListener('click', async () => {
      try { await http('/api/data', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload())}); } catch {}
      applyData(d); rebuildOrder(); save(); closeModal(); render(); toast(L('Data replaced', 'Données remplacées'));
    });
  });
}
$('#dataPick').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    if (f.size > 16 * 1024 * 1024) throw new Error('size');
    const d = JSON.parse(await f.text());
    if (!d || typeof d !== 'object' || !Array.isArray(d.playlists)) throw new Error('shape');
    importDataModal(d);
  } catch { toast(L("This file isn't a Saturne export", "Ce fichier n'est pas un export Saturne")); }
});

