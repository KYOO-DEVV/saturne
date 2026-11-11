/* ---------- Lecteur YouTube (caché : seul le son est utilisé) ---------- */
let player = null, ready = false, ytLoading = false, pendingLoad = false, playing = false, errStreak = 0, seeking = false, lastLogged = '';
function loadYT(){
  if (ytLoading) return; ytLoading = true;
  window.onYouTubeIframeAPIReady = () => { player = new YT.Player('yt', {width:'200', height:'200', playerVars:{playsinline:1, rel:0, controls:0, disablekb:1, origin:location.origin, widget_referrer:location.origin}, events:{onReady, onStateChange, onError}}); };
  const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = () => toast('Le lecteur n\'a pas pu se charger. Vérifie ta connexion puis relance Saturne.');
  setTimeout(() => { if (!ready) toast('Le lecteur met du temps à démarrer… vérifie ta connexion internet.'); }, 12000);
  document.head.appendChild(s);
}
function onReady(){
  ready = true; player.setVolume(S.volume);
  const t = current();
  if (t) { if (pendingLoad) { player.loadVideoById(playId(t)); armWatchdog(); } else player.cueVideoById(playId(t)); }
  pendingLoad = false;
}
function onStateChange(e){
  playing = e.data === 1 || e.data === 3;
  if (e.data === 1 || e.data === 0) clearTimeout(wd);
  if (e.data === 1) {
    errStreak = 0; const t = current();
    if (t) {
      const dur = player.getDuration(); if (!t.duration && dur) { t.duration = Math.round(dur); save(); }
      if (lastLogged !== t.id) { lastLogged = t.id; S.history = [slim(t), ...S.history.filter(x => x.id !== t.id)].slice(0, 24); S.plays.push([t.id, t.title.slice(0, 120), t.channel.slice(0, 60), t.channelId || '', Date.now(), t.duration || 0]); if (S.plays.length > 1000) S.plays.splice(0, S.plays.length - 1000); save(); if (['home', 'library', 'history'].includes(S.view.type)) renderView(); }
    }
  }
  if (e.data === 0 && S.sleep && S.sleep.track) { S.sleep = null; playing = false; updateSleepBtn(); toast(L('Sleep timer finished: playback stopped', 'Minuterie terminée : lecture arrêtée')); }
  else if (e.data === 0) { if (S.settings.autoplay || S.repeat === 'one') next(true); else playing = false; }
  renderBar();
}
function onError(e){
  const code = e && e.data, why = ERR_TEXT[code] || ('erreur ' + code), t = current();
  logPlayer(t, why); recover(t, why);
}
function loadCurrent(){
  const t = current(); if (!t) return;
  if (ready) { player.loadVideoById(playId(t)); armWatchdog(); } else pendingLoad = true;
  save(); renderBar(); renderSide(); markPlaying(); if (S.view.type === 'now' || S.view.type === 'library') renderView();
}
function rebuildOrder(){
  const idx = S.queue.map((_, i) => i);
  if (S.shuffle) { const rest = shuffleArr(idx.filter(i => i !== S.cur)); S.order = S.cur >= 0 ? [S.cur, ...rest] : rest; S.pos = S.cur >= 0 ? 0 : -1; }
  else { S.order = idx; S.pos = S.cur; }
}
function playList(tracks, i){ S.queue = tracks.map(slim); S.cur = i; rebuildOrder(); const p = curPl(); if (p) { p.lastPlayed = Date.now(); } loadCurrent(); }
function jump(i){ S.cur = i; S.pos = S.order.indexOf(i); loadCurrent(); }
function next(auto){
  if (!S.queue.length) return;
  if (auto && S.repeat === 'one' && ready) { player.seekTo(0, true); player.playVideo(); return; }
  if (S.pos + 1 < S.order.length) S.pos++;
  else if (S.repeat === 'all') { if (S.shuffle) { S.cur = -1; rebuildOrder(); } S.pos = 0; }
  else { if (auto && S.settings.endless !== false && S.queue.length) { endlessNext(); return; } if (!auto) toast('Fin de la file d\'attente'); return; }
  S.cur = S.order[S.pos]; loadCurrent();
}
function prev(){
  if (!current() || !ready) return;
  if (player.getCurrentTime() > 3 || S.pos <= 0) { player.seekTo(0, true); return; }
  S.pos--; S.cur = S.order[S.pos]; loadCurrent();
}
function togglePlay(){
  if (!current()) return toast('Choisis d\'abord un titre');
  if (!ready) { pendingLoad = true; return; }
  if (player.getPlayerState() === 1) player.pauseVideo(); else player.playVideo();
}
function addToQueue(t){
  S.queue.push(slim(t));
  if (S.cur < 0) { S.cur = S.queue.length - 1; rebuildOrder(); loadCurrent(); }
  else { S.order.push(S.queue.length - 1); save(); render(); }
  toast('Ajouté à la file d\'attente');
}
function stopPlayer(){ playing = false; if (ready) player.stopVideo(); }
function removeFromQueue(i){
  const wasCur = i === S.cur;
  S.queue.splice(i, 1);
  if (i < S.cur) S.cur--;
  if (wasCur) {
    if (S.queue.length) { S.cur = Math.min(i, S.queue.length - 1); rebuildOrder(); loadCurrent(); return; }
    S.cur = -1; stopPlayer();
  }
  rebuildOrder(); save(); render();
}
function clearQueue(){
  const prev = [...S.queue], prevCur = S.cur; if (!prev.length) return;
  S.queue = []; S.cur = -1; rebuildOrder(); stopPlayer(); save(); render();
  toast('File d\'attente vidée', {undo:() => { S.queue = prev; S.cur = prevCur; rebuildOrder(); save(); render(); }});
}

