/* ---------- Démarrage ---------- */
applyTheme(); applyLang(detectLang());
native('hello'); native('media:on'); // les touches multimédia marchent dès l'écran de connexion ; le réglage du compte reprend la main après connexion
(async function boot(){
  try {
    const j = await http('/api/me');
    if (j.user) return enter(j.user);
    showAuth();
  } catch (e) { showAuth(errText(e)); }
})();
