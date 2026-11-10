/* ---------- Données YouTube (via le serveur Rust) ---------- */
const ytId = s => { const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/); return m ? m[1] : null; };
const dedupe = l => { const seen = new Set(); return l.filter(t => !seen.has(t.id) && seen.add(t.id)); };
const fetchTracks = async (q, gl) => (await api('search', {type:'video', q, gl:gl || ''})).items;
const HOME_QUERIES = ['J-POP 人気曲 MV', 'J-POP official music video'];
let homeSeq = 0;
async function loadHome(fresh){
  if (!fresh && S.home.main.tracks.length) return;
  const seq = ++homeSeq, H = S.home;
  H.main = {tracks:[], loading:true, error:''}; H.fresh = {tracks:[], loading:true, error:''};
  SHELVES.forEach(s => H.shelves[s.key] = {tracks:[], loading:true, error:''}); render();
  const done = fn => v => { if (seq === homeSeq) { fn(v); if (S.view.type === 'home') renderView(); } };
  await Promise.all([
    api('new', {gl:'JP'}).then(done(j => H.fresh = {tracks:j.items, loading:false, error:''}), done(e => H.fresh = {tracks:[], loading:false, error:errText(e)})),
    Promise.all(HOME_QUERIES.map(q => fetchTracks(q, 'JP'))).then(done(a => H.main = {tracks:dedupe(a.flat()), loading:false, error:''}), done(e => H.main = {tracks:[], loading:false, error:errText(e)})),
    ...SHELVES.map(s => fetchTracks(s.q, s.cc).then(done(t => H.shelves[s.key] = {tracks:t, loading:false, error:''}), done(e => H.shelves[s.key] = {tracks:[], loading:false, error:errText(e)})))
  ]);
  if (seq === homeSeq) render();
}
let listSeq = 0;
async function loadList(v){
  const seq = ++listSeq;
  S.list = {title:v.title, eyebrow:v.eyebrow || 'Genre', q:v.q, cc:v.cc || '', loading:true, error:'', tracks:[]}; render();
  try { const j = v.q === '__new__' ? {items:(await api('new', {gl:'JP'})).items, next:null} : await fetchPage(v.q, v.cc || S.cc); if (seq !== listSeq) return; S.list.tracks = j.items; S.list.next = j.next; }
  catch (e) { if (seq !== listSeq) return; S.list.error = errText(e); }
  S.list.loading = false; render();
}
let searchSeq = 0;
async function runSearch(q){
  const seq = ++searchSeq; S.search = {q, tracks:[], loading:true, error:''}; render();
  try {
    const id = ytId(q), j = id ? {items:[await api('video', {id})], next:null} : await fetchPage(q, S.cc);
    if (seq !== searchSeq) return; S.search.tracks = j.items; S.search.next = j.next;
  } catch (e) { if (seq !== searchSeq) return; S.search.error = errText(e); }
  S.search.loading = false; render();
}
let artistsSeq = 0;
async function loadArtists(){
  const seq = ++artistsSeq;
  S.artists = {items:[], loading:true, error:'', mode:'popular', query:''}; render();
  // Le serveur prépare la liste en arrière-plan : on la récupère telle qu'elle est, puis on revient chercher la suite.
  for (let n = 0; n < 40; n++) {
    let j; try { j = await http('/api/artists'); } catch (e) { if (seq !== artistsSeq) return; S.artists.loading = false; S.artists.error = errText(e); return render(); }
    if (seq !== artistsSeq) return;
    S.artists.items = j.items; S.artists.loading = !j.items.length && j.pending;
    if (!j.pending) break;
    if (S.view.type === 'artists') renderView();
    await new Promise(r => setTimeout(r, j.items.length ? 3000 : 1500));
    if (seq !== artistsSeq) return;
  }
  S.artists.loading = false;
  if (!S.artists.items.length) S.artists.error = L('Artists could not be loaded.', 'Impossible de charger les artistes.');
  render();
}
async function searchArtists(q){
  const seq = ++artistsSeq;
  S.artists = {items:[], loading:true, error:'', mode:'search', query:q}; render();
  try { const items = (await api('search', {type:'channel', q})).items; if (seq !== artistsSeq) return; S.artists.items = items; }
  catch (e) { if (seq !== artistsSeq) return; S.artists.error = errText(e); }
  S.artists.loading = false; render();
}
let artistSeq = 0;
async function loadArtist(id){
  const seq = ++artistSeq;
  const known = S.artists.items.find(a => a && a.id === id);
  S.artist = {id, info: known ? {...known} : null, tracks:[], loading:true, error:''}; render();
  try {
    const j = await api('channel', {id});
    if (seq !== artistSeq) return;
    S.artist.info = {...(S.artist.info || {}), ...j.info, subsText: j.info.subsText || (S.artist.info && S.artist.info.subsText) || ''};
    S.artist.tracks = j.tracks;
  } catch (e) { if (seq !== artistSeq) return; S.artist.error = errText(e); }
  S.artist.loading = false; render();
}
async function loadCommunity(){
  S.community.loading = true; S.community.error = ''; if (S.view.type === 'library') renderView();
  try { S.community.items = (await http('/api/public')).items; S.community.loaded = true; }
  catch (e) { S.community.error = errText(e); }
  S.community.loading = false; if (S.view.type === 'library') renderView();
}
async function loadPub(owner, id){
  S.pub = {owner, id, data:null, loading:true, error:''}; render();
  try { const j = await api('public/playlist', {owner, id}); if (S.pub.id !== id) return; S.pub.data = j.playlist; }
  catch (e) { S.pub.error = e.message; }
  S.pub.loading = false; if (S.view.type === 'pubpl') render();
}

