#!/usr/bin/env node
/* Vérifie les paquets de packages/ et (re)génère index.json.
   Usage :  node tools/make-index.js          → écrit index.json
            node tools/make-index.js --check  → vérifie seulement (pour la relecture d'une pull request)
   Les règles sont les mêmes que celles de Saturne (src/modstore.rs) : un paquet refusé ici serait refusé à l'installation. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), pk = path.join(root, 'packages'), check = process.argv.includes('--check');
const MAX_FILES = 40, MAX_TEXT = 256 * 1024, MAX_IMAGE = 4 * 1024 * 1024, MAX_TOTAL = 8 * 1024 * 1024;
const PERMS = ['player.read', 'player.control', 'queue.add', 'search', 'storage'];
const ext = p => path.extname(p).slice(1).toLowerCase(), isImg = e => ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e);
const validId = id => /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/.test(id);
const validPath = p => !!p && p.length <= 80 && !p.startsWith('/') && p.split('/').length <= 3 && p.split('/').every(s => /^[A-Za-z0-9._-]+$/.test(s) && s !== '.' && s !== '..');

function cssProblem(css) {
  if (css.length > MAX_TEXT) return 'CSS trop volumineux';
  if (css.includes('\\')) return 'antislash non autorisé';
  const l = css.replace(/\/\*[\s\S]*?(\*\/|$)/g, '').toLowerCase();
  for (const bad of ['@import', 'expression(', 'javascript:', 'vbscript:', 'behavior:', '-moz-binding', '<', 'image-set(', 'src(', 'image(', 'element(', 'paint(', '@charset']) if (l.includes(bad)) return `« ${bad} » non autorisé`;
  let rest = l, i;
  while ((i = rest.indexOf('url(')) >= 0) {
    const after = rest.slice(i + 4), end = after.indexOf(')'); if (end < 0) return 'url( non fermé';
    const arg = after.slice(0, end).trim().replace(/^["']+|["']+$/g, '').trim();
    const ok = arg.startsWith('data:image/') ? /^data:image\/(png|jpe?g|gif|webp);/.test(arg) : (arg.startsWith('#') || (arg !== '' && !arg.includes(':') && !arg.startsWith('/') && !arg.includes('..') && !arg.includes('//')));
    if (!ok) return 'adresse externe dans url(…) : seules les images du paquet sont permises';
    rest = after.slice(end + 1);
  }
  return '';
}
function magicOk(b) {
  return b.slice(0, 6).toString() === 'GIF87a' || b.slice(0, 6).toString() === 'GIF89a' || b.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) || (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP');
}
function manifestProblem(m, dirName) {
  const s = (k, a, b) => typeof m[k] === 'string' && [...m[k].trim()].length >= a && [...m[k].trim()].length <= b && !/[\u0000-\u001f]/.test(m[k]);
  if (!s('id', 2, 40) || !validId(m.id)) return 'id invalide (a-z, 0-9, tirets)';
  if (m.id !== dirName) return 'id différent du nom du dossier';
  if (!s('name', 1, 60) || !s('author', 1, 40)) return 'name/author invalides';
  if (m.description !== undefined && (typeof m.description !== 'string' || [...m.description].length > 300)) return 'description trop longue (300 caractères)';
  if (!/^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(m.version || '')) return 'version attendue : 1.2.3';
  if (!['theme', 'extension', 'app'].includes(m.type)) return 'type : theme, extension ou app';
  for (const p of m.permissions || []) if (!PERMS.includes(p)) return `permission inconnue : ${p}`;
  if (m.type !== 'app' && (m.permissions || []).length) return 'seule une App demande des permissions';
  if (m.preview !== undefined && !(Array.isArray(m.preview) && m.preview.length <= 4 && m.preview.every(c => /^#[0-9a-fA-F]{6}$/.test(c)))) return 'preview : jusqu’à 4 couleurs #rrggbb';
  return extrasProblem(m);
}
/* Champs riches : icon, thumb, options, decor (mêmes règles que src/modstore.rs). */
const ident = (s, n) => typeof s === 'string' && s.length > 0 && s.length <= n && /^[a-z][a-z0-9-]*$/.test(s);
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const imagePath = p => typeof p === 'string' && validPath(p) && isImg(ext(p));
const ANCHORS = ['seekbar', 'playbtn', 'cover', 'bar', 'side', 'corner'], BEHAVIORS = ['none', 'follow', 'spin', 'bounce', 'float', 'pulse'];
function extrasProblem(m) {
  for (const k of ['icon', 'thumb']) if (m[k] !== undefined && !imagePath(m[k])) return `« ${k} » : nom d’une image du paquet`;
  const opts = [];
  if (m.options !== undefined) {
    if (!Array.isArray(m.options) || m.options.length > 12 || (m.type === 'app' && m.options.length)) return '« options » : 12 au plus, réservées aux thèmes et extensions';
    for (const o of m.options) {
      if (!ident(o.id, 20) || opts.some(x => x.id === o.id)) return `option « ${o.id} » : identifiant invalide ou en double`;
      if (typeof o.label !== 'string' || !o.label || [...o.label].length > 40) return `option « ${o.id} » : libellé de 1 à 40 caractères`;
      const d = o.default; let ok = false;
      if (o.type === 'toggle') ok = typeof d === 'boolean';
      else if (o.type === 'range') ok = num(o.min, -10000, 10000) && num(o.max, -10000, 10000) && num(o.step, 0.001, 10000) && o.min < o.max && num(d, o.min, o.max) && (o.unit === undefined || ['', 'px', '%', 's', 'ms', 'deg', 'em'].includes(o.unit));
      else if (o.type === 'color') ok = /^#[0-9a-fA-F]{6}$/.test(d);
      else if (o.type === 'choice') ok = Array.isArray(o.choices) && o.choices.length >= 2 && o.choices.length <= 8 && o.choices.every(c => ident(c.value, 20) && typeof c.label === 'string' && c.label && [...c.label].length <= 40) && o.choices.some(c => c.value === d);
      else if (o.type === 'image') ok = d === undefined || d === null || d === '';
      if (!ok) return `option « ${o.id} » : type ou valeurs invalides`;
      opts.push({id: o.id, type: o.type});
    }
  }
  if (m.decor !== undefined) {
    if (!Array.isArray(m.decor) || m.decor.length > 6 || (m.type === 'app' && m.decor.length)) return '« decor » : 6 au plus, réservé aux thèmes et extensions';
    const opt = (s, want) => typeof s === 'string' && s.startsWith('option:') && opts.some(x => x.id === s.slice(7) && x.type === want);
    for (const d of m.decor) {
      if (!ANCHORS.includes(d.anchor)) return `décor : ancre inconnue « ${d.anchor} »`;
      if (!(imagePath(d.image) || opt(d.image, 'image'))) return 'décor : « image » = une image du paquet ou option:<option image>';
      if (!(d.size === undefined || num(d.size, 8, 256) || opt(d.size, 'range'))) return 'décor : « size » = 8 à 256, ou option:<option range>';
      const b = d.behavior === undefined ? 'none' : d.behavior;
      if (!BEHAVIORS.includes(b) || (b === 'follow' && d.anchor !== 'seekbar')) return 'décor : comportement inconnu (« follow » seulement sur seekbar)';
      for (const k of ['x', 'y']) if (d[k] !== undefined && !num(d[k], -400, 400)) return `décor : « ${k} » entre -400 et 400`;
      if ((d.opacity !== undefined && !num(d.opacity, 0, 1)) || (d.when !== undefined && !['always', 'playing'].includes(d.when)) || (d.layer !== undefined && !['above', 'below'].includes(d.layer)) || (d.flip !== undefined && typeof d.flip !== 'boolean')) return 'décor : opacity, when, layer ou flip invalide';
    }
  }
  return '';
}
function walk(dir, base = '') {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), base + e.name + '/') : [base + e.name]);
}

const items = [], errors = [];
for (const id of fs.readdirSync(pk).sort()) {
  const dir = path.join(pk, id); if (!fs.statSync(dir).isDirectory()) continue;
  const fail = msg => errors.push(`${id}: ${msg}`);
  const files = walk(dir); let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); } catch (e) { fail('manifest.json illisible (' + e.message + ')'); continue; }
  const mp = manifestProblem(manifest, id); if (mp) { fail(mp); continue; }
  if (files.length > MAX_FILES) fail('trop de fichiers');
  let total = 0; const list = [];
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f)), e = ext(f); total += buf.length;
    if (!validPath(f)) { fail('nom de fichier refusé : ' + f); continue; }
    const okExt = f === 'manifest.json' || (manifest.type !== 'app' ? ['css', 'json', 'woff2'].includes(e) || isImg(e) : ['css', 'js', 'json'].includes(e) || isImg(e));
    if (!okExt) { fail('type de fichier non autorisé : ' + f); continue; }
    if (buf.length > (isImg(e) || e === 'woff2' ? MAX_IMAGE : MAX_TEXT)) fail('fichier trop volumineux : ' + f);
    if (e === 'css') { const p = cssProblem(buf.toString('utf8')); if (p) fail(`${f} : ${p}`); }
    if (e === 'json') { try { const v = JSON.parse(buf.toString('utf8')); if (f === 'settings.json' && (typeof v !== 'object' || Array.isArray(v) || !v)) fail('settings.json doit être un objet'); } catch (er) { fail(`${f} illisible`); } }
    if (isImg(e) && !magicOk(buf)) fail(`${f} n’est pas une image valide`);
    list.push({path: f, size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex')});
  }
  if (total > MAX_TOTAL) fail('paquet trop volumineux (8 Mo)');
  if (manifest.type === 'theme' && !files.includes('theme.css') && !files.includes('settings.json')) fail('un thème contient theme.css et/ou settings.json');
  if (manifest.type === 'app' && !files.includes('app.js')) fail('une App contient app.js');
  if (manifest.type === 'extension' && !files.includes('theme.css') && !(manifest.decor || []).length) fail('une extension contient theme.css et/ou des décors');
  for (const r of [manifest.icon, manifest.thumb, ...(manifest.decor || []).map(d => d.image)].filter(x => x && !String(x).startsWith('option:'))) if (!files.includes(r)) fail(`le manifest cite ${r}, absent du paquet`);
  items.push({id: manifest.id, name: manifest.name, author: manifest.author, type: manifest.type, version: manifest.version, description: manifest.description || '', tags: manifest.tags || [], preview: manifest.preview || [], permissions: manifest.permissions || [], icon: manifest.icon || null, thumb: manifest.thumb || null, files: list});
}
if (errors.length) { console.error('Paquets refusés :\n - ' + errors.join('\n - ')); process.exit(1); }
if (!check) { fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({version: 1, items}, null, 2) + '\n'); }
console.log(`${items.length} paquet(s) valide(s)${check ? '' : ' : index.json écrit'}`);
