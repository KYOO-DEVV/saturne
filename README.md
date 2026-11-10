# Saturne

Application de streaming musical pour Windows, écrite en Rust. Noir OLED, un seul accent de couleur.

- **Musique complète** via YouTube, **sans clé API** : Saturne lit les pages de résultats publiques côté serveur.
- **Lecteur invisible** : seul le son est joué, comme dans une application de musique classique.
- **Accueil J-POP** avec un hero des **sorties les plus récentes** (miniature et titre, boutons fixes).
- **Comptes** : inscription, connexion, données séparées pour chaque utilisateur (mots de passe hachés avec Argon2id).
- **Playlists privées ou publiques**, onglet *Community*, *Save to library*, et **partage par code** (*Share* / *Import*).
- **Bookmarks** jaunes avec une animation de remplissage fluide.
- **Réglages par catégories** : compte, général, lecture, apparence (couleur, coins), confidentialité, données, mises à jour, changelog, à propos.
- **Changelog repliable** (*Expand all* / *Collapse all*), page **Now playing**, menus déroulants, annulation des suppressions, infobulles, pochettes en mosaïque.
- **Mises à jour automatiques via les releases GitHub**.
- Pochette et bannière de playlist à déposer par glisser-déposer, file d'attente, genres, artistes, précédent/suivant, barre latérale repliable.

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
gh release create v0.4.0 target\release\saturne.exe#Saturne.exe install.bat uninstall.bat --title "Saturne 0.4.0" --notes "Ce qui change"
```

Le fichier de la release doit s'appeler exactement `Saturne.exe`. Les notes s'affichent dans *Settings › Updates*.

## Partager une playlist

*Share* (page d'une playlist ou menu « … ») génère un code `SATURNE1.…` à copier. L'autre personne le colle dans *Your Library › Import* et reçoit la playlist, en privé. Le code contient les titres (jusqu'à 300), pas de compte ni de lien : il fonctionne entre ordinateurs.

## Mode navigateur

```bash
Saturne.exe --serve            # http://127.0.0.1:8787
Saturne.exe --serve --port 9000
```

## Où sont mes données ?

Dans `%APPDATA%\Saturne` : `accounts.json` (comptes et sessions) et `data\<utilisateur>.json` (playlists, file d'attente, historique, réglages).
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
SATURNE_WEB=web/index.html SATURNE_DATA=./data-dev cargo run -- --serve --port 8788
```

Avec `SATURNE_WEB`, l'interface est relue depuis le disque à chaque chargement de page : pas besoin de recompiler pour la modifier.
`SATURNE_UPDATE_API` et `SATURNE_UPDATE_REPO` pointent la mise à jour vers un autre serveur (utile pour tester avec un faux GitHub).

| Fichier | Rôle |
| --- | --- |
| `src/main.rs` | Serveur (axum), routes, fenêtre native (wry/tao) |
| `src/store.rs` | Comptes, sessions, données par utilisateur |
| `src/public.rs` | Playlists publiques |
| `src/update.rs` | Mises à jour via les releases GitHub |
| `src/yt.rs` | Lecture des pages YouTube (recherche, chaînes, nouveautés) |
| `src/icon.rs`, `build.rs` | Logo dessiné par le code, icône de l'exécutable |
| `web/index.html` | Toute l'interface (HTML, CSS, JavaScript) |
| `ci/build.yml` | Workflow GitHub Actions (à déplacer dans `.github/workflows/`) |

## À savoir

- La recherche lit les pages publiques de YouTube : ce n'est pas une API officielle. Elle peut cesser de fonctionner si YouTube change son site, et YouTube peut limiter temporairement les requêtes (Saturne fait alors une pause de 3 minutes).
- Le lecteur YouTube est caché (audio seul). Les conditions de YouTube demandent normalement un lecteur visible : à toi de voir si cela te convient.
- Le serveur n'écoute que sur `127.0.0.1` et refuse les requêtes dont l'en-tête `Host` ou `Origin` ne vient pas de l'application.
- Projet personnel, utilisation privée. Les contenus appartiennent à leurs ayants droit.
