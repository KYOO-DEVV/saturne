/* ---------- Événements ---------- */
$('#authLogo').insertAdjacentHTML('afterbegin', logoSvg(34)); $('#brandLogo').innerHTML = logoSvg(30);
$('#nowFav').innerHTML = bmSvg;
injectIcons(document);
const seek = $('#seek'), vol = $('#vol');
const fill = el => el.style.setProperty('--p', (el.max > 0 ? el.value / el.max * 100 : 0) + '%');
$('#newPl').addEventListener('click', newPlaylist);
$('#searchForm').addEventListener('submit', e => { e.preventDefault(); const q = $('#q').value.trim(); if (!q) return; if (ytListId(q) && !/[?&]v=/.test(q)) { $('#q').value = ''; return ytImportModal(q); } go({type:'search', q}); });
$('#menuBtn').addEventListener('click', () => $('#app').classList.add('open'));
$('#scrim').addEventListener('click', closeDrawer);
$('#backBtn').addEventListener('click', () => step(-1));
$('#fwdBtn').addEventListener('click', () => step(1));
$('#collapse').addEventListener('click', () => setCollapsed(!S.collapsed));
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('[data-nav]'); if (!b) return;
  if (b.dataset.nav === 'search') { $('#q').value = ''; go({type:'search', q:''}); } else go({type:b.dataset.nav});
});
$('#plList').addEventListener('click', e => { const b = e.target.closest('[data-pl]'); if (b) go({type:'playlist', id:b.dataset.pl}); const n = e.target.closest('[data-act="newpl"]'); if (n) newPlaylist(); });
$('#accountBtn').addEventListener('click', e => { e.stopPropagation(); openAccountMenu(e.currentTarget); });
$('#avatarBtn').addEventListener('click', e => { e.stopPropagation(); openAccountMenu(e.currentTarget); });
$('#qClear').addEventListener('click', clearQueue);
$('#qClose').addEventListener('click', () => setQueueOpen(false));
$('#bQueue').addEventListener('click', () => openPanel('queue'));
$('#qList').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'), el = e.target.closest('[data-qi]'); if (!b || !el) return;
  const i = +el.dataset.qi; if (b.dataset.act === 'qplay') jump(i); else if (b.dataset.act === 'qrm') removeFromQueue(i);
});

$('#view').addEventListener('click', e => {
  const shb = e.target.closest('[data-sh]'); if (shb) { const ul = shb.parentElement.querySelector('.shelf'); ul.scrollBy({left:+shb.dataset.sh * ul.clientWidth * .85, behavior:'smooth'}); return; }
  const hv = e.target.closest('[data-hvtab]'); if (hv) { S.hv = hv.dataset.hvtab; return renderView(); }
  const ar = e.target.closest('[data-artist]'); if (ar) return go({type:'artist', id:ar.dataset.artist});
  const gg = e.target.closest('[data-go]'); if (gg) return go({type:gg.dataset.go});
  const ch = e.target.closest('[data-chip]'); if (ch) { S.lib.chip = ch.dataset.chip; renderView(); if (S.lib.chip === 'community' && !S.community.loaded) loadCommunity(); return; }
  const pb = e.target.closest('[data-pub]'); if (pb) { const [owner, id] = pb.dataset.pub.split('|'); return go({type:'pubpl', owner, id}); }
  const pl = e.target.closest('button[data-pl]'); if (pl) return go({type:'playlist', id:pl.dataset.pl});
  const g = e.target.closest('[data-genre]');
  if (g) { const x = GENRES[+g.dataset.genre]; return go({type:'list', q:x.q, title:x.n, cc:x.cc, eyebrow:'Genre'}); }
  const mo = e.target.closest('[data-more]');
  if (mo) { if (mo.dataset.more === '__new__') return go({type:'list', q:'__new__', title:'New Releases', eyebrow:'Latest'}); const s = SHELVES.find(x => x.key === mo.dataset.more); if (!s) return; return go({type:'list', q:s.q, title:s.title, cc:s.cc, eyebrow:'Home'}); }
  const cl = e.target.closest('[data-cl]'); if (cl) return toggleCl(cl.dataset.cl);
  const ca = e.target.closest('[data-clall]'); if (ca) return setAllCl(ca.dataset.clall === 'open');
  const st = e.target.closest('[data-settab]'); if (st) { S.setTab = st.dataset.settab; renderView(); if (['updates', 'about', 'data', 'changelog'].includes(S.setTab)) loadAbout(); if (S.setTab === 'data') loadBackups(); return; }
  const sw = e.target.closest('[data-set]'); if (sw) return toggleSetting(sw.dataset.set);
  const sd = e.target.closest('[data-densityset]'); if (sd) { S.settings.density = sd.dataset.densityset; applyTheme(); save(); return renderView(); }
  const sa = e.target.closest('[data-accent]'); if (sa) { S.settings.accentCustom = ''; S.settings.accent = sa.dataset.accent; applyTheme(); save(); return renderView(); }
  const sr = e.target.closest('[data-radiusset]'); if (sr) { S.settings.radius = sr.dataset.radiusset; applyTheme(); save(); return renderView(); }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, holder = b.closest('[data-src]'), src = holder ? holder.dataset.src : defaultSrc(), l = tracksOf(src);
  const li = b.closest('[data-i]'), i = li ? +li.dataset.i : -1, t = l[i], p = curPl();
  const fresh = S.home.fresh.tracks.slice(0, 6);
  if (act === 'play') playList(l, i);
  else if (act === 'fav') { const ft = b.closest('.slide') ? fresh[+b.closest('.slide').dataset.slide] : (t || (b.closest('.np-page') ? current() : null)); if (ft) toggleFav(ft); }
  else if (act === 'queue') addToQueue(t);
  else if (act === 'menu') { e.stopPropagation(); openMenu(b, t); }
  else if (act === 'plmenu') { e.stopPropagation(); const pp = S.playlists.find(x => x.id === b.dataset.pid); if (pp) openPlMenu(b, pp); }
  else if (act === 'remove') { if (src === 'pl' && p) removeTrackAt(p.tracks, p.tracks.indexOf(t)); else removeTrackAt(l, i); }
  else if ((act === 'up' || act === 'down') && (src !== 'pl' || plPlain())) { const j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; save(); render(); }
  else if (act === 'playall') { S.shuffle = false; playList(l, 0); }
  else if (act === 'shuffleall') { S.shuffle = true; playList(l, Math.floor(Math.random() * l.length)); }
  else if (act === 'playmain') { S.shuffle = false; playList(S.home.main.tracks, 0); }
  else if (act === 'playrecent') playList(S.history, +b.dataset.i);
  else if (act === 'heroplay') { S.shuffle = false; playList(S.home.fresh.tracks, +b.dataset.i); }
  else if (act === 'heroqueue') addToQueue(fresh[+b.dataset.i]);
  else if (act === 'heroprev') heroGo(S.heroIdx - 1);
  else if (act === 'heronext') heroGo(S.heroIdx + 1);
  else if (act === 'herodot') heroGo(+b.dataset.i);
  else if (act === 'refresh') loadHome(true);
  else if (act === 'retrylist') loadList(S.view);
  else if (act === 'retrysearch') runSearch(S.view.q);
  else if (act === 'artists-retry' || act === 'artists-back') loadArtists();
  else if (act === 'artist-retry') loadArtist(S.artist.id);
  else if (act === 'community-retry') loadCommunity();
  else if (act === 'newpl') newPlaylist();
  else if (act === 'setpriv') setPrivacy(p, b.dataset.v);
  else if (act === 'defpriv') { S.defaultPrivacy = b.dataset.v; save(); renderView(); }
  else if (act === 'savepub') savePublicCopy();
  else if (act === 'qshuffle') { S.shuffle = !S.shuffle; rebuildOrder(); save(); renderBar(); renderView(); }
  else if (act === 'qrepeat') { S.repeat = {off:'all', all:'one', one:'off'}[S.repeat]; save(); renderBar(); renderView(); }
  else if (act === 'qqueue') setQueueOpen(true, 'queue');
  else if (act === 'pfp-pick') pickImage('cover');
  else if (act === 'banner-pick') pickImage('banner');
  else if (act === 'pfp-clear') { delete p.cover; save(); render(); }
  else if (act === 'banner-clear') { delete p.banner; delete p.bannerY; save(); render(); }
  else if (act === 'delpl') {
    if (!S.view.confirm) { S.view.confirm = true; render(); }
    else { deletePlaylist(p); go({type:'library'}); }
  }
  else if (act === 'editprofile') go({type:'profile'});
  else if (act === 'changeusername') usernameModal();
  else if (act === 'changepass') passwordModal();
  else if (act === 'deleteacct') deleteModal();
  else if (act === 'exportdata') exportData();
  else if (act === 'checkupdate') checkUpdate(false);
  else if (act === 'installupdate') installUpdate();
  else if (act === 'share') shareModal(p || S.playlists.find(x => x.id === S.view.id));
  else if (act === 'sharepub') shareModal(S.pub.data);
  else if (act === 'importpl') importModal();
  else if (act === 'npmenu') { e.stopPropagation(); if (current()) openMenu(b, current()); }
  else if (act === 'qjump') jump(+b.dataset.qi);
  else if (act === 'clearhist') { S.history = []; S.plays = []; save(); toast('Historique effacé'); if (S.view.type === 'history') renderView(); }
  else if (act === 'logout') logout();
  else if (act === 'loadmore') loadMore(b.dataset.kind);
  else if (act === 'showmore') { S.cap[b.dataset.src] = capOf(b.dataset.src) + 120; renderView(); }
  else if (act === 'radio') { const c = current(); if (c) startRadio(c); }
  else if (act === 'importdata') { $('#dataPick').click(); }
  else if (act === 'restorebk') restoreModal(+b.dataset.ts);
});
$('#view').addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'artistForm') { const q = $('#artistQ').value.trim(); if (q) searchArtists(q); else loadArtists(); }
});
$('#view').addEventListener('keydown', e => {
  if ((e.target.id === 'plTitle' || e.target.id === 'plDesc') && e.key === 'Enter') e.target.blur();
  if (e.target.id === 'dispInput' && e.key === 'Enter') { e.preventDefault(); $('#view [data-act="savedisp"]').click(); }
  if (e.target.id === 'pfp' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickImage('cover'); }
});
$('#view').addEventListener('change', e => {
  if (e.target.id === 'ccSel') { S.cc = e.target.value; save(); toast('Région : ' + COUNTRIES[S.cc]); return; }
  if (e.target.id === 'sortSel') { S.lib.sort = e.target.value; renderView(); return; }
  const p = curPl();
  if (e.target.id === 'plTitle') { const n = e.target.value.trim(); if (p && n) { p.name = n; save(); renderSide(); } else if (p) e.target.value = p.name; }
  if (e.target.id === 'plDesc' && p) { p.description = e.target.value.trim(); save(); }
});

$('#menu').addEventListener('click', e => {
  const m = e.target.closest('[data-menu]');
  if (m) { closeMenu(); const k = m.dataset.menu; return k === 'logout' ? logout() : k === 'profile' ? profileModal() : go({type:'settings'}); }
  const pa = e.target.closest('[data-plact]');
  if (pa) {
    const p = S.playlists.find(x => x.id === pa.dataset.pid); closeMenu(); if (!p) return;
    if (pa.dataset.plact === 'play') { if (!p.tracks.length) return toast('Cette playlist est vide'); S.shuffle = false; p.lastPlayed = Date.now(); playList(p.tracks, 0); }
    else if (pa.dataset.plact === 'share') shareModal(p);
    else if (pa.dataset.plact === 'toggle') setPrivacy(p, isPublic(p) ? 'private' : 'public');
    else if (pa.dataset.plact === 'delete') { deletePlaylist(p); render(); }
    return;
  }
  const b = e.target.closest('[data-pid]'); if (!b) return;
  const p = S.playlists.find(x => x.id === b.dataset.pid), t = menuTrack; closeMenu(); if (p && t) addToPlaylist(p, t);
});
$('#menu').addEventListener('submit', e => {
  e.preventDefault(); const t = menuTrack, name = $('#menuNewName').value.trim(); if (!name || !t) return;
  const p = {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, description:'', tracks:[], visibility:S.defaultPrivacy, created:Date.now()}; S.playlists.push(p); closeMenu(); addToPlaylist(p, t);
});
document.addEventListener('click', e => { if (!$('#menu').hidden && !e.target.closest('#menu')) closeMenu(); if (S.qopen && innerWidth <= 900 && !e.target.closest('#qdrawer,#bQueue,#bLyrics,[data-act="qqueue"],.nq')) setQueueOpen(false); });

$('#bPlay').addEventListener('click', togglePlay);
$('#bNext').addEventListener('click', () => next(false));
$('#bPrev').addEventListener('click', prev);
$('#bShuffle').addEventListener('click', () => { S.shuffle = !S.shuffle; rebuildOrder(); save(); renderBar(); toast(S.shuffle ? 'Lecture aléatoire activée' : 'Lecture aléatoire désactivée'); });
$('#bRepeat').addEventListener('click', () => { S.repeat = {off:'all', all:'one', one:'off'}[S.repeat]; save(); renderBar(); toast({off:'Répétition désactivée', all:'Répétition de toute la file', one:'Répétition de ce titre'}[S.repeat]); });
$('#nowFav').addEventListener('click', () => { const t = current(); if (t) toggleFav(t); });
$('#bSleep').addEventListener('click', e => { e.stopPropagation(); openSleepMenu(e.currentTarget); });
$('#bMini').addEventListener('click', () => setMini(!S.mini));
$('#menu').addEventListener('click', e => { const b = e.target.closest('[data-sleep]'); if (!b) return; closeMenu(); setSleep(b.dataset.sleep); });
$('#volBtn').addEventListener('click', () => { S.muted = !S.muted; if (ready) { if (S.muted) player.mute(); else player.unMute(); } renderBar(); });

seek.addEventListener('input', () => { seeking = true; setTimes(seek.value, seek.max); fill(seek); });
seek.addEventListener('change', () => { if (ready && current()) player.seekTo(+seek.value, true); seeking = false; });
vol.value = S.volume; fill(vol);
vol.addEventListener('input', () => { S.volume = +vol.value; fill(vol); S.muted = false; if (ready) { player.unMute(); player.setVolume(S.volume); } save(); renderBar(); });
setInterval(() => {
  if (!ready || !current() || seeking) return;
  const d = player.getDuration() || 0, c = player.getCurrentTime() || 0;
  seek.max = Math.max(1, Math.floor(d)); seek.value = Math.floor(c); fill(seek); seek.setAttribute('aria-valuetext', fmt(c) + ' / ' + fmt(d));
  setTimes(c, d);
}, 500);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const had = !$('#menu').hidden; closeMenu(); if (had && menuOpener && menuOpener.isConnected) menuOpener.focus(); closeDrawer(); setQueueOpen(false); closeModal(); if (S.mini && !had) setMini(false); }
  if (!S.user || e.target.closest('input, textarea, select')) return;
  if (e.code === 'Space' && !e.target.closest('button,[role=button]')) { e.preventDefault(); togglePlay(); }
  else if (e.key === 'ArrowRight') { if (e.shiftKey) next(false); else if (ready && current()) player.seekTo(player.getCurrentTime() + 5, true); }
  else if (e.key === 'ArrowLeft') { if (e.shiftKey) prev(); else if (ready && current()) player.seekTo(Math.max(0, player.getCurrentTime() - 5), true); }
});
new ResizeObserver(() => document.documentElement.style.setProperty('--barh', ($('#bar').offsetHeight || 84) + 'px')).observe($('#bar'));

