/* ---------- Bureau : touches multimédia, mini-lecteur, icône de notification ---------- */
const NATIVE = !!(window.ipc && window.ipc.postMessage);
const native = cmd => { if (NATIVE) { try { window.ipc.postMessage(cmd); } catch {} } };
function applyNative(){
  native(S.settings.mediaKeys ? 'media:on' : 'media:off');
  native(S.settings.tray ? 'tray:on' : 'tray:off');
  native(S.settings.startMin && S.settings.tray ? 'startmin:on' : 'startmin:off');
}
let lastMedia = 0;
/* Commande de lecture venue d'une touche multimédia (Windows) ou de l'icône de notification. Un petit délai évite le double déclenchement. */
function mediaCmd(cmd){
  native('media-cmd:' + cmd); // trace pour le mode SATURNE_DEBUG
  if (!S.user) return;
  const now = Date.now(); if (now - lastMedia < 350) return; lastMedia = now;
  if (cmd === 'playpause') togglePlay();
  else if (cmd === 'play') { if (!playing) togglePlay(); }
  else if (cmd === 'pause') { if (playing) togglePlay(); }
  else if (cmd === 'next') next(false);
  else if (cmd === 'prev') prev();
  else if (cmd === 'stop') { if (ready) { try { player.pauseVideo(); } catch {} } }
}
window.__media = mediaCmd;
/* Media Session : titre et pochette dans la surcouche multimédia de Windows. Le son vient d'un lecteur YouTube dans un cadre : un fichier audio silencieux en boucle
   indique au navigateur que la page « joue », ce qui active la surcouche. */
const silence = (() => {
  try {
    const rate = 8000, n = rate * 10, b = new Uint8Array(44 + n), dv = new DataView(b.buffer), w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, rate, true); dv.setUint32(28, rate, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true); b.fill(128, 44);
    const a = new Audio(URL.createObjectURL(new Blob([b], {type:'audio/wav'}))); a.loop = true; a.volume = 0.01; return a;
  } catch { return null; }
})();
let msKey = '';
function syncMediaSession(){
  if (!('mediaSession' in navigator)) return;
  const t = current(), key = t ? t.id + '|' + playing : '';
  if (key === msKey) return; msKey = key;
  try {
    navigator.mediaSession.metadata = t ? new MediaMetadata({title:t.title, artist:t.channel, album:'Saturne', artwork:[{src:t.thumb, sizes:'320x180', type:'image/jpeg'}]}) : null;
    navigator.mediaSession.playbackState = !t ? 'none' : playing ? 'playing' : 'paused';
  } catch {}
  if (silence) { try { if (playing) silence.play().catch(() => {}); else silence.pause(); } catch {} }
}
try {
  const ms = navigator.mediaSession;
  [['play', () => mediaCmd('play')], ['pause', () => mediaCmd('pause')], ['previoustrack', () => mediaCmd('prev')], ['nexttrack', () => mediaCmd('next')], ['stop', () => mediaCmd('stop')],
   ['seekto', d => { if (ready && current() && d.seekTime != null) player.seekTo(d.seekTime, true); }]].forEach(([a, f]) => { try { ms.setActionHandler(a, f); } catch {} });
} catch {}

