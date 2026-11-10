/* ---------- Glisser pour réorganiser (playlist et file d'attente) ---------- */
let dragPos = null;
const clearDrop = () => document.querySelectorAll('.dr-before,.dr-after').forEach(x => x.classList.remove('dr-before', 'dr-after'));
document.addEventListener('dragstart', e => {
  if (!e.dataTransfer || !e.target.closest) return;
  const q = e.target.closest('.nq'), li = e.target.closest('[data-src="pl"] > [data-i]');
  if (q) dragPos = {kind:'q', i:+q.dataset.qi, over:null};
  else if (li && S.view.type === 'playlist') dragPos = {kind:'pl', i:+li.dataset.i, over:null};
  else return;
  e.dataTransfer.effectAllowed = 'copyMove';
});
document.addEventListener('dragover', e => {
  if (!dragPos) return;
  const el = e.target.closest(dragPos.kind === 'q' ? '.nq' : '[data-src="pl"] > [data-i]');
  clearDrop();
  if (el) {
    const r = el.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
    el.classList.add(after ? 'dr-after' : 'dr-before'); dragPos.over = {el, after};
  } else if (dragPos.kind === 'q' && e.target.closest('#qdrawer')) dragPos.over = {el:null};
  else { dragPos.over = null; return; }
  e.preventDefault(); e.stopImmediatePropagation(); e.dataTransfer.dropEffect = 'move';
}, true);
document.addEventListener('drop', e => {
  if (!dragPos || !dragPos.over) return;
  const {kind, i, over} = dragPos; e.preventDefault(); e.stopImmediatePropagation();
  let j = over.el ? +(kind === 'q' ? over.el.dataset.qi : over.el.dataset.i) : S.queue.length;
  if (over.el && over.after) j++;
  clearDrop(); dragPos = null; moveItem(kind, i, j);
}, true);
document.addEventListener('dragend', () => { dragPos = null; clearDrop(); });
function moveItem(kind, from, to){
  const list = kind === 'q' ? S.queue : (curPl() || {}).tracks; if (!list) return;
  if (to > from) to--; if (to === from || from < 0 || from >= list.length) return;
  if (kind === 'q') {
    const idx = list.map((_, k) => k), [m] = idx.splice(from, 1); idx.splice(to, 0, m);
    const map = []; idx.forEach((old, nw) => map[old] = nw);
    const [x] = list.splice(from, 1); list.splice(to, 0, x);
    if (S.cur >= 0) S.cur = map[S.cur];
    S.order = S.order.map(k => map[k]);
    save(); renderBar();
  } else { const [x] = list.splice(from, 1); list.splice(to, 0, x); save(); renderView(); }
}

