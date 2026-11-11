/* ---------- Navigation (avec précédent / suivant) ---------- */
function go(v, push = true){
  closeDrawer(); closeMenu();
  S.plv = {q:'', sort:'manual', sel:null}; if (v.type !== 'now') setClip(false);
  if (push) { S.hist = S.hist.slice(0, S.hpos + 1); S.hist.push(v); S.hpos = S.hist.length - 1; }
  S.view = v; render(); $('#view').scrollTop = 0;
  if (v.type === 'home') loadHome();
  else if (v.type === 'artists' && !S.artists.items.filter(Boolean).length && !S.artists.loading) loadArtists();
  else if (v.type === 'artist') loadArtist(v.id);
  else if (v.type === 'list') loadList(v);
  else if (v.type === 'search' && v.q && S.search.q !== v.q) runSearch(v.q);
  else if (v.type === 'pubpl') loadPub(v.owner, v.id);
  else if (v.type === 'library' && S.lib.chip === 'community' && !S.community.loaded) loadCommunity();
}
function step(d){ const i = S.hpos + d; if (i < 0 || i >= S.hist.length) return; S.hpos = i; go(S.hist[i], false); }
function setQueueOpen(open){ S.qopen = open; $('#qdrawer').classList.toggle('open', open); $('#bQueue').classList.toggle('act', open); }

