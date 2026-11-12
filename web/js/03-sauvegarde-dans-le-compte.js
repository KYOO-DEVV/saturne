/* ---------- Sauvegarde dans le compte ---------- */
let saveTimer = 0, saveWarned = false;
const payload = () => ({v:2, playlists:S.playlists, queue:S.queue, cur:S.cur, shuffle:S.shuffle, repeat:S.repeat, volume:S.volume, history:S.history, plays:S.plays, follows:S.follows, profile:S.profile, cc:S.cc, collapsed:S.collapsed, defaultPrivacy:S.defaultPrivacy, settings:S.settings});
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await http('/api/data', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload())}); saveWarned = false; }
    catch (e) { if (e.status === 401) return showAuth('Ta session a expiré, reconnecte-toi.'); if (!saveWarned) { saveWarned = true; toast('Enregistrement impossible : ' + e.message); } }
  }, 700);
}
/* Les GIF enregistrés par les versions précédentes (dans le fichier de données) passent dans des fichiers à part. */
let migrating = false;
async function migrateMedia(){
  if (migrating) return; migrating = true; let changed = false;
  const heavy = v => typeof v === 'string' && v.startsWith('data:image/gif') && v.length > 60000;
  const move = async (obj, key) => { try { const b = await (await fetch(obj[key])).blob(); const u = await storeGif(b); if (u.startsWith('/media/')) { obj[key] = u; changed = true; } } catch {} };
  try {
    if (heavy(S.settings.bgImage)) await move(S.settings, 'bgImage');
    if (heavy(S.profile.banner)) await move(S.profile, 'banner');
    for (const p of S.playlists) { if (heavy(p.cover)) await move(p, 'cover'); if (heavy(p.banner)) await move(p, 'banner'); }
  } finally { migrating = false; }
  if (changed) { applyTheme(); save(); render(); }
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
  S.follows = Array.isArray(d.follows) ? d.follows.filter(a => a && /^UC[\w-]{22}$/.test(a.id)).slice(0, 60) : [];
  S.profile = {banner:typeof (d.profile||{}).banner === 'string' && (d.profile.banner.startsWith('data:image/') || /^\/media\/[\w.]+$/.test(d.profile.banner)) ? d.profile.banner : '', bio:typeof (d.profile||{}).bio === 'string' ? d.profile.bio.slice(0, 160) : ''};
  applyHomePrefs(); setTimeout(migrateMedia, 1500);
  applyLang(S.settings.lang || detectLang());
  if (!S.settings.remember) { S.queue = []; S.cur = -1; }
  applyTheme(); if (typeof applyMods === 'function') applyMods();
  let f = S.playlists.find(p => p.id === 'favs');
  if (!f) { f = {id:'favs', tracks:[], created:Date.now()}; S.playlists.unshift(f); }
  f.name = 'Bookmarks'; f.system = true; f.visibility = 'private';
}

