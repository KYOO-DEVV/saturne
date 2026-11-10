/* ---------- Changelog (liste repliable) ---------- */
const TAGS = {new:'Nouveau', improved:'Amélioré', fixed:'Corrigé'};
const CHANGELOG = [
  {v:'0.6.0', date:'Nov 2026', title:'Langue, historique, radio, mini-lecteur et plus', changes:[
    ['new', 'Réglage de langue (Français / English) pour toute l\'interface.'],
    ['new', 'Touches multimédia, titre et pochette dans la surcouche multimédia de Windows, icône dans la zone de notification et mini-lecteur toujours visible.'],
    ['new', 'Importer une playlist YouTube à partir de son lien (collé dans la recherche ou dans Import).'],
    ['new', 'Glisser-déposer pour réorganiser les titres d\'une playlist et la file d\'attente.'],
    ['new', 'Bouton « Afficher plus » dans les résultats de recherche et les genres.'],
    ['new', 'Radio : lancer un enchaînement de titres proches d\'un morceau (clic droit ou Now playing).'],
    ['new', 'Historique d\'écoute groupé par jour et statistiques (écoutes par jour, artistes et titres les plus écoutés).'],
    ['new', 'Minuterie de sommeil avec fondu du volume, y compris « fin de ce titre ».'],
    ['new', 'Importer un export de données (fusionner ou remplacer) et sauvegardes automatiques restaurables dans Settings › Data.'],
    ['new', 'Discord Rich Presence (avec l\'Application ID de ton application Discord) et petit accueil au premier lancement.'],
    ['improved', 'Barres de défilement masquées, avec des flèches sur les étagères horizontales.'],
    ['improved', 'La page Artists se charge en arrière-plan, la page ne se redessine plus à chaque titre, les longues listes se chargent par morceaux.'],
    ['improved', 'Accessibilité : focus dans les fenêtres, page courante annoncée, lien « Aller au contenu », touche Menu, meilleur contraste.'],
    ['improved', 'Si YouTube ne répond pas, l\'accueil propose de réessayer ou d\'ouvrir ta bibliothèque.']]},
  {v:'0.5.0', date:'Nov 2026', title:'Lecture fiable, fenêtre soignée, clic droit', changes:[
    ['fixed', 'Les titres qui ne se lançaient pas : Saturne relance la lecture, puis cherche automatiquement une autre version du même morceau.'],
    ['new', 'Réglage « Afficher le lecteur vidéo » et journal des erreurs du lecteur (Settings › Playback) pour comprendre un échec.'],
    ['new', 'Menu clic droit sur un titre : Play, Play next, Add to queue, Add to playlist, Bookmark, Go to artist, Copy link.'],
    ['new', 'Raccourcis clavier : / (recherche), M (muet), B (bookmark), Q (file), ? (aide).'],
    ['new', 'Densité Compact, et largeur maximale du contenu sur les grands écrans.'],
    ['improved', 'Barre de titre sombre, fond noir dès l\'ouverture (plus de flash blanc), police embarquée dans l\'application.'],
    ['improved', 'Miniatures en fondu, barres noires des vidéos recadrées automatiquement, retour visuel au clic, états vides illustrés, contrastes des couleurs d\'accent.'],
    ['improved', 'Les nouveautés et les pages d\'artistes ne proposent plus de titres interdits à la lecture hors de YouTube.']]},
  {v:'0.4.0', date:'Nov 2026', title:'Finitions du design, menus et changelog', changes:[
    ['new', 'Page « Now playing » : clique sur la pochette en bas pour l\'ouvrir.'],
    ['new', 'Menus déroulants modernes (tri des playlists, région de recherche), utilisables au clavier.'],
    ['new', 'Changelog repliable dans Settings, avec « Expand all » et « Collapse all ».'],
    ['new', 'Bouton « Annuler » après la suppression d\'une playlist, d\'un titre ou de la file.'],
    ['new', 'Pochettes de playlists en mosaïque quand il y a au moins 4 titres.'],
    ['new', 'Infobulles : temps sous la souris sur la progression, pourcentage du volume, noms dans la barre repliée.'],
    ['improved', 'Une seule famille d\'icônes, en trait fin, sur toute l\'application.'],
    ['improved', 'Transition en fondu entre les pages, avec apparition échelonnée des cartes.'],
    ['improved', 'Titres sur deux lignes dans les cartes, espacements et gris harmonisés, animations des fenêtres et des notifications.'],
    ['fixed', 'Certaines pochettes de playlists laissaient une bande vide en haut et en bas.']]},
  {v:'0.3.0', date:'Nov 2026', title:'Réglages, profil, partage et mises à jour', changes:[
    ['new', 'Réglages classés par catégories : compte, général, lecture, apparence, confidentialité, données, mises à jour.'],
    ['new', 'Profil modifiable : photo, nom affiché, identifiant et mot de passe, suppression du compte.'],
    ['new', 'Partage de playlist par code à copier, et import dans Your Library.'],
    ['new', 'Mises à jour via les releases GitHub, vérifiées par empreinte SHA-256.'],
    ['improved', 'Bookmark jaune, boutons du hero fixes, repli animé de la barre latérale.']]},
  {v:'0.2.0', date:'Nov 2026', title:'Saturne : comptes et playlists publiques', changes:[
    ['new', 'L\'application devient Saturne, en Rust, avec une fenêtre native et un installeur.'],
    ['new', 'Comptes avec mots de passe hachés (Argon2id) et données séparées par utilisateur.'],
    ['new', 'Playlists privées ou publiques, onglet Community, « Save to library ».'],
    ['new', 'Hero des sorties les plus récentes, lecteur caché (audio seul), bookmark animé.']]},
  {v:'0.1.0', date:'Nov 2026', title:'Première version (Onde)', changes:[
    ['new', 'Recherche YouTube sans clé, lecture complète, playlists, favoris et file d\'attente.'],
    ['new', 'Page Artists, genres, glisser-déposer de la pochette et de la bannière des playlists.']]}
];
const clOpen = new Set([CHANGELOG[0].v]);
const CL_EN = {
  '0.6.0': {title:'Language, history, radio, mini player and more', changes:[
    'Language setting (Français / English) for the whole interface.',
    'Media keys, title and cover in the Windows media overlay, a notification area icon and an always-on-top mini player.',
    'Import a YouTube playlist from its link (pasted in search or in Import).',
    'Drag and drop to reorder the songs of a playlist and the queue.',
    '“Show more” button in search results and genres.',
    'Radio: start a run of songs similar to a track (right-click or Now playing).',
    'Listening history grouped by day and stats (plays per day, top artists and songs).',
    'Sleep timer with a volume fade-out, including “end of this track”.',
    'Import a data export (merge or replace) and automatic backups you can restore in Settings › Data.',
    'Discord Rich Presence (with your Discord application’s Application ID) and a short welcome on first launch.',
    'Scrollbars hidden, with arrows on horizontal shelves.',
    'The Artists page loads in the background, the page no longer redraws on every song, and long lists load in chunks.',
    'Accessibility: focus in dialogs, current page announced, “Skip to content” link, Menu key, better contrast.',
    'When YouTube isn’t responding, Home offers to retry or open your library.']},
  '0.5.0': {title:'Reliable playback, polished window, right-click', changes:[
    'Songs that wouldn’t start: Saturne retries, then automatically looks for another version of the same track.',
    '“Show the video player” setting and a player error log (Settings › Playback) to understand a failure.',
    'Right-click menu on a song: Play, Play next, Add to queue, Add to playlist, Bookmark, Go to artist, Copy link.',
    'Keyboard shortcuts: / (search), M (mute), B (bookmark), Q (queue), ? (help).',
    'Compact density, and a maximum content width on large screens.',
    'Dark title bar, black background from the first frame (no white flash), font bundled in the app.',
    'Fading thumbnails, black bars of videos cropped automatically, click feedback, illustrated empty states, accent color contrast.',
    'New releases and artist pages no longer offer songs that can’t be played outside YouTube.']},
  '0.4.0': {title:'Design polish, menus and changelog', changes:[
    'Now playing page: click the cover at the bottom to open it.',
    'Modern dropdown menus (playlist sort, search region), usable with the keyboard.',
    'Collapsible changelog in Settings, with “Expand all” and “Collapse all”.',
    '“Undo” button after deleting a playlist, a song or the queue.',
    'Mosaic playlist covers when there are at least 4 songs.',
    'Tooltips: time under the mouse on the progress bar, volume percentage, names in the collapsed sidebar.',
    'A single family of thin-line icons across the whole app.',
    'Fade transition between pages, with staggered card appearance.',
    'Two-line titles in cards, harmonized spacing and greys, animations for dialogs and notifications.',
    'Some playlist covers left an empty strip at the top and bottom.']},
  '0.3.0': {title:'Settings, profile, sharing and updates', changes:[
    'Settings sorted into categories: account, general, playback, appearance, privacy, data, updates.',
    'Editable profile: photo, display name, username and password, account deletion.',
    'Playlist sharing with a copyable code, and import in Your Library.',
    'Updates through GitHub releases, verified by SHA-256 fingerprint.',
    'Yellow bookmark, fixed hero buttons, animated sidebar collapse.']},
  '0.2.0': {title:'Saturne: accounts and public playlists', changes:[
    'The app becomes Saturne, in Rust, with a native window and an installer.',
    'Accounts with hashed passwords (Argon2id) and per-user data.',
    'Private or public playlists, Community tab, “Save to library”.',
    'Hero of the latest releases, hidden player (audio only), animated bookmark.']},
  '0.1.0': {title:'First version (Onde)', changes:[
    'Keyless YouTube search, full playback, playlists, favorites and a queue.',
    'Artists page, genres, drag and drop of playlist cover and banner.']}
};
function changelogHtml(){
  const ver = (S.about && S.about.version) || CHANGELOG[0].v;
  return `<h2>Changelog</h2><p class="lead">Ce qui change à chaque version de Saturne.</p>
    <div class="head-actions" style="margin-bottom:14px"><button class="ghost" data-clall="open">${ic('down')}Expand all</button><button class="ghost" data-clall="close">${ic('up')}Collapse all</button></div>
    <div class="cl">${CHANGELOG.map((c, i) => `<div class="cl-item ${clOpen.has(c.v) ? 'open' : ''}" data-v="${c.v}">
      <button class="cl-head" data-cl="${c.v}" aria-expanded="${clOpen.has(c.v)}"><span class="cl-v">v${c.v}</span>${i === 0 ? '<span class="badge2">Latest</span>' : ''}${c.v === ver ? '<span class="badge2 on">Installed</span>' : ''}<span class="cl-t">${esc(LANG === 'en' && CL_EN[c.v] ? CL_EN[c.v].title : c.title)}</span><span class="cl-d">${esc(c.date)}</span>${ic('chevd')}</button>
      <div class="cl-body"><div class="cl-in"><div class="cl-list">${c.changes.map(([k, t], j) => `<div class="cl-row"><span class="cl-tag ${k}">${TAGS[k]}</span><span>${esc(LANG === 'en' && CL_EN[c.v] ? CL_EN[c.v].changes[j] : t)}</span></div>`).join('')}</div></div></div></div>`).join('')}</div>`;
}
function setCl(item, open){
  item.classList.toggle('open', open); item.querySelector('.cl-head').setAttribute('aria-expanded', open);
  if (open) clOpen.add(item.dataset.v); else clOpen.delete(item.dataset.v);
}
const toggleCl = v => { const it = document.querySelector(`.cl-item[data-v="${CSS.escape(v)}"]`); if (it) setCl(it, !it.classList.contains('open')); };
const setAllCl = open => document.querySelectorAll('.cl-item').forEach(it => setCl(it, open));
/* Après une mise à jour : une notification propose de lire les nouveautés. */
async function announceVersion(){
  try {
    S.about = S.about || await http('/api/about');
    const v = S.about.version, seen = S.settings.seen;
    if (seen !== v) {
      S.settings.seen = v; save();
      if (seen) toast('Saturne ' + v + ' est installé', {label:'Voir les nouveautés', undo:() => { S.setTab = 'changelog'; go({type:'settings'}); }});
    }
  } catch {}
}

