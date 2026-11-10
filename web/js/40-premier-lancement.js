/* ---------- Premier lancement ---------- */
const OB = () => [
  {t:L('Welcome to Saturne', 'Bienvenue dans Saturne'), p:L('Music from YouTube, without any key or ads, in a calm black interface.', "La musique de YouTube, sans clé ni publicité, dans une interface noire et calme."), extra:`<div class="seg" role="group" aria-label="Language"><button data-oblang="fr" class="${LANG === 'fr' ? 'on' : ''}">Français</button><button data-oblang="en" class="${LANG === 'en' ? 'on' : ''}">English</button></div>`},
  {t:L('Search, play, save', 'Cherche, écoute, garde'), p:L('Search any song or artist, press Play, and bookmark what you love. Build playlists, drag songs into them, and share them with a code.', "Cherche un titre ou un artiste, lance la lecture et mets en bookmark ce que tu aimes. Crée des playlists, glisses-y des titres et partage-les avec un code.")},
  {t:L('Make it yours', 'Rends-le à toi'), p:L('Press ? for keyboard shortcuts. Use the media keys, the mini player and the sleep timer from the bar below. Colors, language and more are in Settings.', "Appuie sur ? pour les raccourcis clavier. Touches multimédia, mini-lecteur et minuterie de sommeil sont dans la barre du bas. Couleurs, langue et le reste sont dans Réglages.")}
];
function onboardModal(step = 0){
  const s = OB()[step], last = step === OB().length - 1;
  openModal(`<div class="ob"><div class="ob-dots">${OB().map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div><h3>${s.t}</h3><p>${s.p}</p>${s.extra || ''}
    <div class="mactions"><button class="ghost" data-obskip>${L('Skip', 'Passer')}</button>${step ? `<button class="ghost" data-obback>${L('Back', 'Retour')}</button>` : ''}<button class="btn" data-obnext>${last ? L('Get started', 'Commencer') : L('Next', 'Suivant')}</button></div></div>`,
  m => {
    const finish = () => { S.settings.onboarded = true; save(); closeModal(); };
    m.querySelector('[data-obskip]').addEventListener('click', finish);
    m.querySelector('[data-obnext]').addEventListener('click', () => last ? finish() : onboardModal(step + 1));
    const b = m.querySelector('[data-obback]'); if (b) b.addEventListener('click', () => onboardModal(step - 1));
    m.querySelectorAll('[data-oblang]').forEach(x => x.addEventListener('click', () => { S.settings.lang = x.dataset.oblang; applyLang(S.settings.lang); save(); render(); onboardModal(step); }));
  });
}
function afterEnter(){
  applyNative(); setMini(false); presKey = ''; syncPresence(); S.sleep = null;
  const b = $('#bMini'); if (b) b.hidden = !NATIVE;
  if (!S.settings.onboarded && !S.history.length && S.playlists.every(p => p.system)) setTimeout(() => onboardModal(0), 600);
}

