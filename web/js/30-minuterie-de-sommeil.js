/* ---------- Minuterie de sommeil ---------- */
const sleepLabel = () => {
  const s = S.sleep; if (!s) return L('Sleep timer', 'Minuterie de sommeil');
  if (s.track) return L('Sleep timer: end of this track', 'Minuterie : fin de ce titre');
  return L('Sleep timer: ', 'Minuterie : ') + Math.max(1, Math.ceil((s.at - Date.now()) / 60000)) + ' min';
};
function updateSleepBtn(){ const b = $('#bSleep'); if (!b) return; b.classList.toggle('act', !!S.sleep); b.title = sleepLabel(); b.setAttribute('aria-label', sleepLabel()); }
function setSleep(v){
  try { if (ready && S.sleep) player.setVolume(S.volume); } catch {}
  if (v === 'off') S.sleep = null; else if (v === 'track') S.sleep = {track:true}; else S.sleep = {at:Date.now() + (+v) * 60000};
  updateSleepBtn(); toast(S.sleep ? sleepLabel() : L('Sleep timer off', 'Minuterie désactivée'));
}
function openSleepMenu(btn){
  menuTrack = null; const m = $('#menu');
  m.innerHTML = `<div class="label">${L('Sleep timer', 'Minuterie de sommeil')}</div>` + [[15, L('15 minutes', '15 minutes')], [30, L('30 minutes', '30 minutes')], [45, L('45 minutes', '45 minutes')], [60, L('1 hour', '1 heure')]].map(([v, n]) => `<button data-sleep="${v}">${n}</button>`).join('') +
    `<button data-sleep="track">${L('End of this track', 'Fin de ce titre')}</button>` + (S.sleep ? `<button class="danger" data-sleep="off">${L('Turn off timer', 'Désactiver la minuterie')}</button>` : '');
  placeMenu(btn);
}
setInterval(() => {
  const s = S.sleep; updateSleepBtn(); if (!s || !s.at) return;
  const left = s.at - Date.now();
  if (left <= 0) { S.sleep = null; try { player.pauseVideo(); player.setVolume(S.volume); } catch {} updateSleepBtn(); toast(L('Sleep timer finished: playback paused', 'Minuterie terminée : lecture en pause')); return; }
  if (left < 15000 && ready) { try { player.setVolume(Math.max(1, Math.round(S.volume * left / 15000))); } catch {} }
}, 1000);

