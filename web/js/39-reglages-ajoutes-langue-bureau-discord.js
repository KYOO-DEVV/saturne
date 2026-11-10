/* ---------- Réglages ajoutés : langue, bureau, Discord ---------- */
const langRow = () => setRow(L('Language', 'Langue'), L('Language of the interface.', "Langue de l'interface."), dd('lang', L('Language', 'Langue')));
const desktopRows = () => (NATIVE ? `<h4>${L('Desktop', 'Bureau')}</h4>` +
  setRow(L('Media keys', 'Touches multimédia'), L("Use your keyboard's play/pause, next and previous keys, even when Saturne isn't in the foreground.", "Utilise les touches lecture/pause, suivant et précédent de ton clavier, même quand Saturne n'est pas au premier plan."), swc('mediaKeys', S.settings.mediaKeys, L('Media keys', 'Touches multimédia'))) +
  setRow(L('Notification area icon', 'Icône dans la zone de notification'), L("The window's close button minimizes Saturne to the notification area instead of quitting: music keeps playing.", 'La croix de la fenêtre réduit Saturne dans la zone de notification au lieu de le fermer : la musique continue.'), swc('tray', S.settings.tray, L('Notification area icon', 'Icône dans la zone de notification'))) : '') +
  `<h4>Discord</h4>` + setRow(L('Show on Discord', 'Afficher sur Discord'), L('Shows the current song on your Discord profile (Rich Presence). Create an application at discord.com/developers and paste its Application ID.', "Affiche le titre en cours sur ton profil Discord (Rich Presence). Crée une application sur discord.com/developers et colle son Application ID."), swc('discord', S.settings.discord, L('Show on Discord', 'Afficher sur Discord'))) +
  (S.settings.discord ? setRow(L('Application ID', "Identifiant d'application"), L('The long number shown on your application’s page.', "Le long nombre affiché sur la page de ton application."), `<input class="input" id="discordId" value="${esc(S.settings.discordId || '')}" placeholder="123456789012345678" inputmode="numeric" maxlength="22" style="width:230px" aria-label="Application ID">`) : '');
$('#view').addEventListener('change', e => {
  if (e.target.id === 'discordId') { S.settings.discordId = e.target.value.replace(/\D/g, '').slice(0, 22); presKey = ''; save(); syncPresence(); }
});

