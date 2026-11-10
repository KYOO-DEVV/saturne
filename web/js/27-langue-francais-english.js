/* ---------- Langue (Français / English) ---------- */
/* Le texte de l'interface est écrit dans les deux langues dans le code ; ce traducteur remet tout dans la langue choisie
   (textes, infobulles, notifications, fenêtres). Chaque ligne : anglais | français. */
const PAIRS = `
Home|Accueil
Search|Recherche
Artists|Artistes
Your Library|Ma bibliothèque
Library|Bibliothèque
Settings|Réglages
Playlists|Playlists
Playlist|Playlist
Collapse|Réduire
History|Historique
Stats|Statistiques
Search for playlists, artists, songs…|Rechercher des playlists, artistes, titres…
Next Up|À suivre
Next up|À suivre
Clear|Vider
Nothing playing|Rien en lecture
Pick a song to start|Choisis un titre pour commencer
Welcome back|Bon retour
Welcome|Bienvenue
Sign in to find your playlists.|Connecte-toi pour retrouver tes playlists.
Create an account to keep your playlists and music.|Crée un compte pour garder tes playlists et ta musique.
Sign in|Se connecter
Create account|Créer un compte
Create my account|Créer mon compte
DISPLAY NAME|NOM AFFICHÉ
USERNAME|NOM D'UTILISATEUR
PASSWORD|MOT DE PASSE
8 characters minimum|8 caractères minimum
Your account and playlists stay on this computer.|Ton compte et tes playlists restent sur cet ordinateur.
Good night,|Bonne nuit,
Good morning,|Bonjour,
Good afternoon,|Bon après-midi,
Good evening,|Bonsoir,
New releases|Nouveautés
New release|Nouveauté
New Releases|Nouveautés
Recently Played|Écoutés récemment
Recently Added|Ajoutés récemment
Trending J-POP|J-POP du moment
Anime & OST|Anime & OST
City Pop|City Pop
See all|Tout voir
Play all|Tout lire
Play|Lire
Play next|Lire ensuite
Add to queue|Ajouter à la file
Add to playlist|Ajouter à une playlist
Add to playlist…|Ajouter à une playlist…
Bookmark|Bookmark
Remove bookmark|Retirer le bookmark
Go to artist|Aller à l'artiste
Copy YouTube link|Copier le lien YouTube
Start radio|Lancer la radio
Shuffle|Aléatoire
Repeat|Répéter
Queue|File d'attente
Share|Partager
Make private|Rendre privée
Make public|Rendre publique
Delete|Supprimer
Private|Privée
Public|Publique
Browse all|Tout parcourir
Genre|Genre
Now playing|En lecture
Create Playlist|Créer une playlist
New playlist|Nouvelle playlist
Import|Importer
Export|Exporter
Quick Access|Accès rapide
All|Toutes
Bookmarks|Bookmarks
Latest|Dernière
Created by You|Créées par toi
Community|Communauté
Sort by|Trier par
Name|Nom
Most songs|Plus de titres
Save to library|Ajouter à ma bibliothèque
Edit profile|Modifier le profil
Log out|Se déconnecter
Account|Compte
General|Général
Playback|Lecture
Appearance|Apparence
Privacy|Confidentialité
Data|Données
Updates|Mises à jour
Changelog|Nouveautés
About|À propos
Language|Langue
Square|Carré
Soft|Doux
Round|Rond
Comfortable|Confortable
Compact|Compact
Check now|Vérifier
Update|Mettre à jour
Installed|Installée
Expand all|Tout déplier
Collapse all|Tout replier
Show more|Afficher plus
Show more results|Afficher plus de résultats
Retry|Réessayer
Cancel|Annuler
Close|Fermer
Save|Enregistrer
OK|OK
Undo|Annuler
Skip|Passer
Back|Retour
Next|Suivant
Done|Terminé
Welcome to Saturne|Bienvenue dans Saturne
Today|Aujourd'hui
Yesterday|Hier
Sleep timer|Minuterie de sommeil
Off|Désactivée
Mini player|Mini-lecteur
Skip to content|Aller au contenu
Greeting|Salutation
Play your mix|Lire ton mix
Let's listen to something amazing today.|Écoutons quelque chose de génial aujourd'hui.
No songs yet|Pas encore de titres
Listening history|Historique d'écoute
Listening stats|Statistiques d'écoute
Plays|Écoutes
Songs played|Titres écoutés
Estimated listening time|Temps d'écoute estimé
Top artists|Artistes les plus écoutés
Top songs|Titres les plus écoutés
Last 7 days|7 derniers jours
Clear history|Effacer l'historique
Nothing played yet. Your listening history and stats will show up here.|Rien d'écouté pour le moment. Ton historique et tes statistiques apparaîtront ici.
15 minutes|15 minutes
30 minutes|30 minutes
45 minutes|45 minutes
1 hour|1 heure
End of this track|Fin de ce titre
Turn off timer|Désactiver la minuterie
Radio|Radio
Language changed|Langue modifiée
Import from YouTube|Importer depuis YouTube
Import a playlist|Importer une playlist
Import data|Importer des données
Merge|Fusionner
Replace|Remplacer
Restore|Restaurer
Automatic backups|Sauvegardes automatiques
Desktop|Bureau
Media keys|Touches multimédia
Tray icon|Icône de notification
Discord|Discord
Application ID|Identifiant d'application
Get started|Commencer
Continue|Continuer
Previous|Précédent
Mini|Mini
Expand|Agrandir
Radio started|Radio lancée
No errors|Aucune erreur
Search|Chercher
Refresh|Actualiser
Latest player errors|Dernières erreurs du lecteur
Region|Région
Quick start|Démarrage rapide
YouTube is not responding right now|YouTube ne répond pas pour le moment
Open your library|Ouvrir ma bibliothèque
Loading…|Chargement…
Loading songs…|Chargement des titres…
Searching…|Recherche en cours…
No songs found.|Aucun titre trouvé.
No songs found. Try other words.|Aucun titre trouvé. Essaie d'autres mots.
No artists found.|Aucun artiste trouvé.
No playable songs found for this artist.|Aucun titre lisible trouvé pour cet artiste.
Nothing to show right now.|Rien à afficher pour le moment.
Nothing yet.|Rien pour le moment.
Search for a song or an artist in the top bar, or pick a genre.|Cherche un titre ou un artiste dans la barre du haut, ou choisis un genre.
A selection of artists to discover. Search for a name to find more.|Une sélection d'artistes à découvrir. Cherche un nom pour en trouver d'autres.
Artist name|Nom d'un artiste
Search for an artist|Chercher un artiste
Artist|Artiste
This playlist is empty.|Cette playlist est vide.
This playlist is empty. Drag a song onto it in the sidebar, or use the “+” button.|Cette playlist est vide. Glisse un titre sur elle dans la barre latérale, ou utilise le bouton « + ».
No playlists in this category.|Aucune playlist dans cette catégorie.
No public playlists yet. Playlists that other accounts on this computer make public appear here.|Aucune playlist publique pour le moment. Les playlists que les autres comptes de cet ordinateur rendent publiques apparaissent ici.
Your library is empty|Ta bibliothèque est vide
Create your first playlist, import one with a code, or discover the community's.|Crée ta première playlist, importes-en une avec un code, ou découvre celles de la communauté.
The queue is empty. Play a song, or drag one here.|La file est vide. Lance un titre, ou glisse-en un ici.
Your favourite playlists, all in one place.|Tes playlists préférées, toutes au même endroit.
Drop the banner image|Dépose l'image de la bannière
Banner|Bannière
Remove banner|Retirer la bannière
Drop an image|Dépose une image
Remove cover|Retirer la pochette
Confirm deletion|Confirmer la suppression
Your bookmarks are always private.|Tes bookmarks sont toujours privés.
Public: other accounts on this computer can see and play this playlist (Community tab).|Public : les autres comptes de cet ordinateur peuvent voir et écouter cette playlist (onglet Community).
Private: only you can see this playlist.|Private : toi seul peux voir cette playlist.
Add a description|Ajoute une description
Your saved songs|Tes titres enregistrés
Drag an image onto the cover or the banner|Glisse une image sur la pochette ou la bannière
Playlist name|Nom de la playlist
Description|Description
Change the playlist image|Changer l'image de la playlist
My playlist no.|Ma playlist n°
Add to|Ajouter à
New playlist name|Nom de la nouvelle playlist
Create and add|Créer et ajouter
My account|Mon compte
Previous page|Page précédente
Next page|Page suivante
Open menu|Ouvrir le menu
Previous song|Titre précédent
Next song|Titre suivant
Play|Lecture
Shuffle|Lecture aléatoire
Repeat|Répétition
Mute|Couper le son
Volume|Volume
Position in the song|Position dans le titre
Add to bookmarks|Ajouter aux bookmarks
Remove from bookmarks|Retirer des bookmarks
Add to queue|Ajouter à la file d'attente
Move up|Monter
Move down|Descendre
Remove|Retirer
Pause|Pause
Collapse sidebar|Réduire la barre latérale
Expand sidebar|Agrandir la barre latérale
Create a playlist|Créer une playlist
Navigation|Navigation
Settings categories|Catégories de réglages
Repeat off|Répétition désactivée
Repeat the whole queue|Répéter toute la file
Repeat this song|Répéter ce titre
Repeating the whole queue|Répétition de toute la file
Repeating this song|Répétition de ce titre
Shuffle on|Lecture aléatoire activée
Shuffle off|Lecture aléatoire désactivée
End of the queue|Fin de la file d'attente
Added to queue|Ajouté à la file d'attente
Queue cleared|File d'attente vidée
Pick a song first|Choisis d'abord un titre
Added to bookmarks|Ajouté aux bookmarks
Removed from bookmarks|Retiré des bookmarks
Public playlist: other accounts on this computer can see it|Playlist publique : les autres comptes de cet ordinateur peuvent la voir
Private playlist: only you can see it|Playlist privée : toi seul peux la voir
Playlist added to your library (private)|Playlist ajoutée à ta bibliothèque (privée)
This playlist is empty|Cette playlist est vide
Will play next|Sera lu ensuite
Link copied|Lien copié
Code copied|Code copié
Song removed|Titre retiré
History cleared|Historique effacé
Export started|Export lancé
Profile updated|Profil mis à jour
Photo removed|Photo retirée
Profile photo updated|Photo de profil mise à jour
Password changed|Mot de passe changé
Playlist image updated|Image de la playlist mise à jour
Banner updated|Bannière mise à jour
Couldn't read this image|Impossible de lire cette image
Drop an image file|Dépose un fichier image
Found another version|Autre version trouvée
Saturne is up to date|Saturne est à jour
Update interrupted|Mise à jour interrompue
Saturne is restarting…|Saturne redémarre…
Downloading and verifying…|Téléchargement et vérification…
Manual installation|Installation manuelle
See what's new|Voir les nouveautés
The player couldn't load. Check your connection, then restart Saturne.|Le lecteur n'a pas pu se charger. Vérifie ta connexion puis relance Saturne.
The player is slow to start… check your internet connection.|Le lecteur met du temps à démarrer… vérifie ta connexion internet.
Saturne's server isn't responding.|Le serveur de Saturne ne répond pas.
Saturne's server isn't responding. Restart the application.|Le serveur de Saturne ne répond pas. Relance l'application.
Try again in a moment.|Réessaie dans un instant.
Error|Erreur
Your session has expired, sign in again.|Ta session a expiré, reconnecte-toi.
Another version|Autre version
Sign-in required|Connexion requise
Invalid data|Données invalides
Empty search|Recherche vide
Missing title|Titre manquant
Invalid parameters|Paramètres invalides
Invalid playlist|Playlist invalide
Account not found|Compte introuvable
Wrong password|Mot de passe incorrect
Wrong username or password|Nom d'utilisateur ou mot de passe incorrect
This username is already taken|Ce nom d'utilisateur est déjà pris
This username is already taken|Cet identifiant est déjà pris
The password must be at least 8 characters|Le mot de passe doit faire au moins 8 caractères
The new password must be at least 8 characters|Le nouveau mot de passe doit faire au moins 8 caractères
The display name can't be empty|Le nom affiché ne peut pas être vide
Username: 3 to 24 characters (letters, digits, _ . -)|Identifiant : 3 à 24 caractères (lettres, chiffres, _ . -)
Username: 3 to 24 characters (letters, digits, _ . -)|Nom d'utilisateur : 3 à 24 caractères (lettres, chiffres, _ . -)
Invalid or too large profile image|Image de profil invalide ou trop lourde
This playlist doesn't exist or is no longer public|Cette playlist n'existe pas ou n'est plus publique
No other playable version found|Aucune autre version lisible trouvée
Invalid video ID|Identifiant de vidéo invalide
Invalid channel ID|Identifiant de chaîne invalide
Invalid playlist ID|Identifiant de playlist invalide
Playlist not found or private|Playlist introuvable ou privée
This playlist is empty or private|Cette playlist est vide ou privée
No radio available for this song|Aucune radio disponible pour ce titre
Backup not found|Sauvegarde introuvable
Invalid backup|Sauvegarde invalide
Request refused|Requête refusée
Saturne is already up to date|Saturne est déjà à jour
YouTube is temporarily limiting searches from this computer (too many requests). Wait a few minutes and try again.|YouTube limite temporairement les recherches depuis cet ordinateur (trop de requêtes). Patiente quelques minutes puis réessaie.
Video not found or private|Vidéo introuvable ou privée
This code isn't valid|Ce code n'est pas valide
This code is damaged or incomplete|Ce code est abîmé ou incomplet
This code contains no songs|Ce code ne contient aucun titre
Imported playlist|Playlist importée
Generating the code…|Génération du code…
Couldn't generate the code.|Impossible de générer le code.
Share code|Code de partage
Copy code|Copier le code
Your profile and account security.|Ton profil et la sécurité de ton compte.
Security|Sécurité
Username|Identifiant
Change|Changer
Password|Mot de passe
At least 8 characters. Your other sessions will be signed out.|Au moins 8 caractères. Tes autres sessions seront fermées.
Session|Session
You'll be signed out of this device.|Tu seras déconnecté de cet appareil.
Delete account|Supprimer le compte
Permanently deletes your account, playlists and history.|Supprime définitivement ton compte, tes playlists et ton historique.
Region, sidebar and notifications.|Région, barre latérale et notifications.
Search region|Région de recherche
Changes the region of search and genre results.|Change la région des résultats de la recherche et des genres.
Collapsed sidebar|Barre latérale réduite
Keeps only the icons to leave more room for music.|Garde seulement les icônes pour laisser plus de place à la musique.
Notifications|Notifications
Shows small messages when you add a song, change a setting, etc. Errors are always shown.|Affiche de petits messages quand tu ajoutes un titre, changes un réglage, etc. Les erreurs restent toujours visibles.
How music starts and continues.|Comment la musique se lance et s'enchaîne.
Autoplay|Lecture automatique
Moves to the next song when one ends. When off, playback stops at the end of the song.|Passe au titre suivant quand un titre se termine. Désactivé, la lecture s'arrête à la fin du titre.
Resume the queue|Reprendre la file d'attente
Keeps the queue and the last song for the next launch.|Garde la file et le dernier titre au prochain lancement.
Show the video player|Afficher le lecteur vidéo
Shows the YouTube player in a corner. Useful to see why a song doesn't start (YouTube message, age, consent…).|Montre le lecteur YouTube dans un coin. Utile pour voir pourquoi un titre ne se lance pas (message de YouTube, âge, consentement…).
Keyboard shortcuts|Raccourcis clavier
Color, corners and animations.|Couleur, arrondis et animations.
Accent color|Couleur d'accent
Buttons, selection and the progress bar.|Boutons, sélection et barre de progression.
Corner style|Style des coins
Square for a sober look, round for softness.|Carrés pour un rendu plus sobre, arrondis pour plus de douceur.
Automatic home banner|Bannière d'accueil automatique
Cycles through new releases every 7 seconds.|Fait défiler les nouvelles sorties toutes les 7 secondes.
Density|Densité
Compact reduces margins and card size to show more songs.|Compact réduit les marges et la taille des cartes pour voir plus de titres.
Reduce animations|Réduire les animations
Turns off transitions (useful on a slow computer).|Désactive les transitions (utile sur un ordinateur lent).
Who can see your playlists on this computer.|Qui peut voir tes playlists sur cet ordinateur.
Default privacy|Confidentialité par défaut
Visibility of new playlists. You can change it for each one.|Visibilité des nouvelles playlists. Tu peux la changer pour chacune.
Your public playlists|Tes playlists publiques
None yet. Everything is private.|Aucune pour le moment. Tout est privé.
See my playlists|Voir mes playlists
Always private, even if you change the default privacy.|Toujours privés, même si tu changes la confidentialité par défaut.
Clears your account's listening history and stats.|Efface l'historique d'écoute et les statistiques de ton compte.
Clears your account's “Recently Played” list.|Efface la liste « Recently Played » de ton compte.
Clear|Effacer
What Saturne keeps for your account.|Ce que Saturne garde pour ton compte.
Your library|Ta bibliothèque
Export my data|Exporter mes données
Downloads a JSON file with your playlists, queue and settings.|Télécharge un fichier JSON avec tes playlists, ta file et tes réglages.
Restores a file exported by Saturne, merging or replacing your data.|Restaure un fichier exporté par Saturne, en fusionnant ou en remplaçant tes données.
Saturne keeps the last 10 backups of your account, at most one per hour.|Saturne garde les 10 dernières sauvegardes de ton compte, une par heure au plus.
No backups yet.|Aucune sauvegarde pour le moment.
Data folder|Dossier des données
Saturne updates from the project's GitHub releases.|Saturne se met à jour depuis les releases GitHub du projet.
Installed version|Version installée
Checking…|Vérification…
Not checked yet|Pas encore vérifié
Check at launch|Vérifier au lancement
Looks for a new version a few seconds after Saturne opens.|Cherche une nouvelle version quelques secondes après l'ouverture de Saturne.
What changes in each version of Saturne.|Ce qui change à chaque version de Saturne.
Saturne, a music streaming app written in Rust.|Saturne, une application de streaming musical écrite en Rust.
Version|Version
Project|Projet
Use your keyboard's play/pause, next and previous keys, even when Saturne isn't in the foreground.|Utilise les touches lecture/pause, suivant et précédent de ton clavier, même quand Saturne n'est pas au premier plan.
Notification area icon|Icône dans la zone de notification
The window's close button minimizes Saturne to the notification area instead of quitting: music keeps playing.|La croix de la fenêtre réduit Saturne dans la zone de notification au lieu de le fermer : la musique continue.
Discord (Rich Presence)|Discord (Rich Presence)
Shows the current song on your Discord profile. Create an application at discord.com/developers and paste its Application ID below.|Affiche le titre en cours sur ton profil Discord. Crée une application sur discord.com/developers et colle son Application ID ci-dessous.
Show on Discord|Afficher sur Discord
Space|Espace
Play / pause|Lecture / pause
Back / forward 5 seconds|Reculer / avancer de 5 secondes
Previous / next song|Titre précédent / suivant
Go to search|Aller à la recherche
Mute / unmute|Couper / rétablir le son
Bookmark the current song|Mettre le titre en cours en bookmark
Open / close the queue|Ouvrir / fermer la file d'attente
Show this help|Afficher cette aide
Close a menu or a window|Fermer un menu ou une fenêtre
Esc|Échap
Shift + ← →|Maj + ← →
They work everywhere in Saturne, except while typing.|Ils fonctionnent partout dans Saturne, sauf pendant la saisie de texte.
New|Nouveau
Improved|Amélioré
Fixed|Corrigé
Useful to see why a song doesn't start|Utile pour voir pourquoi un titre ne se lance pas
Play a song to see it here.|Lance un titre pour le voir ici.
Japan|Japon
South Korea|Corée du Sud
United States|États-Unis
United Kingdom|Royaume-Uni
Brazil|Brésil
Violet|Violet
Blue|Bleu
Green|Vert
Pink|Rose
Orange|Orange
Electronic|Électro
Classical|Classique
Latin|Latino
Change username|Changer l'identifiant
Your username is used to sign in. Your playlists and history are kept.|Ton identifiant sert à te connecter. Tes playlists et ton historique sont conservés.
NEW USERNAME|NOUVEL IDENTIFIANT
CURRENT PASSWORD|MOT DE PASSE ACTUEL
NEW PASSWORD|NOUVEAU MOT DE PASSE
CONFIRM|CONFIRMER
Change password|Changer le mot de passe
The two passwords don't match|Les deux mots de passe sont différents
This can't be undone: your account, playlists and history will be deleted from this computer.|Cette action est définitive : ton compte, tes playlists et ton historique seront supprimés de cet ordinateur.
Change your photo and display name. You can also drop an image onto the photo.|Change ta photo et ton nom affiché. Tu peux aussi déposer une image sur la photo.
Choose a photo|Choisir une photo
Remove photo|Retirer la photo
Change photo|Changer la photo
Paste a <b>SATURNE1…</b> share code from a friend here. The playlist will be added to your library, privately.|Colle ici un code de partage <b>SATURNE1…</b> reçu d'un ami. La playlist sera ajoutée à ta bibliothèque, en privé.
Update|Mise à jour
available|disponible
Download|Télécharger
Player|Lecteur
No recent errors.|Aucune erreur récente.
No errors right now.|Aucune erreur pour le moment.
Resume the queue|Reprendre la file
Automatic banner|Bannière automatique
Installing downloads|L'installation télécharge
from the release, checks its SHA-256 fingerprint, replaces the app, then relaunches it. Your accounts and playlists aren't touched.|depuis la release, vérifie son empreinte SHA-256, remplace l'application puis la relance. Tes comptes et playlists ne sont pas touchés.
YouTube (hidden player, audio only)|YouTube (lecteur caché, audio seul)
Remove from queue|Retirer de la file
Send this code to someone: in Saturne, they go to|Envoie ce code à quelqu'un : dans Saturne, il va dans
Your Library › Import|Ma bibliothèque › Importer
`;
const FR_TO_EN = new Map(), EN_TO_FR = new Map();
const addPairs = txt => txt.split('\n').forEach(l => { const i = l.indexOf('|'); if (i < 1) return; const a = l.slice(0, i).trim(), b = l.slice(i + 1).trim(); if (!a || !b) return; if (!EN_TO_FR.has(a)) EN_TO_FR.set(a, b); if (!FR_TO_EN.has(b)) FR_TO_EN.set(b, a); });
addPairs(PAIRS);
const MONTHS = {fr:['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en:['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']};
/* Phrases avec des morceaux variables (nombre, nom de playlist…). [motif source, texte cible]. */
const PAT_FR_EN = [
  [/^il y a (\d+) min$/, '$1 min ago'], [/^il y a (\d+) h$/, '$1 h ago'], [/^il y a (\d+) j$/, '$1 d ago'], [/^il y a (\d+) sem\.$/, '$1 wk ago'],
  [/^(\d+) titres?$/, (m, n) => `${n} song${n > 1 ? 's' : ''}`],
  [/^Lire (.+)$/, 'Play $1'], [/^Ouvrir (.+)$/, 'Open $1'], [/^Sortie (\d+) : (.+)$/, 'Release $1: $2'],
  [/^Ajouté à « (.+) »$/, 'Added to “$1”'], [/^Déjà dans « (.+) »$/, 'Already in “$1”'], [/^Playlist « (.+) » supprimée$/, 'Playlist “$1” deleted'],
  [/^Résultats pour « (.+) »\.$/, 'Results for “$1”.'], [/^Région : (.+)$/, (m, c) => 'Region: ' + (FR_TO_EN.get(c) || c)], [/^Saturne (.+) est installé$/, 'Saturne $1 is installed'],
  [/^Identifiant changé : (.+)$/, 'Username changed: $1'], [/^Playlist importée : (\d+) titres?$/, (m, n) => `Imported playlist: ${n} song${n > 1 ? 's' : ''}`],
  [/^Mise à jour vers (.+)$/, 'Updating to $1'], [/^Version (.+) disponible$/, 'Version $1 available'],
  [/^(\d+) playlists?, (\d+) titres?, (\d+) titres? dans l'historique\.$/, (m, a, b, c) => `${a} playlist${a > 1 ? 's' : ''}, ${b} song${b > 1 ? 's' : ''}, ${c} song${c > 1 ? 's' : ''} in history.`],
  [/^Impossible de lire (« .+ ») \((.+)\)$/, "Couldn't play $1 ($2)"], [/^Impossible de lire (« .+ »), je passe au suivant$/, "Couldn't play $1, skipping to the next"],
  [/^(« .+ ») ne se lance pas \((.+)\)\. Je cherche une autre version…$/, "$1 won't start ($2). Looking for another version…"],
  [/^Enregistrement impossible : (.+)$/, "Couldn't save: $1"], [/^Export impossible : (.+)$/, "Couldn't export: $1"],
  [/^Téléchargement impossible \((.+)\)$/, 'Download failed ($1)'], [/^Écriture impossible : (.+)$/, "Couldn't write: $1"],
  [/^Connexion à YouTube impossible \((.+)\)$/, "Couldn't reach YouTube ($1)"], [/^YouTube a répondu (.+)$/, 'YouTube replied $1'],
  [/^Erreur (\d+)$/, 'Error $1'], [/^Maj \+ (.+)$/, 'Shift + $1'],
  [/^Dépose l'image de la bannière$/, 'Drop the banner image'],
  [/^par (.+)$/, 'by $1'], [/^et le colle pour récupérer la playlist ((d+) titres?).$/, (m, n) => `and paste it to get the playlist (${n} song${n > 1 ? 's' : ''}).`], [/^(@\S+) : sert à te connecter\.$/, '$1: used to sign in.'], [/^(\d+) playlists? visibles? par les autres comptes \(onglet Community\)\.$/, (m, n) => `${n} playlist${n > 1 ? 's' : ''} visible to other accounts (Community tab).`]
];
const PAT_EN_FR = [
  [/^(\d+) songs?$/, (m, n) => `${n} titre${n > 1 ? 's' : ''}`], [/^(\d+) playlists?$/, (m, n) => `${n} playlist${n > 1 ? 's' : ''}`],
  [/^by (.+)$/, 'par $1'], [/^Share « (.+) »$/, 'Partager « $1 »'], [/^Add to bookmarks$/, 'Ajouter aux bookmarks'],
  [/^Release (\d+): (.+)$/, 'Sortie $1 : $2'], [/^New release · (.+)$/, 'Nouveauté · $1'], [/^(\d+) min left$/, '$1 min restantes'], [/^Sleep timer: (.+)$/, 'Minuterie : $1'],
  [/^(\d+) plays?$/, (m, n) => `${n} écoute${n > 1 ? 's' : ''}`], [/^~?([\d.,]+) h$/, '$1 h'], [/^Show more \((\d+)\)$/, 'Afficher plus ($1)'],
  [/^Imported (\d+) songs?$/, (m, n) => `${n} titre${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}`],
  [/^(\d+) songs? from (.+)$/, (m, n, o) => `${n} titre${n > 1 ? 's' : ''} de ${o}`],
  [/^Slide (\d+) of (\d+)$/, 'Diapo $1 sur $2']
];
const PAT_FR_EN2 = [
  [/^(\d+) min restantes$/, '$1 min left'], [/^Minuterie : (.+)$/, 'Sleep timer: $1'], [/^(\d+) écoutes?$/, (m, n) => `${n} play${n > 1 ? 's' : ''}`], [/^Afficher plus \((\d+)\)$/, 'Show more ($1)'],
  [/^(\d+) titres? de (.+)$/, (m, n, o) => `${n} song${n > 1 ? 's' : ''} from ${o}`], [/^(\d+) titres? importés?$/, (m, n) => `Imported ${n} song${n > 1 ? 's' : ''}`],
  [/^Diapo (\d+) sur (\d+)$/, 'Slide $1 of $2'], [/^Nouveauté · (.+)$/, 'New release · $1'], [/^Partager « (.+) »$/, 'Share “$1”']
];
let LANG = 'fr';
const L = (en, fr) => LANG === 'fr' ? fr : en;
function trText(s){
  const core = s.trim(); if (!core) return s;
  const lead = s.slice(0, s.indexOf(core)), tail = s.slice(s.indexOf(core) + core.length);
  const one = x => {
    const map = LANG === 'en' ? FR_TO_EN : EN_TO_FR;
    if (map.has(x)) return map.get(x);
    for (const [re, to] of (LANG === 'en' ? PAT_FR_EN.concat(PAT_FR_EN2) : PAT_EN_FR)) if (re.test(x)) return x.replace(re, to);
    return null;
  };
  let r = one(core);
  if (r === null && core.includes(' · ')) { const parts = core.split(' · '), out = parts.map(p => one(p.trim()) ?? p); if (out.some((p, i) => p !== parts[i])) r = out.join(' · '); }
  return r === null || r === core ? s : lead + r + tail;
}
const NO_TR = '.tt,.ch,.alink,.qm,.pli:not(.create)>b,.libcard:not(.create) .lc-meta b,.m,.mini-row b,.mini-row small,.sl-title,.sl-by,#nowTitle,#nowCh,.title-input,.desc-input,textarea,input,code,.cl-t,.acc-name,#accName,#accUser,.who,.who2,.avatar-big,.avatar-s,.avatar,.artist b,.artist small,[data-notr]';
const ATTR_SKIP = '.tt,.ch,.sl-title,.sl-by';
const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
function trNode(n){
  if (n.nodeType === 3) { const p = n.parentElement; if (!p || p.closest('script,style') || p.closest(NO_TR)) return; const v = trText(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; return; }
  if (n.nodeType !== 1 || n.closest('script,style')) return;
  const attrsOf = el => { if (el.closest(ATTR_SKIP)) return; ATTRS.forEach(a => { const v = el.getAttribute && el.getAttribute(a); if (v) { const t = trText(v); if (t !== v) el.setAttribute(a, t); } }); };
  attrsOf(n); n.querySelectorAll('[aria-label],[title],[placeholder]').forEach(attrsOf);
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); let x; while ((x = w.nextNode())) trNode(x);
}
let trBusy = false;
const trObs = new MutationObserver(list => {
  if (trBusy) return; trBusy = true;
  try { for (const m of list) { if (m.type === 'childList') m.addedNodes.forEach(trNode); else if (m.type === 'characterData') trNode(m.target); else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName); if (v) { const t = trText(v); if (t !== v) m.target.setAttribute(m.attributeName, t); } } } }
  finally { trBusy = false; trObs.takeRecords(); }
});
function detectLang(){ return /^fr/i.test(navigator.language || '') ? 'fr' : 'en'; }
function applyLang(lang){
  LANG = lang === 'en' ? 'en' : 'fr';
  document.documentElement.lang = LANG;
  trObs.disconnect(); trBusy = true; try { trNode(document.body); } finally { trBusy = false; }
  trObs.observe(document.body, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:ATTRS});
}

