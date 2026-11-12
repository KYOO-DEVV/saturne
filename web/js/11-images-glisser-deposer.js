/* ---------- Images (glisser-déposer) ---------- */
function toDataURL(src, w, maxH, square){
  return new Promise((res, rej) => {
    const img = new Image(); if (typeof src === 'string' && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight, dh;
        if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; dh = w; }
        else { dh = Math.round(w * sh / sw); if (dh > maxH) { const cut = sh - sw * maxH / w; sy = cut / 2; sh -= cut; dh = maxH; } }
        c.width = w; c.height = dh; c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, w, dh);
        res(c.toDataURL('image/jpeg', .85));
      } catch (e) { rej(e); }
    };
    img.onerror = () => rej(new Error('image'));
    img.src = src;
  });
}
async function setImage(p, kind, src){
  const isFile = src instanceof Blob, url = isFile ? URL.createObjectURL(src) : src;
  let data;
  if (isFile && isGif(src) && src.size <= GIF_MAX) { try { data = await storeGif(src); } catch { URL.revokeObjectURL(url); return toast(L('Could not read this image', 'Impossible de lire cette image')); } URL.revokeObjectURL(url); p[kind] = data; if (kind === 'banner') p.bannerY = 50; save(); render(); return toast(L('GIF kept animated', 'GIF conservé animé')); }
  try { data = kind === 'cover' ? await toDataURL(url, 360, 360, true) : await toDataURL(url, 1280, 720, false); }
  catch { if (isFile) { toast('Impossible de lire cette image'); return; } data = src; }
  finally { if (isFile) URL.revokeObjectURL(url); }
  p[kind] = data; if (kind === 'banner') p.bannerY = 50;
  save(); render(); toast(kind === 'cover' ? 'Image de la playlist mise à jour' : 'Bannière mise à jour');
}
let pickKind = 'cover';
function pickImage(kind){ pickKind = kind; $('#filePick').value = ''; $('#filePick').click(); }
$('#filePick').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  if (pickKind === 'avatar') { await uploadAvatar(f); return; }
  if (pickKind === 'pbanner') { await setProfileBanner(f); return; }
  const p = curPl(); if (p) setImage(p, pickKind, f);
});
function dropSource(dt){
  const f = [...dt.files].find(x => x.type.startsWith('image/')); if (f) return f;
  const u = (dt.getData('text/uri-list') || '').split('\n').find(x => x && !x.startsWith('#'));
  if (u && /^https?:|^data:image/.test(u)) return u.trim();
  const m = /<img[^>]+src="([^"]+)"/i.exec(dt.getData('text/html') || ''); return m ? m[1] : null;
}
const isTrackDrag = e => e.dataTransfer && [...e.dataTransfer.types].includes('application/x-saturne');
const hasImageDrag = e => e.dataTransfer && [...e.dataTransfer.types].some(t => t === 'Files' || t === 'text/uri-list' || t === 'text/html');
const clearOver = () => document.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
document.addEventListener('dragover', e => {
  const t = e.target.closest('[data-drop],[data-pl],[data-dropq]');
  const ok = t && (t.dataset.drop ? !isTrackDrag(e) && hasImageDrag(e) : isTrackDrag(e));
  if (ok) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!t.classList.contains('over')) { clearOver(); t.classList.add('over'); } }
  else { clearOver(); if (hasImageDrag(e) && !isTrackDrag(e)) e.preventDefault(); }
});
document.addEventListener('dragleave', e => { if (!e.relatedTarget) clearOver(); });
document.addEventListener('dragend', clearOver);
document.addEventListener('drop', e => {
  const t = e.target.closest('[data-drop],[data-pl],[data-dropq]'); clearOver();
  if (isTrackDrag(e)) {
    if (!t) return; e.preventDefault();
    let tr; try { tr = JSON.parse(e.dataTransfer.getData('application/x-saturne')); } catch { return; }
    if (t.dataset.pl) { const p = S.playlists.find(x => x.id === t.dataset.pl); if (p) addToPlaylist(p, tr); }
    else if (t.dataset.dropq === '1') addToQueue(tr);
    return;
  }
  if (hasImageDrag(e)) {
    e.preventDefault();
    if (t && t.dataset.drop === 'avatar') { const f = dropSource(e.dataTransfer); if (f instanceof Blob) uploadAvatar(f); else toast('Dépose un fichier image'); return; }
    const p = curPl(); if (!p || !t || !t.dataset.drop) return;
    const src = dropSource(e.dataTransfer); if (!src) return toast('Dépose un fichier image');
    setImage(p, t.dataset.drop === 'pfp' ? 'cover' : 'banner', src);
  }
});
document.addEventListener('dragstart', e => {
  const li = e.target.closest('[data-i],[data-qi]'); if (!li || !e.dataTransfer) return;
  let t; if (li.dataset.qi !== undefined) t = S.queue[+li.dataset.qi]; else { const h = li.closest('[data-src]'); t = tracksOf(h ? h.dataset.src : defaultSrc())[+li.dataset.i]; }
  if (!t) return;
  e.dataTransfer.setData('application/x-saturne', JSON.stringify(slim(t))); e.dataTransfer.effectAllowed = 'copy';
});
let bd = null;
$('#view').addEventListener('pointerdown', e => {
  const b = e.target.closest('#banner'); if (!b || e.target.closest('.pfp,button,input')) return;
  const p = curPl(); if (!p || !p.banner) return;
  bd = {y:e.clientY, start:p.bannerY ?? 50, h:b.offsetHeight, p, el:b}; b.setPointerCapture(e.pointerId); b.classList.add('grab');
});
$('#view').addEventListener('pointermove', e => {
  if (!bd) return;
  bd.p.bannerY = Math.max(0, Math.min(100, bd.start - (e.clientY - bd.y) / bd.h * 160));
  bd.el.style.setProperty('--bposy', `${bd.p.bannerY}%`);
});
const endBd = () => { if (bd) { bd.el.classList.remove('grab'); save(); bd = null; } };
$('#view').addEventListener('pointerup', endBd); $('#view').addEventListener('pointercancel', endBd);

