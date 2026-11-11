/* ---------- Démarrage ---------- */
applyTheme(); applyLang(detectLang());
window.__booted = true; // le script principal a démarré : le filet de sécurité (index.html) ne s’affichera pas
native('hello'); native('media:on'); // les touches multimédia marchent dès l'écran de connexion ; le réglage du compte reprend la main après connexion
(async function boot(){
  try {
    const j = await http('/api/me');
    if (j.user) return enter(j.user);
    showAuth();
  } catch (e) { showAuth(errText(e)); }
})();
