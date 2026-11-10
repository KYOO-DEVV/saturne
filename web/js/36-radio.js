/* ---------- Radio ---------- */
async function startRadio(t){
  toast(L('Starting radio…', 'Lancement de la radio…'));
  try { const j = await api('radio', {id:t.id}); S.shuffle = false; playList([t, ...j.items], 0); toast(L('Radio started: ', 'Radio lancée : ') + t.title.slice(0, 40)); }
  catch (e) { toast(errText(e)); }
}

