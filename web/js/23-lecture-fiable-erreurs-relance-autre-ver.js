/* ---------- Lecture fiable : erreurs, relance, autre version ---------- */
const altMap = (() => { try { return JSON.parse(localStorage.getItem('saturne.alt2') || '{}'); } catch { return {}; } })();
const saveAlt = () => { try { localStorage.setItem('saturne.alt2', JSON.stringify(Object.fromEntries(Object.entries(altMap).slice(-300)))); } catch {} };
const playId = t => altMap[t.id] || t.id;
const ERR_TEXT = {2:'identifiant invalide', 5:'erreur du lecteur', 100:'vidéo introuvable ou privée', 101:'lecture interdite hors de YouTube', 150:'lecture interdite hors de YouTube'};
const playerLog = [];
const logPlayer = (t, msg) => { playerLog.unshift({at:Date.now(), title:t ? t.title : '?', msg}); playerLog.length = Math.min(playerLog.length, 8); if (S.view.type === 'settings' && S.setTab === 'playback') renderView(); };
const triedAlt = new Map();
let wd = 0, wdStage = 0, recovering = '';
function armWatchdog(){
  clearTimeout(wd); wdStage = 0;
  const id = current() && current().id;
  const tick = () => {
    const t = current(); if (!t || t.id !== id || !ready) return;
    let st; try { st = player.getPlayerState(); } catch { st = -1; }
    if (st === 1 || st === 0 || st === 2) return; // lecture, fin ou pause voulue
    wdStage++;
    if (wdStage === 1) { try { player.playVideo(); } catch {} wd = setTimeout(tick, 5000); }
    else { logPlayer(t, st === 3 ? 'bloqué en chargement' : 'ne démarre pas'); recover(t, st === 3 ? 'chargement bloqué' : 'ne démarre pas'); }
  };
  wd = setTimeout(tick, 7000);
}
function giveUp(t, why){
  const name = '« ' + t.title.slice(0, 40) + ' »';
  if (S.queue.length > 1 && S.pos + 1 < S.order.length) { toast('Impossible de lire ' + name + ', je passe au suivant'); next(false); }
  else toast('Impossible de lire ' + name + ' (' + why + ')');
}
async function recover(t, why){
  if (!t || recovering === t.id) return;
  clearTimeout(wd);
  const tried = triedAlt.get(t.id) || [];
  if (tried.length >= 2) return giveUp(t, why);
  recovering = t.id; toast('« ' + t.title.slice(0, 40) + ' » ne se lance pas (' + why + '). Je cherche une autre version…');
  try {
    const j = await api('alt', {id:t.id, title:t.title, channel:t.channel, dur:t.duration || 0, skip:[playId(t), ...tried].join(',')});
    tried.push(j.id); triedAlt.set(t.id, tried); altMap[t.id] = j.id; saveAlt();
    recovering = '';
    if (current() && current().id === t.id) { loadCurrent(); toast('Autre version trouvée'); }
  } catch { recovering = ''; giveUp(t, why); }
}
const playerLogHtml = () => setRow('Dernières erreurs du lecteur', playerLog.length ? `<ul class="plog">${playerLog.map(l => `<li><b>${esc(l.title.slice(0, 46))}</b> : ${esc(l.msg)} <span style="color:var(--faint)">(${new Date(l.at).toLocaleTimeString()})</span></li>`).join('')}</ul>` : 'Aucune erreur pour le moment.', '');

