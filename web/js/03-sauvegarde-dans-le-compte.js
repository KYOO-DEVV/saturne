/* ---------- Sauvegarde dans le compte ---------- */
let saveTimer = 0, saveWarned = false;
const payload = () => ({v:2, playlists:S.playlists, queue:S.queue, cur:S.cur, shuffle:S.shuffle, repeat:S.repeat, volume:S.volume, history:S.history, plays:S.plays, cc:S.cc, collapsed:S.collapsed, defaultPrivacy:S.defaultPrivacy, settings:S.settings});
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await http('/api/data', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload())}); saveWarned = false; }
    catch (e) { if (e.status === 401) return showAuth('Ta session a expiré, reconnecte-toi.'); if (!saveWarned) { saveWarned = true; toast('Enregistrement impossible : ' + e.message); } }
  }, 700);
}
function applyData(d){
  S.playlists = (Array.isArray(d.playlists) ? d.playlists : []).map(p => ({...p, tracks:Array.isArray(p.tracks) ? p.tracks : [], visibility: p.id === 'favs' ? 'private' : (p.visibility === 'public' ? 'public' : 'private')}));
  S.queue = Array.isArray(d.queue) ? d.queue : [];
  S.cur = Number.isInteger(d.cur) && d.cur < S.queue.length ? d.cur : (S.queue.length ? 0 : -1);
  S.shuffle = !!d.shuffle; S.repeat = ['off','all','one'].includes(d.repeat) ? d.repeat : 'off'; S.volume = Number.isFinite(d.volume) ? d.volume : 80;
  S.history = Array.isArray(d.history) ? d.history.slice(0, 24) : []; S.cc = COUNTRIES[d.cc] ? d.cc : 'JP'; S.collapsed = !!d.collapsed;
  S.defaultPrivacy = d.defaultPrivacy === 'public' ? 'public' : 'private';
  S.settings = {...DEFAULT_SETTINGS, ...(d.settings && typeof d.settings === 'object' ? d.settings : {})};
  S.plays = Array.isArray(d.plays) ? d.plays.filter(p => Array.isArray(p) && /^[\w-]{11}$/.test(p[0])).slice(-1000) : [];
  applyLang(S.settings.lang || detectLang());
  if (!S.settings.remember) { S.queue = []; S.cur = -1; }
  applyTheme();
  let f = S.playlists.find(p => p.id === 'favs');
  if (!f) { f = {id:'favs', tracks:[], created:Date.now()}; S.playlists.unshift(f); }
  f.name = 'Bookmarks'; f.system = true; f.visibility = 'private';
}

