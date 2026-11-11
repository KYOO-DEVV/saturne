# Saturne

Application de streaming musical pour Windows, écrite en Rust. Noir OLED, un seul accent de couleur.

- **Musique complète** via YouTube, **sans clé API** : Saturne lit les pages de résultats publiques côté serveur.
- **Lecteur invisible** : seul le son est joué, comme dans une application de musique classique.
- **Accueil J-POP** avec un hero des **sorties les plus récentes** (miniature et titre, boutons fixes).
- **Comptes** : inscription, connexion, données séparées pour chaque utilisateur (mots de passe hachés avec Argon2id).
- **Playlists privées ou publiques**, onglet *Community*, *Save to library*, et **partage par code** (*Share* / *Import*).
- **Bookmarks** jaunes avec une animation de remplissage fluide.
- **Réglages par catégories** : compte, général, lecture, apparence (couleur, coins), confidentialité, données, mises à jour, changelog, à propos.
- **Lecture fiable** : si un titre ne se lance pas (lecture interdite hors de YouTube, blocage…), Saturne relance puis cherche automatiquement une autre version du même morceau. *Settings › Playback* peut afficher le lecteur et liste les dernières erreurs.
- **Clic droit** sur un titre, **raccourcis clavier** (touche ?), densité Compact, police embarquée, barre de titre sombre.
- **Changelog repliable** (*Expand all* / *Collapse all*), page **Now playing**, menus déroulants, annulation des suppressions, infobulles, pochettes en mosaïque.
- **Mises à jour automatiques via les releases GitHub**.
- Pochette et bannière de playlist à déposer par glisser-déposer, file d'attente, genres, artistes, précédent/suivant, barre latérale repliable.
- **Français / English** : réglage de langue pour toute l'interface (*Settings › General*).
- **Bureau** : touches multimédia, titre et pochette dans la surcouche multimédia de Windows, icône dans la zone de notification (la croix réduit au lieu de fermer), **mini-lecteur** toujours visible, **minuterie de sommeil** avec fondu.
- **Importer une playlist YouTube** depuis son lien (collé dans la recherche ou dans *Import*), **radio** à partir d'un titre, **Afficher plus** dans les résultats.
- **Glisser-déposer** pour réorganiser une playlist et la file d'attente.
- **Historique** par jour et **statistiques** d'écoute, **Discord Rich Presence** (optionnel).
- **Import d'un export** (fusionner ou remplacer) et **sauvegardes automatiques** restaurables (*Settings › Data*).
- **0.7** : paroles (lrclib.net), clip vidéo, artistes suivis, mixes automatiques, palette Ctrl+K, outils de playlist, import Spotify CSV, thèmes (accent libre, fond clair, image), accueil personnalisable, mémoire de la fenêtre.
- Barres de défilement masquées (flèches sur les étagères), accessibilité clavier et lecteur d'écran soignée.

## Installer (Windows 10/11)

Prérequis : [Rust](https://rustup.rs) (toolchain MSVC) et WebView2 (déjà présent sur Windows 11).

```bash
cargo build --release
copy target\release\saturne.exe Saturne.exe
install.bat
```

`install.bat` copie Saturne dans `%LOCALAPPDATA%\Programs\Saturne` et crée les raccourcis (menu Démarrer et Bureau).
`uninstall.bat` le retire, sans toucher à tes données.

Sans installer : `lancer.bat` (compile au besoin puis ouvre l'application).

## Mises à jour

*Settings › Updates* vérifie la dernière release de ce dépôt (et au lancement, si l'option est activée). Quand une version plus récente existe, un bandeau **Update** apparaît dans la barre latérale :

1. Saturne télécharge `Saturne.exe` depuis la release (uniquement depuis `github.com` et `*.githubusercontent.com`).
2. Il vérifie la **taille** et l'empreinte **SHA-256** fournie par GitHub, puis que le fichier est bien un exécutable Windows. Sans empreinte, l'installation automatique est refusée.
3. Il remplace l'application (l'ancienne devient `Saturne.exe.old`, supprimée au lancement suivant) et se relance. Comptes et playlists ne sont pas touchés.

Le dépôt doit être **public** pour que les autres installations puissent lire ses releases (l'API de GitHub ne montre pas les dépôts privés sans jeton).

### Publier une nouvelle version

```bash
# 1. augmenter "version" dans Cargo.toml
cargo build --release
gh release create v0.6.0 target\release\saturne.exe#Saturne.exe install.bat uninstall.bat --title "Saturne 0.6.0" --notes "Ce qui change"
```

Le fichier de la release doit s'appeler exactement `Saturne.exe`. Les notes s'affichent dans *Settings › Updates*.

## Partager une playlist

*Share* (page d'une playlist ou menu « … ») génère un code `SATURNE1.…` à copier. L'autre personne le colle dans *Your Library › Import* et reçoit la playlist, en privé. Le code contient les titres (jusqu'à 300), pas de compte ni de lien : il fonctionne entre ordinateurs.

## Mode navigateur

```bash
Saturne.exe --serve            # http://127.0.0.1:8787
Saturne.exe --serve --port 9000
```

Les fonctions « bureau » (touches multimédia, icône de notification, mini-lecteur) n'existent que dans la fenêtre de l'application.

## Où sont mes données ?

Dans `%APPDATA%\Saturne` : `accounts.json` (comptes et sessions), `data\<utilisateur>.json` (playlists, file d'attente, historique, réglages) et `data\backups\<utilisateur>\` (les 10 dernières sauvegardes automatiques, une par heure au plus). `artists-cache.json` mémorise la liste d'artistes pendant 7 jours.
Rien ne quitte l'ordinateur, à part les recherches envoyées à YouTube et la vérification des mises à jour auprès de GitHub.

## Confidentialité des playlists

| Réglage | Qui peut la voir |
| --- | --- |
| **Private** (par défaut) | Toi seul |
| **Public** | Les autres comptes de cet ordinateur (onglet *Community*) |

Les *Bookmarks* sont toujours privés. Le serveur n'expose que les playlists marquées publiques et ne renvoie que les champs connus d'un titre.
Changer de mot de passe, d'identifiant ou supprimer le compte demande le mot de passe actuel ; les essais ratés sont limités.

## Développement

```bash
cargo test                      # tests unitaires (YouTube, playlists publiques, mises à jour)
SATURNE_WEB=web SATURNE_DATA=./data-dev cargo run -- --serve --port 8788
```

Avec `SATURNE_WEB=web`, l'interface est ré-assemblée depuis le disque à chaque chargement de page : pas besoin de recompiler pour la modifier. `SATURNE_DEBUG=1` fait écrire les messages de la page vers l'application dans `ipc.log` (test des touches multimédia).
`SATURNE_UPDATE_API` et `SATURNE_UPDATE_REPO` pointent la mise à jour vers un autre serveur (utile pour tester avec un faux GitHub).

| Fichier | Rôle |
| --- | --- |
| `src/main.rs` | Serveur (axum), routes, fenêtre native (wry/tao) |
| `src/store.rs` | Comptes, sessions, données par utilisateur |
| `src/public.rs` | Playlists publiques |
| `src/update.rs` | Mises à jour via les releases GitHub |
| `src/yt.rs` | Lecture des pages YouTube (recherche, chaînes, nouveautés) |
| `src/icon.rs`, `build.rs` | Logo dessiné par le code, icône de l'exécutable |
| `src/ytmore.rs` | Suite des résultats, playlists et radio YouTube |
| `src/native.rs` | Touches multimédia et icône de notification (Windows) |
| `src/discord.rs` | Discord Rich Presence |
| `src/bundle.rs` | Assemble l'interface à partir de `web/` (appelé par `build.rs`) |
| `web/index.html` | Squelette de la page ; `/* @css */` et `/* @js */` sont remplacés par les fichiers de `web/css/` et `web/js/` (ordre alphabétique) |
| `web/css/*.css`, `web/js/*.js` | L'interface, découpée par section |
| `LICENSE` | MIT |
| `ci/build.yml` | Workflow GitHub Actions (à déplacer dans `.github/workflows/`) |

## À savoir

- La recherche lit les pages publiques de YouTube : ce n'est pas une API officielle. Elle peut cesser de fonctionner si YouTube change son site, et YouTube peut limiter temporairement les requêtes (Saturne fait alors une pause de 3 minutes).
- Le lecteur YouTube est caché (audio seul). Les conditions de YouTube demandent normalement un lecteur visible : à toi de voir si cela te convient.
- Le serveur n'écoute que sur `127.0.0.1` et refuse les requêtes dont l'en-tête `Host` ou `Origin` ne vient pas de l'application.
- `Saturne.exe` n'est **pas signé** (une signature demande un certificat payant) : Windows SmartScreen peut afficher un avertissement au premier lancement.
- Discord Rich Presence demande l'*Application ID* d'une application que tu crées sur discord.com/developers.
- Code sous licence MIT. Les contenus musicaux appartiennent à leurs ayants droit.
