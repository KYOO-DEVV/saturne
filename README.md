# Saturne

Application de streaming musical pour Windows, écrite en Rust. Noir OLED, un seul accent violet.

- **Musique complète** via YouTube, **sans clé API** : Saturne lit les pages de résultats publiques côté serveur.
- **Lecteur invisible** : seul le son est joué, comme dans une application de musique classique.
- **Accueil J-POP** avec un hero des **sorties les plus récentes** (miniature et titre).
- **Comptes** : inscription, connexion, données séparées pour chaque utilisateur (mots de passe hachés avec Argon2id).
- **Playlists privées ou publiques**, onglet *Community* pour écouter celles des autres comptes de l'ordinateur, bouton *Save to library*.
- **Bookmarks** avec une animation de remplissage fluide.
- Pochette et bannière de playlist à déposer par glisser-déposer, file d'attente, genres, artistes, précédent/suivant.

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
Intégration continue : `ci/build.yml` compile et teste l'application sur Windows et publie l'exécutable. Pour l'activer, déplace-le dans `.github/workflows/` (GitHub exige une autorisation `workflow` pour pousser ce dossier : `gh auth refresh -s workflow`). Un tag `v*` crée alors une *Release* avec `Saturne.exe`.

## Mode navigateur

```bash
Saturne.exe --serve            # http://127.0.0.1:8787
Saturne.exe --serve --port 9000
```

## Où sont mes données ?

Dans `%APPDATA%\Saturne` : `accounts.json` (comptes et sessions) et `data\<utilisateur>.json` (playlists, file d'attente, historique).
Rien ne quitte l'ordinateur, à part les recherches envoyées à YouTube.

## Confidentialité des playlists

| Réglage | Qui peut la voir |
| --- | --- |
| **Private** (par défaut) | Toi seul |
| **Public** | Les autres comptes de cet ordinateur (onglet *Community*) |

Les *Bookmarks* sont toujours privés. Le serveur n'expose que les playlists marquées publiques et ne renvoie que les champs connus d'un titre.

## Développement

```bash
cargo test                      # tests unitaires (analyse YouTube, playlists publiques)
SATURNE_WEB=web/index.html SATURNE_DATA=./data-dev cargo run -- --serve --port 8788
```

Avec `SATURNE_WEB`, l'interface est relue depuis le disque à chaque chargement de page : pas besoin de recompiler pour la modifier.

| Fichier | Rôle |
| --- | --- |
| `src/main.rs` | Serveur (axum), routes, fenêtre native (wry/tao) |
| `src/store.rs` | Comptes, sessions, données par utilisateur |
| `src/public.rs` | Playlists publiques |
| `src/yt.rs` | Lecture des pages YouTube (recherche, chaînes, nouveautés) |
| `src/icon.rs`, `build.rs` | Logo dessiné par le code, icône de l'exécutable |
| `web/index.html` | Toute l'interface (HTML, CSS, JavaScript) |

## À savoir

- La recherche lit les pages publiques de YouTube : ce n'est pas une API officielle. Elle peut cesser de fonctionner si YouTube change son site, et YouTube peut limiter temporairement les requêtes (Saturne fait alors une pause de 3 minutes).
- Le serveur n'écoute que sur `127.0.0.1` et refuse les requêtes dont l'en-tête `Host` ou `Origin` ne vient pas de l'application.
- Projet personnel, utilisation privée. Les contenus appartiennent à leurs ayants droit.
