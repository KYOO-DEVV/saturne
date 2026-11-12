/* ---------- État ---------- */
const S = {
  ptab:'queue', profile:{banner:'', bio:''}, follows:[], lyr:null, plv:{q:'', sort:'manual', sel:null}, clip:false, mix:null,
  plays:[], hv:'history', cap:{}, sleep:null, backups:null, mini:false,
  user:null, playlists:[], queue:[], cur:-1, shuffle:false, repeat:'off', volume:80, muted:false, history:[], cc:'JP', collapsed:false, defaultPrivacy:'private',
  settings:{autoplay:true, remember:true, toasts:true, accent:'violet', radius:'soft', heroAuto:true, reduceMotion:false, autoUpdate:true}, setTab:'account',
  update:{checking:false, info:null, error:'', installing:false}, about:null,
  view:{type:'home'}, hist:[{type:'home'}], hpos:0, qopen:false,
  home:{main:{tracks:[], loading:false, error:''}, fresh:{tracks:[], loading:false, error:''}, shelves:{}}, heroIdx:0,
  list:{title:'', eyebrow:'', tracks:[], loading:false, error:'', q:'', cc:''},
  search:{q:'', tracks:[], loading:false, error:''},
  artists:{items:[], loading:false, error:'', mode:'popular', query:''},
  artist:{id:'', info:null, tracks:[], loading:false, error:''},
  lib:{chip:'all', sort:'added'}, community:{items:[], loading:false, error:'', loaded:false},
  pub:{owner:'', id:'', data:null, loading:false, error:''}, order:[], pos:-1
};
const current = () => S.queue[S.cur] || null;
const favs = () => S.playlists.find(p => p.id === 'favs');
const isFav = id => favs().tracks.some(t => t.id === id);
const curPl = () => S.view.type === 'playlist' ? S.playlists.find(p => p.id === S.view.id) : null;
const isPublic = p => p.visibility === 'public' && !p.system;
const slim = t => ({id:t.id, title:t.title, channel:t.channel, channelId:t.channelId || '', thumb:t.thumb || (t.src === 'sc' ? '' : `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`), duration:t.duration || null, ...(t.src === 'sc' ? {src:'sc', url:t.url} : {})});
/* Grande pochette : celle de la source (YouTube Music, SoundCloud) ou, pour YouTube, la vignette HD de la vidéo. */
const bigArt = t => t.src === 'sc' || /googleusercontent\.com|sndcdn\.com/.test(t.thumb || '') ? (t.thumb || '') : `https://i.ytimg.com/vi/${t.id}/maxresdefault.jpg`;
const smallArt = t => t.thumb || `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`;

let toastTimer;
function toast(msg, opt){
  if (!(opt && opt.undo) && S.settings && S.settings.toasts === false && !/impossible|erreur|expir|invalide|incorrect|échou|refus|trop/i.test(msg)) return;
  const t = $('#toast'); t.textContent = ''; const sp = document.createElement('span'); sp.textContent = msg; t.appendChild(sp);
  if (opt && opt.undo) { const b = document.createElement('button'); b.className = 'toast-act'; b.textContent = opt.label || 'Annuler'; b.addEventListener('click', () => { t.hidden = true; opt.undo(); }); t.appendChild(b); }
  t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, opt && opt.undo ? 7000 : 3000); }

