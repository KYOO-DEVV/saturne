/* ---------- Mini-lecteur ---------- */
function setMini(on){
  S.mini = !!on; $('#app').classList.toggle('mini', S.mini); native(S.mini ? 'mini:on' : 'mini:off');
  const b = $('#bMini'); if (b) { b.setAttribute('aria-pressed', S.mini); b.title = S.mini ? L('Back to the full window', 'Revenir à la fenêtre complète') : L('Mini player', 'Mini-lecteur'); b.setAttribute('aria-label', b.title); }
}

