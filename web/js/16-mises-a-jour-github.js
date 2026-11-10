/* ---------- Mises à jour (GitHub) ---------- */
async function checkUpdate(silent){
  if (S.update.checking) return;
  S.update.checking = true; S.update.error = ''; if (S.view.type === 'settings') renderView();
  try { S.update.info = await http('/api/update/check'); if (!silent && !S.update.info.available) toast('Saturne est à jour'); }
  catch (e) { S.update.error = e.message; if (!silent) toast(e.message); }
  S.update.checking = false; renderUpdateBanner(); if (S.view.type === 'settings') renderView();
}
function renderUpdateBanner(){
  const b = $('#updBanner'), i = S.update.info;
  if (i && i.available) { b.hidden = false; b.innerHTML = `<span><b>Saturne ${esc(i.latest)}</b>disponible</span><button class="btn" data-act="installupdate">Update</button>`; }
  else { b.hidden = true; b.innerHTML = ''; }
}
$('#updBanner').addEventListener('click', e => { if (e.target.closest('[data-act="installupdate"]')) installUpdate(); });
async function installUpdate(){
  const i = S.update.info; if (!i || !i.available || S.update.installing) return;
  if (!i.canInstall) {
    const link = /^https:\/\/github\.com\//.test(i.url || '') ? `<a href="${esc(i.url)}" target="_blank" rel="noopener" style="color:var(--accent-hi)">Ouvrir la page de la release</a>` : '';
    return openModal(`<h3>Installation manuelle</h3><p>La release ${esc(i.latest)} n'a pas d'empreinte de sécurité (SHA-256) : Saturne refuse de l'installer automatiquement. Télécharge-la depuis GitHub.</p><p>${link}</p><div class="mactions"><button class="btn" data-mclose>OK</button></div>`);
  }
  S.update.installing = true;
  openModal(`<h3>Mise à jour vers ${esc(i.latest)}</h3><p id="upMsg">Téléchargement et vérification…</p>`);
  try { await send('/api/update/install', {}); $('#upMsg').textContent = 'Saturne redémarre…'; await waitForRestart(); }
  catch (e) { S.update.installing = false; closeModal(); toast(e.message); }
}
async function waitForRestart(){
  let down = false;
  for (let n = 0; n < 75; n++) {
    await new Promise(r => setTimeout(r, 800));
    try { await fetch('/api/me'); if (down || n > 8) return location.reload(); } catch { down = true; }
  }
  location.reload();
}
function exportData(){
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(payload(), null, 2)], {type:'application/json'})); a.download = 'saturne-data.json';
    document.body.appendChild(a); a.click(); a.remove(); toast('Export lancé');
  } catch (e) { toast('Export impossible : ' + e.message); }
}

