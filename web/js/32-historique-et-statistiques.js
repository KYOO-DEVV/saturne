/* ---------- Historique et statistiques ---------- */
const playTrack = p => ({id:p[0], title:p[1], channel:p[2], channelId:p[3], thumb:p[6] || `https://i.ytimg.com/vi/${p[0]}/mqdefault.jpg`, duration:p[5] || null, at:p[4], ...(String(p[0]).startsWith('sc:') ? {src:'sc', url:p[7] || ''} : {})});
const playsTracks = () => S.plays.map(playTrack).reverse();
const dateLocale = () => LANG === 'fr' ? 'fr-FR' : 'en-GB';
function dayLabel(ts){
  const sd = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(), diff = Math.round((sd(new Date()) - sd(new Date(ts))) / 864e5);
  return diff === 0 ? L('Today', "Aujourd'hui") : diff === 1 ? L('Yesterday', 'Hier') : new Date(ts).toLocaleDateString(dateLocale(), {weekday:'long', day:'numeric', month:'long'});
}
function statsHtml(){
  const now = new Date(), days = [...Array(7)].map((_, k) => ({d:new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - k)), n:0})), t0 = days[0].d.getTime();
  S.plays.forEach(p => { const k = Math.floor((p[4] - t0) / 864e5); if (k >= 0 && k < 7) days[k].n++; });
  const max = Math.max(1, ...days.map(x => x.n)), week = days.reduce((a, x) => a + x.n, 0);
  const tally = key => { const m = new Map(); S.plays.forEach(p => { const k = key(p); if (k) m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5); };
  const byId = new Map(S.plays.map(p => [p[0], p])), hrs = Math.round(S.plays.reduce((a, p) => a + (p[5] || 0), 0) / 360) / 10;
  const top = (l, name) => l.length ? `<ol class="toplist">${l.map(([k, n], i) => `<li><span class="rk">${i + 1}</span><b class="tt">${esc(name(k))}</b><small>${n} ${n > 1 ? L('plays', 'écoutes') : L('play', 'écoute')}</small></li>`).join('')}</ol>` : '';
  return `<div class="statgrid"><div class="stat"><small>${L('Songs played', 'Titres écoutés')}</small><b>${S.plays.length}</b></div><div class="stat"><small>${L('Last 7 days', '7 derniers jours')}</small><b>${week}</b></div><div class="stat"><small>${L('Estimated listening time', "Temps d'écoute estimé")}</small><b>${hrs} h</b></div></div>
    <div class="box" style="margin-bottom:16px"><h3>${L('Plays per day', 'Écoutes par jour')}</h3><div class="bars">${days.map(x => `<div class="barcol"><span class="bn">${x.n}</span><i style="height:${Math.max(3, Math.round(x.n / max * 100))}%"></i><small>${esc(x.d.toLocaleDateString(dateLocale(), {weekday:'short'}))}</small></div>`).join('')}</div></div>
    <div class="twocol"><div class="box"><h3>${L('Top artists', 'Artistes les plus écoutés')}</h3>${top(tally(p => p[2]), k => k)}</div><div class="box"><h3>${L('Top songs', 'Titres les plus écoutés')}</h3>${top(tally(p => p[0]), k => (byId.get(k) || [])[1] || k)}</div></div>`;
}
function historyHtml(){
  const tab = S.hv; let list = playsTracks();
  let h = `<div class="pagehead"><p class="eyebrow">${L('Activity', 'Activité')}</p><h1>${tab === 'stats' ? L('Listening stats', "Statistiques d'écoute") : L('Listening history', "Historique d'écoute")}</h1></div>
    <div class="toolbar"><div class="chips"><button class="chip ${tab === 'history' ? 'on' : ''}" data-hvtab="history">${L('History', 'Historique')}</button><button class="chip ${tab === 'stats' ? 'on' : ''}" data-hvtab="stats">${L('Stats', 'Statistiques')}</button></div>${list.length ? `<button class="ghost" data-act="clearhist">${ic('trash')}${L('Clear history', "Effacer l'historique")}</button>` : ''}</div>`;
  if (!list.length) return h + `<p class="empty">${L('Nothing played yet. Your listening history and stats will show up here.', "Rien d'écouté pour le moment. Ton historique et tes statistiques apparaîtront ici.")}</p>`;
  if (tab === 'stats') return h + statsHtml();
  const cap = capOf('plays'); let last = '', out = ''; list = filterList(list, 'plays');
  list.slice(0, cap).forEach((t, i) => { const d = dayLabel(t.at); if (d !== last) { last = d; out += `<li class="dayhead">${esc(d)}</li>`; } out += trow(t, i, list.length); });
  return h + `${filterChip('plays')}${theadHtml('plays', true)}<ul class="rows" data-src="plays">${out}</ul>${moreItems(list, 'plays')}`;
}

