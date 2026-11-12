/* ---------- Radio ---------- */
async function startRadio(t){
  toast(L('Starting radio…', 'Lancement de la radio…'));
  try { const j = await api('radio', {id:t.id}); S.shuffle = false; playList([t, ...j.items], 0); toast(L('Radio started: ', 'Radio lancée : ') + t.title.slice(0, 40)); }
  catch (e) { toast(errText(e)); }
}

/* Lecture sans fin : quand la file se termine, on enchaîne avec la radio du dernier titre ; si YouTube ne répond pas, on recommence la file plutôt que de s'arrêter. */
let endlessBusy = false;
async function endlessNext(){
  if (endlessBusy) return; endlessBusy = true;
  const q0 = S.queue, last = q0[q0.length - 1];
  let again = false, items = null;
  if (!isSc(last)) { try { items = (await api('radio', {id:last.id})).items; } catch {} }
  endlessBusy = false;
  // Pendant l'attente, l'utilisateur a pu lancer autre chose : on ne touche pas à sa nouvelle file.
  if (S.queue !== q0 || S.pos + 1 < S.order.length) return;
  const seen = new Set(q0.map(q => q.id)), add = (items || []).filter(x => !seen.has(x.id)).slice(0, 25).map(slim);
  if (add.length) { const start = q0.length; q0.push(...add); S.order.push(...add.map((_, i) => start + i)); S.pos++; S.cur = S.order[S.pos]; }
  else if (q0.length > 1) { again = true; S.pos = 0; S.cur = S.order[0]; }
  if (S.cur >= 0 && S.queue[S.cur] && (again || S.pos > 0)) {
    loadCurrent();
    toast(again ? L('Queue ended: starting over', 'File terminée : on recommence') : L('Queue ended: playing similar songs', 'File terminée : titres similaires à la suite'));
  } else { playing = false; renderBar(); }
}

