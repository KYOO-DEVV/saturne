/* ---------- Images : apparition en fondu et recadrage des barres noires ---------- */
const zoomMap = new Map(), zoomBusy = new Set();
function analyzeBars(url){
  return new Promise(res => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const W = 48, H = 27, c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d', {willReadFrequently:true}); x.drawImage(im, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data;
        const dark = r => { let max = 0, sum = 0; for (let i = 0; i < W; i++) { const o = (r * W + i) * 4, l = Math.max(d[o], d[o + 1], d[o + 2]); if (l > max) max = l; sum += l; } return max < 34 && sum / W < 14; };
        let top = 0, bot = 0; while (top < H / 3 && dark(top)) top++; while (bot < H / 3 && dark(H - 1 - bot)) bot++;
        const bar = Math.min(top, bot) / H;
        res(bar >= 0.06 ? Math.min(1.5, +(1 / (1 - 2 * bar)).toFixed(2)) : 1);
      } catch { res(1); }
    };
    im.onerror = () => res(1); im.src = url;
  });
}
async function fixBars(img){
  const src = img.currentSrc || img.src;
  if (!/i\.ytimg\.com\/vi\/[\w-]{11}\/(mq|hq|sd)default\.jpg/.test(src)) return;
  let z = zoomMap.get(src);
  if (z === undefined) { if (zoomBusy.has(src)) return; zoomBusy.add(src); z = await analyzeBars(src); zoomMap.set(src, z); zoomBusy.delete(src); }
  if (z > 1) document.querySelectorAll('img').forEach(i => { if ((i.currentSrc || i.src) === src) i.style.setProperty('--z', z); });
}
function settleImages(){
  document.querySelectorAll('img').forEach(i => {
    if (!i.classList.contains('loaded') && i.complete && i.naturalWidth) i.classList.add('loaded'); // déjà en cache : pas de fondu
    const z = zoomMap.get(i.currentSrc || i.src); if (z > 1) i.style.setProperty('--z', z);
  });
}
document.addEventListener('load', e => { const t = e.target; if (t && t.tagName === 'IMG') { t.classList.add('loaded'); fixBars(t); } }, true);
document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && (t.dataset.f || !t.hasAttribute('onerror'))) t.classList.add('loaded'); }, true);

