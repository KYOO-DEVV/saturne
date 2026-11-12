# Le Store de Saturne : créer et publier un thème ou une App

Le Store (sous **Accueil**) propose des créations de la communauté. Il en existe trois sortes :

| | **Thème** | **Extension** | **App** |
|---|---|---|---|
| Ce que c'est | Couleurs, fond, CSS | Un thème en plus riche : options réglables, GIF/images posés sur l'interface, CSS | Un petit programme JavaScript |
| Actifs en même temps | un seul | autant que tu veux | autant que tu veux |
| Peut changer | L'apparence | L'apparence et y ajouter des images/GIF | Rien dans Saturne : il vit dans sa page |
| Fichiers | `manifest.json`, `settings.json`, `theme.css`, images | `manifest.json`, `theme.css`, images | `manifest.json`, `app.js`, `app.css`, images |
| Autorisations | Aucune | Aucune | Déclarées, validées par l'utilisateur |

Les images et les **GIF animés** sont permis partout (png, jpg, gif, webp ; 4 Mo chacune) : fond de thème, décors d'extension, images d'une App.

Tout ce que décrit ce guide est testable **sans rien publier** : « Store › Créer › Ajouter un fichier .saturne ».

---

## 1. Un paquet = un dossier

```
mon-theme/
  manifest.json     obligatoire
  settings.json     réglages (thème)
  theme.css         CSS (thème)
  fond.png          images (png, jpg, gif, webp : 4 Mo au plus chacune)
```

### `manifest.json`

```json
{
  "id": "mon-theme",
  "name": "Mon thème",
  "author": "Ton pseudo",
  "version": "1.0.0",
  "type": "theme",
  "description": "Une phrase (300 caractères au plus).",
  "tags": ["sombre", "néon"],
  "preview": ["#000000", "#ff2e93"],
  "permissions": []
}
```

- `id` : `a-z`, `0-9` et tirets, 2 à 40 caractères. C'est aussi le nom du dossier.
- `version` : `1.2.3`. Augmente-la à chaque mise à jour : les utilisateurs verront « Mettre à jour ».
- `type` : `theme` ou `app`.
- `preview` : jusqu'à 4 couleurs `#rrggbb` pour la vignette (pas besoin d'image).
- `permissions` : voir plus bas (Apps seulement).
- `icon` : une image du paquet, affichée à côté du nom (et dans la barre latérale pour une App).
- `thumb` : une image du paquet (conseillé 480×192) affichée en tête de la carte du Store. Elle est téléchargée et vérifiée comme le reste.
- `options`, `decor` : voir *Extensions*.

### Limites

40 fichiers, 8 Mo au total, 256 Ko par fichier texte, 4 Mo par image. Noms de fichiers : lettres, chiffres, `.`, `_`, `-`, trois niveaux de dossiers au plus. Pas de `..`.

---

## 2. Créer un thème

### `settings.json` : les réglages appliqués

Seules ces clés sont lues (tout le reste est ignoré) :

| Clé | Valeurs |
|---|---|
| `bg` | `"oled"`, `"dark"`, `"light"` |
| `accent` | `"violet"`, `"blue"`, `"green"`, `"pink"`, `"orange"` |
| `accentCustom` | `"#rrggbb"` ou `""` |
| `radius` | `"square"`, `"soft"`, `"round"` |
| `density` | `"comfortable"`, `"compact"` |
| `bgImage` | nom d'une image **de ton paquet** (`"fond.png"`) ou `""` |
| `bgOverlay` | 0 à 100 (voile sur l'image) |
| `bgTint` | `"bg"`, `"black"`, `"white"`, `"accent"`, `"none"` |
| `bgBlur` | 0 à 30 (px) |
| `hideLogo`, `sideThumbs`, `heroAuto`, `reduceMotion`, `lyricsVideo` | `true` / `false` |

Quand l'utilisateur applique ton thème, Saturne **sauvegarde ses réglages d'avant** ; « Retirer » ou « Désactiver » les restaure. Un seul thème est actif à la fois.

### `theme.css` : le CSS

Il est chargé après le CSS de Saturne. Pour être sûr de passer devant, commence tes sélecteurs par `html:root`.

```css
html:root .nav button.on { box-shadow: inset 0 0 0 1px var(--accent); }
html:root .bar { backdrop-filter: blur(18px); }
```

**Variables** (change-les dans `html:root[data-bg="dark"] { … }` pour un thème sombre, `[data-bg="light"]` pour un clair) :

`--bg` `--panel` `--raise` `--raise2` `--line` `--line2` `--fg` `--fg2` `--mute` `--faint` `--hi` `--accent` `--accent-hi` `--accent-soft` `--accent-glow` `--on-accent` `--font` `--r-btn` `--r-ctl` `--r-sm` `--barh` `--sw`

Le réglage de couleur d'accent est posé par Saturne directement sur la page : pour changer l'accent, utilise `accentCustom` dans `settings.json` plutôt que `--accent` dans le CSS.

**Classes stables** : `.side` (barre latérale), `.nav`, `.pli` (playlist dans la barre), `.topbar`, `main`, `.bar` (barre de lecture), `.playbtn`, `.qdrawer` (panneau latéral), `.btn`, `.ghost`, `.menu`, `.toast`. Les autres classes peuvent changer d'une version à l'autre.

### Ce que le CSS n'a pas le droit de faire

Le CSS est **filtré** à l'installation (et par la relecture) pour qu'un thème ne puisse pas contacter un serveur ni déguiser du code :

- pas de `@import`, `@charset`, `image-set(`, `src(`, `image(`, `element(`, `paint(`, `expression(`, `behavior:`, `-moz-binding`, `javascript:`
- pas d'antislash `\`, pas de `<`
- `url(...)` : seulement une **image de ton paquet** (`url(fond.png)`, chemin relatif sans `..`), une ancre `url(#id)` ou une image `data:image/png|jpeg|gif|webp` (pas de SVG)

Un thème refusé s'affiche avec la raison exacte.

---

## 3. Créer une extension (options, GIF, décors)

Une extension (`"type": "extension"`) n'exécute **aucun JavaScript** dans Saturne : elle *décrit* ce qu'elle veut, et Saturne le dessine. Elle contient `manifest.json` et, au choix, `theme.css` et/ou des `decor`.

### `options` : des réglages pour l'utilisateur

Chaque option apparaît dans **Store › Installés › Options** et devient, sur `<html>`, une variable CSS `--x-<id de la création>-<id de l'option>` et un attribut `data-x-<id>-<option>`. Les thèmes peuvent aussi avoir des options.

```json
"options": [
  { "id": "size",  "type": "range",  "label": "Taille", "min": 20, "max": 64, "step": 1, "unit": "px", "default": 36 },
  { "id": "trail", "type": "toggle", "label": "Lueur",  "default": true },
  { "id": "tint",  "type": "color",  "label": "Teinte", "default": "#ff2e93" },
  { "id": "mode",  "type": "choice", "label": "Style",  "choices": [{ "value": "a", "label": "A" }, { "value": "b", "label": "B" }], "default": "a" },
  { "id": "sprite", "type": "image", "label": "Mon image ou GIF" }
]
```

| Type | Variable CSS | Attribut |
|---|---|---|
| `range` | `36px` (valeur + `unit`) | `36` |
| `toggle` | `1` ou `0` | `1` / `0` |
| `color` | `#ff2e93` | idem |
| `choice` | la valeur choisie | idem |
| `image` | `url("…")` ou `none` : l'image que **l'utilisateur** a choisie (png, jpg, gif, webp ; 8 Mo) | l'adresse |

Dans `theme.css` : `html:root[data-x-ma-creation-trail="1"] .bar { … }` ou `width: var(--x-ma-creation-size)`. Jusqu'à 12 options.

### `decor` : des images/GIF posés sur l'interface

```json
"decor": [
  { "id": "planet", "anchor": "seekbar", "image": "run.gif", "size": "option:size", "behavior": "follow", "y": 2 },
  { "id": "mine",   "anchor": "playbtn", "image": "option:sprite", "size": 44, "behavior": "bounce", "y": -34, "when": "playing" }
]
```

| Champ | Valeurs |
|---|---|
| `anchor` | `seekbar` (barre de progression), `playbtn` (bouton lecture), `cover` (pochette de la barre), `bar` (barre de lecture), `side` (barre latérale), `corner` (coin bas-droit) |
| `image` | une image/GIF du paquet, ou `option:<id d'une option image>` (l'image de l'utilisateur ; rien n'est dessiné tant qu'il n'en a pas choisi) |
| `size` | 8 à 256 (px), ou `option:<id d'une option range>` |
| `behavior` | `none`, `follow` (suit la progression ; **seekbar** seulement), `spin`, `bounce`, `float`, `pulse` (animations en pause quand la musique est en pause) |
| `x`, `y` | décalage en px (-400 à 400). Sur `seekbar`, le décor est *posé* sur la barre |
| `opacity`, `flip`, `when` | 0 à 1 ; `true` pour retourner ; `"always"` ou `"playing"` |
| `layer` | `above` (par défaut) ou `below` |
| `valign` | `sit` (par défaut : posé sur la barre de progression) ou `center` (centré sur la barre) |

Jusqu'à 6 décors. Ils ne captent jamais la souris. Voir `store/packages/runner-bar/` : une planète animée (un PNG animé, APNG) qui avance sur la barre, plus un sprite au choix de l'utilisateur au-dessus du bouton lecture. Les **PNG animés (APNG)** et les GIF sont tous deux animés ; l'APNG garde une vraie transparence douce (pas de bords en escalier), ce que le GIF ne sait pas faire.

### Repères pour `theme.css`

Saturne pose en permanence sur `<html>` :

| Repère | Contenu |
|---|---|
| `data-view` | la page ouverte : `home`, `search`, `artists`, `library`, `playlist`, `now` (paroles), `store`, `app`… |
| `data-playing` | `1` en lecture, `0` sinon |
| `--seek-pct` | progression du titre, ex. `42.0%` |
| `--cover-img` | `url(…)` de la pochette en cours (à utiliser avec `background-image: var(--cover-img)`) |
| `--track-color` | couleur dominante de la pochette en cours |

Exemple : voir `store/packages/album-glow/` (la barre et la page prennent la couleur de la pochette).

---

## 4. Créer une App

Une App est une page : `app.js` (+ `app.css` facultatif). **Saturne fabrique la page HTML** ; ton script ajoute ce qu'il veut dans `document.body`. Les couleurs de Saturne sont déjà disponibles (`var(--bg)`, `var(--accent)`, … et la police).

```json
{
  "id": "mon-app", "name": "Mon App", "author": "Moi", "version": "1.0.0", "type": "app",
  "description": "Ce qu'elle fait.", "preview": ["#101015", "#7c3aed"],
  "permissions": ["player.read", "storage"]
}
```

```js
// app.js
document.body.innerHTML = '<h1 id="t">…</h1>';
saturne.player.current().then(t => { document.getElementById('t').textContent = t ? t.title : 'Rien en lecture'; });
saturne.on('player', s => { /* s = { track, playing, position, duration } chaque seconde */ });
```

### Permissions

L'utilisateur voit la liste et l'accepte **avant** l'installation. Un appel sans permission est refusé.

| Permission | Donne accès à |
|---|---|
| `player.read` | `saturne.player.current()`, `saturne.player.state()`, l'événement `player` |
| `player.control` | `saturne.player.play()`, `pause()`, `next()`, `prev()` |
| `queue.add` | `saturne.queue.add({ id, title, channel })` (`id` = identifiant YouTube de 11 caractères) |
| `search` | `saturne.search("texte")` : jusqu'à 20 titres `{ id, title, channel, thumb, duration }` |
| `storage` | `saturne.storage.get(clé)`, `set(clé, texte)`, `remove(clé)` : espace propre à l'App (100 Ko par valeur, clés `a-z 0-9 . _ -`) |

Toujours permis : `saturne.ui.toast("message")` et `saturne.on("theme", fn)` (les variables de couleur de Saturne, aussi appliquées automatiquement).

Toutes les méthodes renvoient une promesse.

### Ce qu'une App ne peut pas faire

Elle tourne dans une **iframe isolée** (`sandbox="allow-scripts"`, origine opaque) avec une politique de sécurité stricte :

- pas d'accès à la page de Saturne, au compte, aux cookies, aux playlists, aux fichiers ni à `localStorage`
- pas de réseau : `fetch`, `XMLHttpRequest`, WebSocket, images externes et iframes sont bloqués (`connect-src 'none'`)
- pas de navigation de la fenêtre
- elle ne tourne que lorsque sa page est ouverte
- 60 appels par seconde au plus vers Saturne

Une App malveillante reste donc limitée à son cadre ; elle peut seulement afficher du contenu trompeur, d'où la **relecture de chaque proposition**.

### Images dans une App

L'App peut contenir des images/GIF (`icon.png`, `logo.gif`…) et les utiliser : `<img src="logo.gif">` ou `background:url(logo.gif)` dans `app.css`. Ce sont les seules images permises, avec les vignettes YouTube (`https://i.ytimg.com/…`) ; le réseau reste bloqué.

### Exemple complet

Voir `store/packages/pomodoro/` (minuteur avec icône, permissions `storage` et `player.control`).

---

## 5. Tester chez toi

1. Mets ton dossier dans `store/packages/` (ou garde-le où tu veux).
2. `node store/tools/make-index.js --check` : vérifie le paquet avec les mêmes règles que Saturne.
3. Dans Saturne : **Store › Créer › Exporter mon thème** produit un fichier `.saturne` à partir de tes réglages actuels ; **Ajouter un fichier .saturne** installe un fichier reçu. Pour un paquet écrit à la main, transforme-le en `.saturne` : un fichier JSON `{ "format": "saturne-package", "files": { "manifest.json": "…", "theme.css": "…" } }` (les fichiers texte uniquement ; les images passent par le dépôt).
4. En cas de problème : **Store › Créer › Mode sans mods**, ou le bouton « Redémarrer sans mods » de l'écran de secours. Rien n'est supprimé.

Un fichier `.saturne` exporté se transforme en dossier avec `node store/tools/unpack.js mon-theme.saturne`.

---

## 6. Publier dans le catalogue

Le catalogue est le dépôt public **`KYOO-DEVV/saturne-store`** (voir `store/README.md`) :

1. Fais un *fork* du dépôt et ajoute ton dossier dans `packages/<id>/`.
2. Lance `node tools/make-index.js` : il vérifie ton paquet et met à jour `index.json` (somme de contrôle de chaque fichier).
3. Ouvre une *pull request*. Elle est relue (CSS, JavaScript, permissions demandées) avant d'être fusionnée : **rien n'apparaît dans le Store sans relecture**.
4. Pour une mise à jour : même chose, avec une `version` plus grande.

Saturne télécharge chaque fichier depuis le dépôt et **vérifie sa taille et sa somme sha256** avant d'installer ; si un fichier ne correspond pas à l'index, ou si le manifest du paquet diffère de celui de l'index (autorisations comprises), l'installation est refusée.

> Les créations du Store sont faites par des tiers ; Saturne n'en est pas responsable. N'installe des Apps que de personnes de confiance.
