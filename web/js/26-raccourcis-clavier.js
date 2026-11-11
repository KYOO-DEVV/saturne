/* ---------- Raccourcis clavier ---------- */
const SHORTCUTS = [['Espace', 'Lecture / pause'], ['← →', 'Reculer / avancer de 5 secondes'], ['Maj + ← →', 'Titre précédent / suivant'], ['/', 'Aller à la recherche'], ['M', 'Couper / rétablir le son'], ['B', 'Mettre le titre en cours en bookmark'], ['Q', 'Ouvrir / fermer la file d\'attente'], ['?', 'Afficher cette aide'], ['Échap', 'Fermer un menu ou une fenêtre']];
const kbdHtml = k => k.split(' ').map(x => x === '+' ? '+' : `<span class="kbd">${esc(x)}</span>`).join(' ');
const shortcutsKv = () => SHORTCUTS.map(([k, d]) => `<span>${kbdHtml(k)}</span><b>${esc(d)}</b>`).join('');
function helpModal(){ openModal(`<h3>Raccourcis clavier</h3><p>Ils fonctionnent partout dans Saturne, sauf pendant la saisie de texte.</p><p class="kv" style="margin:0">${shortcutsKv()}</p><div class="mactions"><button class="btn" data-mclose>OK</button></div>`); }
document.addEventListener('keydown', e => {
  if (!S.user || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,select') || !$('#modal').hidden) return;
  const k = e.key;
  if (k === '?') { e.preventDefault(); helpModal(); }
  else if (k === '/') { e.preventDefault(); ($('#bigQ') || $('#q')).focus(); }
  else if (k === 'm' || k === 'M') $('#volBtn').click();
  else if (k === 'q' || k === 'Q') setQueueOpen(!S.qopen);
  else if ((k === 'b' || k === 'B') && current()) toggleFav(current());
});

