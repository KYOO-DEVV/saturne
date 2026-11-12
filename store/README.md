# saturne-store

Le catalogue du [Store de Saturne](https://github.com/KYOO-DEVV/saturne) : thèmes et Apps de la communauté.

```
index.json          liste des créations + somme sha256 de chaque fichier (générée, ne pas modifier à la main)
packages/<id>/      un dossier par création
tools/make-index.js vérifie les paquets et génère index.json
tools/unpack.js     transforme un fichier .saturne exporté en dossier de paquet
sdk.js              le SDK injecté dans les Apps (référence ; Saturne a sa propre copie)
```

Le guide complet pour créer et publier est dans [STORE.md](../STORE.md) du dépôt de l'application.

## Proposer une création

1. *Fork*, puis ajoute `packages/<id>/` (voir `packages/neon-oled` pour un thème, `packages/pomodoro` pour une App).
2. `node tools/make-index.js` : vérifie et met à jour `index.json`.
3. Pull request.

## Relecture (checklist)

- [ ] `node tools/make-index.js --check` passe.
- [ ] Le nom, l'auteur et la description sont honnêtes (pas d'usurpation d'une autre création ou d'une personne).
- [ ] Thème : le CSS ne fait que de l'apparence (le filtre automatique refuse les adresses externes, mais lire le CSS reste nécessaire : contenu trompeur, texte caché…).
- [ ] App : le JavaScript est lisible (pas d'obfuscation) ; chaque permission demandée est justifiée par ce que fait l'App.
- [ ] Les images sont celles de l'auteur, ou libres de droits.
- [ ] Mise à jour : la `version` a augmenté et le changement correspond à la description de la PR.

## Format

`index.json` :

```json
{ "version": 1, "items": [
  { "id": "mon-theme", "name": "…", "author": "…", "type": "theme", "version": "1.0.0", "description": "…",
    "tags": [], "preview": ["#000000", "#ff2e93"], "permissions": [],
    "files": [ { "path": "manifest.json", "size": 210, "sha256": "…" } ] }
] }
```

Saturne vérifie la taille et le sha256 de chaque fichier téléchargé, puis que le `manifest.json` du paquet correspond à l'entrée de l'index.
