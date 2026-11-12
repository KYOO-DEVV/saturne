/* ---------- Lecteurs : YouTube (iframe cachée) et SoundCloud (widget officiel, iframe cachée). Seul le son est utilisé. ---------- */
/* `player` est une façade qui parle au lecteur du titre en cours, avec les noms de méthodes de l'API YouTube : le reste de l'application ne sait pas quel lecteur joue. */
let player = null, ready = false, ytReady = false, ytp = null, ytLoading = false, pendingLoad = false, playing = false, errStreak = 0, seeking = false, lastLogged = '';
const isSc = t => !!t && t.src === 'sc';
const guard = (f, d) => { try { const v = f(); return v === undefined || v === null ? d : v; } catch { return d; } };
const ytE = {
  play(){ if (ytReady) guard(() => ytp.playVideo()); }, pause(){ if (ytReady) guard(() => ytp.pauseVideo()); }, stop(){ if (ytReady) guard(() => ytp.stopVideo()); },
  seek(s){ if (ytReady) guard(() => ytp.seekTo(s, true)); }, time(){ return ytReady ? guard(() => ytp.getCurrentTime() || 0, 0) : 0; }, dur(){ return ytReady ? guard(() => ytp.getDuration() || 0, 0) : 0; },
  state(){ return ytReady ? guard(() => ytp.getPlayerState(), -1) : -1; }, vol(v){ if (ytReady) guard(() => ytp.setVolume(v)); }, mute(){ if (ytReady) guard(() => ytp.mute()); }, unmute(){ if (ytReady) guard(() => ytp.unMute()); }
};
/* SoundCloud : état gardé ici (le widget répond par rappels, l'application a besoin de réponses immédiates). États comme YouTube : 1 lecture, 2 pause, 3 chargement, 0 fin. */
const scE = {
  w:null, ready:false, pos:0, at:0, dur_:0, vol_:null, st:-1, muted:false, apiCbs:null,
  play(){ if (this.w && this.ready) guard(() => this.w.play()); }, pause(){ if (this.w) guard(() => this.w.pause()); }, stop(){ this.pause(); },
  seek(s){ if (this.w && this.ready) { guard(() => this.w.seekTo(s * 1000)); this.pos = s; this.at = performance.now(); } },
  time(){ const t = this.st === 1 ? this.pos + (performance.now() - this.at) / 1000 : this.pos; return this.dur_ ? Math.min(t, this.dur_) : t; },
  dur(){ return this.dur_ || 0; }, state(){ return this.st; },
  vol(v){ this.vol_ = v; if (this.w && this.ready && !this.muted) guard(() => this.w.setVolume(v)); },
  mute(){ this.muted = true; if (this.w && this.ready) guard(() => this.w.setVolume(0)); }, unmute(){ this.muted = false; if (this.w && this.ready) guard(() => this.w.setVolume(this.vol_ ?? S.volume)); }
};
const engine = () => isSc(current()) ? scE : ytE;
player = {
  playVideo:() => engine().play(), pauseVideo:() => engine().pause(), stopVideo:() => { ytE.stop(); scE.stop(); }, seekTo:s => engine().seek(s), getCurrentTime:() => engine().time(), getDuration:() => engine().dur(), getPlayerState:() => engine().state(),
  setVolume:v => { ytE.vol(v); scE.vol(v); }, mute:() => { ytE.mute(); scE.mute(); }, unMute:() => { ytE.unmute(); scE.unmute(); }
};
const syncReady = () => { ready = isSc(current()) ? scE.ready : ytReady; };

function loadYT(){
  if (ytLoading) return; ytLoading = true;
  window.onYouTubeIframeAPIReady = () => { ytp = new YT.Player('yt', {width:'200', height:'200', playerVars:{playsinline:1, rel:0, controls:0, disablekb:1, origin:location.origin, widget_referrer:location.origin}, events:{onReady, onStateChange, onError}}); };
  const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = () => toast('Le lecteur n\'a pas pu se charger. Vérifie ta connexion puis relance Saturne.');
  setTimeout(() => { if (!ytReady && !isSc(current())) toast('Le lecteur met du temps à démarrer… vérifie ta connexion internet.'); }, 12000);
  document.head.appendChild(s);
}
function onReady(){
  ytReady = true; syncReady(); ytp.setVolume(S.volume);
  const t = current();
  if (t && !isSc(t)) { if (pendingLoad) { ytp.loadVideoById(playId(t)); armWatchdog(); } else ytp.cueVideoById(playId(t)); }
  pendingLoad = false;
}
function onStateChange(e){
  playing = e.data === 1 || e.data === 3;
  if (e.data === 1 || e.data === 0) clearTimeout(wd);
  if (e.data === 1) {
    errStreak = 0; const t = current();
    if (t) {
      const dur = player.getDuration(); if (!t.duration && dur) { t.duration = Math.round(dur); save(); }
      if (lastLogged !== t.id) { lastLogged = t.id; S.history = [slim(t), ...S.history.filter(x => x.id !== t.id)].slice(0, 24); S.plays.push([t.id, t.title.slice(0, 120), t.channel.slice(0, 60), t.channelId || '', Date.now(), t.duration || 0, ...(isSc(t) ? [t.thumb || '', t.url || ''] : [])]); if (S.plays.length > 1000) S.plays.splice(0, S.plays.length - 1000); save(); if (['home', 'library', 'history'].includes(S.view.type)) renderView(); }
    }
  }
  if (e.data === 0 && S.sleep && S.sleep.track) { S.sleep = null; playing = false; updateSleepBtn(); toast(L('Sleep timer finished: playback stopped', 'Minuterie terminée : lecture arrêtée')); }
  else if (e.data === 0) { if (S.settings.autoplay || S.repeat === 'one') next(true); else playing = false; }
  renderBar();
}
function onError(e){
  const t = current(), code = e && e.data, why = isSc(t) ? 'lecture impossible sur SoundCloud' : (ERR_TEXT[code] || ('erreur ' + code));
  logPlayer(t, why); recover(t, why);
}

/* --- SoundCloud : widget officiel (https://developers.soundcloud.com/docs/api/html5-widget) --- */
function scApi(cb){
  if (window.SC && window.SC.Widget) return cb(true);
  if (scE.apiCbs) { scE.apiCbs.push(cb); return; } scE.apiCbs = [cb];
  const s = document.createElement('script'); s.src = 'https://w.soundcloud.com/player/api.js';
  const done = ok => { const l = scE.apiCbs || []; scE.apiCbs = null; l.forEach(f => f(ok)); if (!ok) toast(L('The SoundCloud player could not load. Check your connection.', 'Le lecteur SoundCloud n’a pas pu se charger. Vérifie ta connexion.')); };
  s.onload = () => done(!!(window.SC && window.SC.Widget)); s.onerror = () => done(false); document.head.appendChild(s);
}
const scParams = 'auto_play=true&visual=false&show_artwork=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&buying=false&sharing=false&download=false';
function scBind(w){
  const EV = SC.Widget.Events;
  w.bind(EV.READY, () => { scE.ready = true; syncReady(); guard(() => w.setVolume(scE.muted ? 0 : (scE.vol_ ?? S.volume))); guard(() => w.getDuration(d => { scE.dur_ = (d || 0) / 1000; })); });
  w.bind(EV.PLAY, () => { scE.st = 1; scE.at = performance.now(); guard(() => w.getDuration(d => { scE.dur_ = (d || 0) / 1000; const t = current(); if (isSc(t) && !t.duration && scE.dur_) { t.duration = Math.round(scE.dur_); save(); } onStateChange({data:1}); })); });
  w.bind(EV.PAUSE, () => { scE.st = 2; onStateChange({data:2}); });
  w.bind(EV.FINISH, () => { scE.st = 0; onStateChange({data:0}); });
  w.bind(EV.PLAY_PROGRESS, d => { scE.pos = (d.currentPosition || 0) / 1000; scE.at = performance.now(); });
  w.bind(EV.ERROR, () => { scE.st = -1; onError({data:150}); });
}
function scLoad(t){
  scE.st = 3; scE.pos = 0; scE.dur_ = t.duration || 0; scE.at = performance.now(); syncReady();
  scApi(ok => {
    const c = current(); if (!ok || !c || c.id !== t.id) return;
    if (!scE.w) {
      const f = document.createElement('iframe'); f.id = 'scw'; f.className = 'scbox'; f.setAttribute('allow', 'autoplay'); f.title = 'SoundCloud'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(t.url) + '&' + scParams; document.body.appendChild(f);
      scE.w = SC.Widget(f); scBind(scE.w);
    } else { scE.ready = true; syncReady(); scE.w.load(t.url, {auto_play:true, visual:false, show_artwork:false, hide_related:true, show_comments:false, show_user:false, buying:false, sharing:false, download:false, callback:() => guard(() => scE.w.setVolume(scE.muted ? 0 : (scE.vol_ ?? S.volume)))}); }
  });
  armWatchdog();
}
function loadCurrent(){
  const t = current(); if (!t) return;
  if (isSc(t)) { ytE.stop(); scLoad(t); }
  else { scE.pause(); scE.st = -1; syncReady(); if (ytReady) { ytp.loadVideoById(playId(t)); armWatchdog(); } else pendingLoad = true; }
  syncReady(); save(); renderBar(); renderSide(); markPlaying(); if (S.view.type === 'now' || S.view.type === 'library') renderView();
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
  if (isSc(current()) && !scE.ready) return loadCurrent();
  if (!ready) { pendingLoad = true; return; }
  if (player.getPlayerState() === 1) player.pauseVideo(); else player.playVideo();
}
function addToQueue(t){
  S.queue.push(slim(t));
  if (S.cur < 0) { S.cur = S.queue.length - 1; rebuildOrder(); loadCurrent(); }
  else { S.order.push(S.queue.length - 1); save(); render(); }
  toast('Ajouté à la file d\'attente');
}
function stopPlayer(){ playing = false; player.stopVideo(); }
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

