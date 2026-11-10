/* ---------- Thème et réglages ---------- */
const ACCENTS = {
  violet:['#7c3aed','#a78bfa','rgba(139,92,246,.15)','rgba(139,92,246,.2)'],
  blue:['#2563eb','#60a5fa','rgba(59,130,246,.15)','rgba(59,130,246,.2)'],
  green:['#15803d','#4ade80','rgba(34,197,94,.15)','rgba(34,197,94,.18)'],
  pink:['#be185d','#f472b6','rgba(236,72,153,.15)','rgba(236,72,153,.2)'],
  orange:['#c2410c','#fb923c','rgba(249,115,22,.15)','rgba(249,115,22,.2)']
};
const ACCENT_NAMES = {violet:'Violet', blue:'Bleu', green:'Vert', pink:'Rose', orange:'Orange'};
const DEFAULT_SETTINGS = {seen:'', density:'comfortable', lang:'', mediaKeys:true, tray:false, discord:false, discordId:'', onboarded:false, showPlayer:false, autoplay:true, remember:true, toasts:true, accent:'violet', radius:'soft', heroAuto:true, reduceMotion:false, autoUpdate:true};
function applyTheme(){
  const a = ACCENTS[S.settings.accent] || ACCENTS.violet, st = document.documentElement.style;
  st.setProperty('--accent', a[0]); st.setProperty('--accent-hi', a[1]); st.setProperty('--accent-soft', a[2]); st.setProperty('--accent-glow', a[3]);
  document.documentElement.dataset.radius = ['square', 'soft', 'round'].includes(S.settings.radius) ? S.settings.radius : 'soft';
  document.documentElement.classList.toggle('no-motion', !!S.settings.reduceMotion);
  document.documentElement.dataset.density = S.settings.density === 'compact' ? 'compact' : 'comfortable';
  const yb = document.querySelector('.ytbox'); if (yb) yb.classList.toggle('show', !!S.settings.showPlayer);
}
function setCollapsed(v){
  S.collapsed = v; $('#app').classList.toggle('collapsed', v); // pas de re-rendu : la transition CSS fait l'animation
  const cb = $('#collapse'); cb.setAttribute('aria-label', v ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'); cb.title = cb.getAttribute('aria-label');
  save(); if (S.view.type === 'settings') renderView();
}
function toggleSetting(k){
  if (k === 'collapsed') return setCollapsed(!S.collapsed);
  S.settings[k] = !S.settings[k];
  if (k === 'reduceMotion') applyTheme();
  if (k === 'mediaKeys' || k === 'tray') applyNative();
  if (k === 'discord') { presKey = ''; syncPresence(); }
  save(); renderView();
}
const SET_TABS = [['account','Account','person'], ['general','General','settings'], ['playback','Playback','tune'], ['appearance','Appearance','palette'], ['privacy','Privacy','shield'], ['data','Data','storage'], ['updates','Updates','download'], ['changelog','Changelog','history'], ['about','About','info']];
const swc = (key, on, label) => `<button class="switch" role="switch" data-set="${key}" aria-checked="${on}" aria-label="${esc(label)}"></button>`;
const setRow = (title, desc, ctl, cls = '') => `<div class="set ${cls}"><div style="min-width:0"><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ''}</div>${ctl}</div>`;
const segBtn = (attr, val, cur, icon, label) => `<button ${attr}="${val}" class="${cur === val ? 'on' : ''}">${icon ? ic(icon) : ''}${label}</button>`;
function settingsHtml(){
  const u = S.user, T = S.settings, tab = S.setTab;
  const nav = SET_TABS.map(([k, n, i]) => `<button data-settab="${k}" class="${tab === k ? 'on' : ''}">${ic(i)}${n}</button>`).join('');
  let b = '';
  if (tab === 'account') b = `<h2>Account</h2><p class="lead">Ton profil et la sécurité de ton compte.</p><div class="setgroup">
      <div class="set"><div class="profile"><button class="avatar-big" data-act="editprofile" aria-label="Modifier le profil">${avatarHtml(u)}</button><div class="who2"><b>${esc(u.display)}</b><small>@${esc(u.username)}</small></div></div><button class="ghost" data-act="editprofile">${ic('edit')}Edit profile</button></div>
      <h4>Sécurité</h4>
      ${setRow('Identifiant', `@${esc(u.username)} : sert à te connecter.`, '<button class="ghost" data-act="changeusername">Changer</button>')}
      ${setRow('Mot de passe', 'Au moins 8 caractères. Tes autres sessions seront fermées.', '<button class="ghost" data-act="changepass">Changer</button>')}
      <h4>Session</h4>
      ${setRow('Se déconnecter', 'Tu seras déconnecté de cet appareil.', `<button class="ghost" data-act="logout">${ic('logout')}Log out</button>`)}
      ${setRow('Supprimer le compte', 'Supprime définitivement ton compte, tes playlists et ton historique.', `<button class="ghost warn" data-act="deleteacct">${ic('trash')}Delete</button>`, 'danger')}</div>`;
  else if (tab === 'general') b = `<h2>General</h2><p class="lead">Région, barre latérale et notifications.</p><div class="setgroup">
      ${langRow()}
      ${setRow('Région de recherche', 'Change la région des résultats de la recherche et des genres.', dd('region', 'Région de recherche'))}
      ${setRow('Barre latérale réduite', 'Garde seulement les icônes pour laisser plus de place à la musique.', swc('collapsed', S.collapsed, 'Barre latérale réduite'))}
      ${setRow('Notifications', 'Affiche de petits messages quand tu ajoutes un titre, changes un réglage, etc. Les erreurs restent toujours visibles.', swc('toasts', T.toasts, 'Notifications'))}${desktopRows()}</div>`;
  else if (tab === 'playback') b = `<h2>Playback</h2><p class="lead">Comment la musique se lance et s'enchaîne.</p><div class="setgroup">
      ${setRow('Lecture automatique', 'Passe au titre suivant quand un titre se termine. Désactivé, la lecture s\'arrête à la fin du titre.', swc('autoplay', T.autoplay, 'Lecture automatique'))}
      ${setRow('Reprendre la file d\'attente', 'Garde la file et le dernier titre au prochain lancement.', swc('remember', T.remember, 'Reprendre la file'))}
      ${setRow('Afficher le lecteur vidéo', 'Montre le lecteur YouTube dans un coin. Utile pour voir pourquoi un titre ne se lance pas (message de YouTube, âge, consentement…).', swc('showPlayer', T.showPlayer, 'Afficher le lecteur vidéo'))}
      ${playerLogHtml()}
      <h4>Raccourcis clavier</h4>
      <div class="set"><p class="kv" style="width:100%">${shortcutsKv()}</p></div></div>`;
  else if (tab === 'appearance') b = `<h2>Appearance</h2><p class="lead">Couleur, arrondis et animations.</p><div class="setgroup">
      ${setRow('Couleur d\'accent', 'Boutons, sélection et barre de progression.', `<div class="swatches" role="group" aria-label="Couleur d'accent">${Object.entries(ACCENTS).map(([k, c]) => `<button class="swatch ${T.accent === k ? 'on' : ''}" data-accent="${k}" style="--c:${c[0]}" title="${ACCENT_NAMES[k]}" aria-label="${ACCENT_NAMES[k]}" aria-pressed="${T.accent === k}"></button>`).join('')}</div>`)}
      ${setRow('Style des coins', 'Carrés pour un rendu plus sobre, arrondis pour plus de douceur.', `<div class="seg" role="group" aria-label="Style des coins">${segBtn('data-radiusset', 'square', T.radius, '', 'Square')}${segBtn('data-radiusset', 'soft', T.radius, '', 'Soft')}${segBtn('data-radiusset', 'round', T.radius, '', 'Round')}</div>`)}
      ${setRow('Bannière d\'accueil automatique', 'Fait défiler les nouvelles sorties toutes les 7 secondes.', swc('heroAuto', T.heroAuto, 'Bannière automatique'))}
      ${setRow('Densité', 'Compact réduit les marges et la taille des cartes pour voir plus de titres.', `<div class="seg" role="group" aria-label="Densité">${segBtn('data-densityset', 'comfortable', T.density, '', 'Comfortable')}${segBtn('data-densityset', 'compact', T.density, '', 'Compact')}</div>`)}
      ${setRow('Réduire les animations', 'Désactive les transitions (utile sur un ordinateur lent).', swc('reduceMotion', T.reduceMotion, 'Réduire les animations'))}</div>`;
  else if (tab === 'privacy') { const pub = S.playlists.filter(isPublic).length; b = `<h2>Privacy</h2><p class="lead">Qui peut voir tes playlists sur cet ordinateur.</p><div class="setgroup">
      ${setRow('Confidentialité par défaut', 'Visibilité des nouvelles playlists. Tu peux la changer pour chacune.', `<div class="seg" role="group" aria-label="Confidentialité par défaut">${segBtn('data-act="defpriv" data-v', 'private', S.defaultPrivacy, 'lock', 'Private')}${segBtn('data-act="defpriv" data-v', 'public', S.defaultPrivacy, 'globe', 'Public')}</div>`)}
      ${setRow('Tes playlists publiques', pub ? `${plural(pub, 'playlist')} visible${pub > 1 ? 's' : ''} par les autres comptes (onglet Community).` : 'Aucune pour le moment. Tout est privé.', '<button class="ghost" data-go="library">Voir mes playlists</button>')}
      ${setRow('Bookmarks', 'Toujours privés, même si tu changes la confidentialité par défaut.', `<span class="kbd">${ic('lock').replace('<svg', '<svg style="width:14px;height:14px;display:inline"')} Private</span>`)}
      ${setRow('Historique d\'écoute', 'Efface l\'historique d\'écoute et les statistiques de ton compte.', '<button class="ghost" data-act="clearhist">Effacer</button>')}</div>`; }
  else if (tab === 'data') { const n = S.playlists.length, t = S.playlists.reduce((a, p) => a + p.tracks.length, 0); b = `<h2>Data</h2><p class="lead">Ce que Saturne garde pour ton compte.</p><div class="setgroup">
      ${setRow('Ta bibliothèque', `${plural(n, 'playlist')}, ${plural(t, 'titre')}, ${plural(S.history.length, 'titre')} dans l'historique.`, '')}
      ${setRow('Exporter mes données', 'Télécharge un fichier JSON avec tes playlists, ta file et tes réglages.', `<button class="ghost" data-act="exportdata">${ic('download')}Export</button>`)}
      ${importRow()}${backupRow()}
      ${setRow('Dossier des données', S.about ? `<span style="word-break:break-all">${esc(S.about.dataDir)}</span>` : 'Chargement…', '')}</div>`; }
  else if (tab === 'updates') {
    const U = S.update, i = U.info, cur = (S.about && S.about.version) || (i && i.current) || '…';
    const stat = U.checking ? ['', 'Vérification…'] : U.error ? ['', esc(U.error)] : i ? (i.available ? ['new', `Version ${esc(i.latest)} disponible`] : ['ok', 'Saturne est à jour']) : ['', 'Pas encore vérifié'];
    b = `<h2>Updates</h2><p class="lead">Saturne se met à jour depuis les releases GitHub du projet.</p><div class="setgroup">
      ${setRow('Version installée', `<span class="upstat ${stat[0]}"><span class="dot"></span>${stat[1]}</span>`, `<div style="display:flex;gap:10px;align-items:center"><b>v${esc(cur)}</b><button class="ghost" data-act="checkupdate" ${U.checking ? 'disabled' : ''}>${ic('refresh')}Check now</button></div>`)}
      ${i && i.available ? `<div class="set" style="display:block"><div style="display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap"><div><h3>Saturne ${esc(i.latest)}</h3><p>${i.size ? Math.round(i.size / 1048576 * 10) / 10 + ' Mo' : ''}${i.canInstall ? '' : ' · installation manuelle requise (pas d\'empreinte de sécurité)'}</p></div><button class="btn" data-act="installupdate" ${U.installing ? 'disabled' : ''}>${ic('download')}Update now</button></div>${i.notes ? `<pre class="notes">${esc(i.notes)}</pre>` : ''}</div>` : ''}
      ${setRow('Vérifier au lancement', 'Cherche une nouvelle version quelques secondes après l\'ouverture de Saturne.', swc('autoUpdate', T.autoUpdate, 'Vérifier au lancement'))}
      <p class="lead" style="margin:6px 0 0;font-size:13px">L'installation télécharge <b>Saturne.exe</b> depuis la release, vérifie son empreinte SHA-256, remplace l'application puis la relance. Tes comptes et playlists ne sont pas touchés.</p></div>`;
  } else if (tab === 'changelog') b = changelogHtml();
  else if (tab === 'about') b = `<h2>About</h2><p class="lead">Saturne, une application de streaming musical écrite en Rust.</p><div class="setgroup"><div class="set"><p class="kv" style="width:100%"><span>Version</span><b>${S.about ? esc(S.about.version) : '…'}</b><span>Projet</span><b>${S.about ? `<a href="https://github.com/${esc(S.about.repo)}" target="_blank" rel="noopener" style="color:var(--accent-hi)">github.com/${esc(S.about.repo)}</a>` : '…'}</b><span>Données</span><b>${S.about ? esc(S.about.dataDir) : '…'}</b><span>Compte</span><b>@${esc(u.username)}</b><span>Musique</span><b>YouTube (lecteur caché, audio seul)</b></p></div></div>`;
  return `<div class="pagehead"><p class="eyebrow">Settings</p><h1>Settings</h1></div><div class="setlayout"><nav class="setnav" aria-label="Catégories de réglages">${nav}</nav><div class="setpane"><div class="setgroup" style="display:block">${b}</div></div></div>`;
}
async function loadAbout(){
  if (S.about) return;
  try { S.about = await http('/api/about'); } catch {}
  if (S.view.type === 'settings') renderView();
}

