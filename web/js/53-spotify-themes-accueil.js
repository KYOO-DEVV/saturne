/* ---------- Import Spotify (fichier CSV, par exemple exporté avec Exportify) ---------- */
function parseCsv(text){
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some(x => x !== '')) rows.push(row);
  return rows;
}
function spotifyTracks(text){
  const rows = parseCsv(text.replace(/^﻿/, '')); if (rows.length < 2) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  const ti = head.findIndex(h => /^(track name|track|title|song|titre|name)$/.test(h)), ai = head.findIndex(h => /^(artist name\(s\)|artist name|artists?|artiste)$/.test(h));
  if (ti < 0) return [];
  return rows.slice(1).map(r => ({title:(r[ti] || '').trim(), artist:ai >= 0 ? (r[ai] || '').split(/[;,]/)[0].trim() : ''})).filter(t => t.title).slice(0, 200);
}
function spotifyModal(list, name){
  let stop = false, done = 0; const found = [], missing = [];
  openModal(`<h3>${L('Import from Spotify', 'Importer depuis Spotify')}</h3><p>${L(`${list.length} songs to find on YouTube, one per second so YouTube does not block the search. You can keep using Saturne meanwhile, but leave this window open.`, `${list.length} titres à retrouver sur YouTube, un par seconde pour que YouTube ne bloque pas la recherche. Laisse cette fenêtre ouverte.`)}</p>
    <div class="prog"><i id="spBar"></i></div><p id="spMsg" class="ly-info" style="text-align:left"></p>
    <div class="mactions"><button class="ghost" id="spStop">${L('Cancel', 'Annuler')}</button><button class="btn" id="spAdd" disabled>${ic('upload')}${L('Create the playlist', 'Créer la playlist')}</button></div>`,
  m => {
    const msg = m.querySelector('#spMsg'), bar = m.querySelector('#spBar'), add = m.querySelector('#spAdd');
    const status = () => { msg.textContent = `${done} / ${list.length} · ${found.length} ${L('found', 'trouvés')} · ${missing.length} ${L('not found', 'introuvables')}`; bar.style.width = (done / list.length * 100) + '%'; add.disabled = !found.length; };
    m.querySelector('#spStop').addEventListener('click', () => { stop = true; closeModal(); });
    add.addEventListener('click', () => { stop = true; closeModal(); saveAsPlaylist(name, found); if (missing.length) toast(missing.length + ' ' + L('songs were not found', 'titres introuvables')); });
    (async () => {
      for (const t of list) {
        if (stop || !$('#spMsg')) return;
        try { const j = await api('match', {title:t.title, artist:t.artist}); if (!found.some(x => x.id === j.id)) found.push(j); }
        catch (e) { if (e.status === 404) missing.push(t); else { msg.textContent = errText(e); add.disabled = !found.length; return; } }
        done++; if ($('#spMsg')) status();
        await new Promise(r => setTimeout(r, 1000));
      }
      if ($('#spMsg')) { status(); m.querySelector('#spStop').textContent = L('Close', 'Fermer'); }
    })();
    status();
  });
}
$('#csvPick').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    if (f.size > 4 * 1024 * 1024) throw new Error('size');
    const list = spotifyTracks(await f.text()); if (!list.length) throw new Error('empty');
    spotifyModal(list, f.name.replace(/\.csv$/i, '').replace(/[_-]+/g, ' ').slice(0, 60) || 'Spotify');
  } catch { toast(L('No songs found in this file. It needs a “Track Name” column (Exportify export).', 'Aucun titre trouvé dans ce fichier. Il faut une colonne « Track Name » (export Exportify).')); }
});
$('#mbox').addEventListener('click', e => { if (e.target.closest('#imSpotify')) { closeModal(); $('#csvPick').click(); } });

/* ---------- Accueil personnalisable ---------- */
const HOME_PRESETS = {
  jpop:{n:'J-POP', q:['J-POP 人気曲 MV', 'J-POP official music video'], cc:'JP', nq:'J-POP'},
  kpop:{n:'K-POP', q:['K-POP hits MV', 'K-POP official music video'], cc:'KR', nq:'K-POP'},
  pop:{n:'Pop', q:['pop hits official video', 'top pop songs'], cc:'US', nq:'pop'},
  rock:{n:'Rock', q:['rock hits official video', 'best rock songs'], cc:'US', nq:'rock'},
  hiphop:{n:'Hip-Hop', q:['hip hop hits official video', 'rap songs official video'], cc:'US', nq:'hip hop'},
  electro:{n:'Électro', q:['electronic dance music official video', 'edm hits'], cc:'US', nq:'electronic'},
  anime:{n:'Anime', q:['anime opening full', 'anime songs official'], cc:'JP', nq:'anime'},
  french:{n:'Variété française', q:['chanson française clip officiel', 'hits français clip officiel'], cc:'FR', nq:'chanson française'},
  latin:{n:'Latino', q:['reggaeton hits video oficial', 'latin hits official video'], cc:'US', nq:'reggaeton'}
};
function applyHomePrefs(){
  const T = S.settings, p = HOME_PRESETS[T.homeGenre] || HOME_PRESETS.jpop;
  HOME_QUERIES = p.q; HOME_CC = p.cc; HOME_NEWQ = p.nq; HOME_NAME = p.n;
  const names = Array.isArray(T.homeShelves) ? T.homeShelves : ['Anime', 'City Pop'];
  SHELVES = names.map(n => GENRES.find(g => g.n === n)).filter(Boolean).slice(0, 5).map(g => ({key:g.n.toLowerCase().replace(/[^a-z0-9]+/g, ''), title:g.n === 'Anime' ? 'Anime & OST' : g.n, q:g.q, cc:g.cc || HOME_CC}));
}
DD.homegenre = {opts:() => Object.entries(HOME_PRESETS).map(([k, p]) => [k, p.n]), value:() => HOME_PRESETS[S.settings.homeGenre] ? S.settings.homeGenre : 'jpop', set:v => { S.settings.homeGenre = v; applyHomePrefs(); save(); S.heroIdx = 0; loadHome(true); go({type:'settings'}, false); }};
const homeRows = () => `<h4>${L('Home', 'Accueil')}</h4>` +
  setRow(L('Main genre', 'Genre principal'), L('Decides the new releases banner and the main grid of the home page.', 'Décide de la bannière des nouveautés et de la grille principale de l’accueil.'), dd('homegenre', L('Main genre', 'Genre principal'))) +
  `<div class="set" style="display:block"><h3>${L('Home shelves', 'Étagères de l’accueil')}</h3><p style="margin-bottom:12px">${L('Up to 5 genres shown as rows on the home page.', 'Jusqu’à 5 genres affichés en rangées sur l’accueil.')}</p><div class="chips">${GENRES.map(g => `<button class="chip ${(S.settings.homeShelves || []).includes(g.n) ? 'on' : ''}" data-homeshelf="${esc(g.n)}" aria-pressed="${(S.settings.homeShelves || []).includes(g.n)}">${esc(g.n)}</button>`).join('')}</div></div>`;
$('#view').addEventListener('click', e => {
  const b = e.target.closest('[data-homeshelf]'); if (!b) return;
  const l = Array.isArray(S.settings.homeShelves) ? [...S.settings.homeShelves] : [], n = b.dataset.homeshelf, i = l.indexOf(n);
  if (i >= 0) l.splice(i, 1); else { if (l.length >= 5) return toast(L('5 shelves at most', '5 étagères au maximum')); l.push(n); }
  S.settings.homeShelves = l; applyHomePrefs(); save(); renderView(); S.home.main.tracks = []; // l'accueil se rechargera à la prochaine visite
});

/* ---------- Thèmes : couleur d'accent libre, fond, image de fond ---------- */
const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgbHex = c => '#' + c.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const mixRgb = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
const BG_THEMES = {oled:'#000000', dark:'#0f0f13', light:'#f4f4f7'};
function applyThemeExtra(){
  const T = S.settings, root = document.documentElement, st = root.style, bg = BG_THEMES[T.bg] ? T.bg : 'oled', light = bg === 'light';
  root.dataset.bg = bg;
  const c = hexRgb(T.accentCustom) || hexRgb((ACCENTS[T.accent] || ACCENTS.violet)[0]);
  if (hexRgb(T.accentCustom)) { st.setProperty('--accent', rgbHex(c)); st.setProperty('--accent-soft', `rgba(${c.join(',')},.15)`); st.setProperty('--accent-glow', `rgba(${c.join(',')},.2)`); }
  // Sur fond clair, la variante « texte » de l'accent doit être foncée ; sur fond sombre, claire.
  st.setProperty('--accent-hi', rgbHex(light ? mixRgb(c, [0, 0, 0], .15) : hexRgb(T.accentCustom) ? mixRgb(c, [255, 255, 255], .45) : hexRgb((ACCENTS[T.accent] || ACCENTS.violet)[1])));
  const acc = hexRgb(getComputedStyle(root).getPropertyValue('--accent').trim()) || c;
  st.setProperty('--on-accent', (acc[0] * 299 + acc[1] * 587 + acc[2] * 114) / 1000 > 150 ? '#0b0b10' : '#ffffff'); // texte lisible quelle que soit la couleur d'accent
  if (T.bgImage) { st.setProperty('--bgimg', `url("${T.bgImage}")`); root.classList.add('has-bgimg'); }
  else { st.removeProperty('--bgimg'); root.classList.remove('has-bgimg'); }
  applyLook();
  if (typeof native === 'function') native('titlebar:' + BG_THEMES[bg].slice(1));
}
const themeRows = () => { const T = S.settings; return setRow(L('Custom accent color', 'Couleur d’accent libre'), L('Pick any color instead of the five presets.', 'Choisis n’importe quelle couleur à la place des cinq proposées.'), `<input type="color" id="accentPick" value="${hexRgb(T.accentCustom) ? T.accentCustom : (ACCENTS[T.accent] || ACCENTS.violet)[0]}" aria-label="${L('Custom accent color', 'Couleur d’accent libre')}">${hexRgb(T.accentCustom) ? `<button class="ghost" data-do2="accentreset" style="margin-left:8px">${L('Reset', 'Réinitialiser')}</button>` : ''}`) +
  setRow(L('Background', 'Fond'), L('Pure black for OLED screens, dark grey, or a light theme.', 'Noir pur pour les écrans OLED, gris sombre, ou thème clair.'), `<div class="seg" role="group" aria-label="${L('Background', 'Fond')}">${segBtn('data-bgset', 'oled', BG_THEMES[T.bg] ? T.bg : 'oled', '', L('OLED black', 'Noir OLED'))}${segBtn('data-bgset', 'dark', T.bg, '', L('Dark grey', 'Gris sombre'))}${segBtn('data-bgset', 'light', T.bg, '', L('Light', 'Clair'))}</div>`) +
  setRow(L('Background image', 'Image de fond'), L('Shown softly behind the pages.', 'Affichée en douceur derrière les pages.'), `<div style="display:flex;gap:8px"><button class="ghost" data-do2="bgpick">${ic('image')}${T.bgImage ? L('Change', 'Changer') : L('Choose an image', 'Choisir une image')}</button>${T.bgImage ? `<button class="ghost" data-do2="bgclear">${L('Remove', 'Retirer')}</button>` : ''}</div>`); };
$('#view').addEventListener('click', e => {
  const b = e.target.closest('[data-bgset]'); if (b) { S.settings.bg = b.dataset.bgset; applyTheme(); save(); return renderView(); }
  const d = e.target.closest('[data-do2]'); if (!d) return;
  if (d.dataset.do2 === 'bgpick') $('#bgPick').click();
  else if (d.dataset.do2 === 'bgclear') { S.settings.bgImage = ''; applyTheme(); save(); renderView(); }
});
$('#view').addEventListener('input', e => { if (e.target.id === 'accentPick') { S.settings.accentCustom = e.target.value; applyTheme(); save(); } });
$('#view').addEventListener('change', e => { if (e.target.id === 'accentPick') renderView(); });
$('#bgPick').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const url = URL.createObjectURL(f);
  try { if (isGif(f) && f.size <= GIF_MAX) S.settings.bgImage = await fileDataUrl(f); else { S.settings.bgImage = await toDataURL(url, 1280, 800, false); if (isGif(f)) toast(L('This GIF is over 4 MB: it is shown without animation.', 'Ce GIF dépasse 4 Mo : il est affiché sans animation.')); } applyTheme(); save(); renderView(); toast(L('Background image updated', 'Image de fond mise à jour')); }
  catch { toast(L('Could not read this image', 'Impossible de lire cette image')); }
  finally { URL.revokeObjectURL(url); }
});
addPairs(`
Command palette|Palette de commandes
Save|Enregistrer
`);
