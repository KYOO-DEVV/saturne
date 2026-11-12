#!/usr/bin/env node
/* Transforme un fichier .saturne (exporté depuis Saturne) en dossier de paquet prêt à proposer.
   Usage :  node tools/unpack.js mon-theme.saturne   → crée packages/<id>/ */
const fs = require('fs'), path = require('path');
const file = process.argv[2]; if (!file) { console.error('Usage : node tools/unpack.js fichier.saturne'); process.exit(1); }
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
if (pkg.format !== 'saturne-package' || typeof pkg.files !== 'object') { console.error('Ce n’est pas un fichier .saturne'); process.exit(1); }
const manifest = JSON.parse(pkg.files['manifest.json']);
const dir = path.join(__dirname, '..', 'packages', manifest.id);
fs.mkdirSync(dir, {recursive: true});
for (const [name, text] of Object.entries(pkg.files)) {
  if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(name) || name.includes('..')) { console.error('Nom refusé : ' + name); process.exit(1); }
  fs.mkdirSync(path.dirname(path.join(dir, name)), {recursive: true}); fs.writeFileSync(path.join(dir, name), text);
}
console.log('Paquet créé : packages/' + manifest.id + '\nVérifie-le avec : node tools/make-index.js --check');
