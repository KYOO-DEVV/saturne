/* ---------- Connexion / compte ---------- */
let authMode = 'in';
function setAuthMode(m){
  authMode = m; $('#tabIn').classList.toggle('on', m === 'in'); $('#tabUp').classList.toggle('on', m === 'up');
  $('#fDisplay').hidden = m !== 'up'; $('#authSubmit').textContent = m === 'in' ? 'Se connecter' : 'Créer mon compte';
  $('#authTitle').textContent = m === 'in' ? 'Bon retour' : 'Bienvenue';
  $('#authLead').textContent = m === 'in' ? 'Connecte-toi pour retrouver tes playlists.' : 'Crée un compte pour garder tes playlists et ta musique.';
  $('#aPass').autocomplete = m === 'in' ? 'current-password' : 'new-password'; $('#authErr').textContent = '';
}
function showAuth(msg){
  $('#app').hidden = true; $('#auth').hidden = false; $('#authErr').textContent = msg || '';
  try { player && player.pauseVideo && player.pauseVideo(); } catch {}
  setTimeout(() => $('#aUser').focus(), 50);
}
$('#tabIn').addEventListener('click', () => setAuthMode('in'));
$('#tabUp').addEventListener('click', () => setAuthMode('up'));
$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#authSubmit'); btn.disabled = true; $('#authErr').textContent = '';
  try {
    const body = {username:$('#aUser').value.trim(), password:$('#aPass').value};
    if (authMode === 'up') body.display = $('#aDisplay').value.trim();
    const j = await send(authMode === 'in' ? '/api/auth/login' : '/api/auth/register', body);
    $('#aPass').value = ''; await enter(j.user);
  } catch (err) { $('#authErr').textContent = err.message; }
  btn.disabled = false;
});
async function enter(user){
  S.user = user;
  let d = {}; try { d = await http('/api/data'); } catch {}
  applyData(d); S.view = {type:'home'}; S.hist = [{type:'home'}]; S.hpos = 0; S.qopen = false;
  S.home = {main:{tracks:[], loading:false, error:''}, fresh:{tracks:[], loading:false, error:''}, shelves:{}};
  S.community = {items:[], loading:false, error:'', loaded:false};
  $('#auth').hidden = true; $('#app').hidden = false;
  vol.value = S.volume; fill(vol); rebuildOrder(); render(); loadHome(); loadYT(); afterEnter(); loadMods();
  S.update = {checking:false, info:null, error:'', installing:false}; renderUpdateBanner(); setTimeout(announceVersion, 2500); if (S.settings.autoUpdate) setTimeout(() => checkUpdate(true), 4000);
}
async function logout(){ try { await send('/api/auth/logout', {}); } catch {} location.reload(); }

