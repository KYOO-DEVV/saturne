/* ---------- 0.8.0 : pas de sélection de texte, pas d'images à glisser dehors ---------- */
const editable = n => { const el = n && (n.nodeType === 3 ? n.parentElement : n); return !!(el && el.closest && el.closest('input,textarea,[contenteditable="true"],.selectable')); };
document.addEventListener('selectstart', e => { if (!editable(e.target)) e.preventDefault(); });
document.addEventListener('dragstart', e => { const t = e.target; if (t && t.nodeType === 1 && (t.tagName === 'IMG' || t.tagName === 'A' || t.tagName === 'svg')) e.preventDefault(); });
document.addEventListener('mousedown', e => { if (e.detail > 1 && !editable(e.target)) e.preventDefault(); }); // double et triple clic : pas de surbrillance
