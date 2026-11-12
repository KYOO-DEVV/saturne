/* ---------- Partage de playlists (code à copier) ---------- */
const b64url = bytes => { let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64url = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - t.length % 4) % 4)), c => c.charCodeAt(0));
async function encodeShare(p){
  const data = JSON.stringify({v:1, n:p.name, d:p.description || '', t:p.tracks.slice(0, 300).map(t => t.src === 'sc' ? [t.id, t.title, t.channel, t.duration || 0, t.url, t.thumb || ''] : [t.id, t.title, t.channel, t.duration || 0])});
  const zipped = new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('gzip')));
  return 'SATURNE1.' + b64url(new Uint8Array(await zipped.arrayBuffer()));
}
async function decodeShare(code){
  const m = /^SATURNE1\.([A-Za-z0-9_-]+)$/.exec(String(code).replace(/\s+/g, ''));
  if (!m || m[1].length > 400000) throw new Error('Ce code n\'est pas valide');
  let text = '';
  try {
    const reader = new Blob([unb64url(m[1])]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(), dec = new TextDecoder();
    for (;;) { const {done, value} = await reader.read(); if (done) break; text += dec.decode(value, {stream:true}); if (text.length > 3e6) throw new Error('trop gros'); }
  } catch { throw new Error('Ce code est abîmé ou incomplet'); }
  let j; try { j = JSON.parse(text); } catch { throw new Error('Ce code est abîmé ou incomplet'); }
  const clip = (s, n) => String(s ?? '').slice(0, n);
  const tracks = (Array.isArray(j.t) ? j.t : []).slice(0, 300).filter(r => Array.isArray(r) && (/^[\w-]{11}$/.test(r[0]) || (/^sc:\d{1,14}$/.test(r[0]) && /^https:\/\/soundcloud\.com\/[\w\-./%]+$/.test(r[4] || '')))).map(r => ({id:r[0], title:clip(r[1], 200) || 'Titre', channel:clip(r[2], 100), channelId:'', ...(String(r[0]).startsWith('sc:') ? {src:'sc', url:r[4]} : {}), thumb:String(r[0]).startsWith('sc:') ? (/^https:\/\/[\w.-]*sndcdn\.com\//.test(r[5] || '') ? r[5] : '') : `https://i.ytimg.com/vi/${r[0]}/mqdefault.jpg`, duration:Number(r[3]) > 0 ? Math.round(Number(r[3])) : null}));
  if (!tracks.length) throw new Error('Ce code ne contient aucun titre');
  return {name:clip(j.n, 60) || 'Playlist importée', description:clip(j.d, 160), tracks};
}
function shareModal(p){
  openModal(`<h3>Share « ${esc(p.name)} »</h3><p>Envoie ce code à quelqu'un : dans Saturne, il va dans <b>Your Library › Import</b> et le colle pour récupérer la playlist (${plural(Math.min(p.tracks.length, 300), 'titre')}).</p>
    <textarea class="codebox" id="shCode" readonly aria-label="Code de partage">Génération du code…</textarea>
    <div class="mactions"><button class="ghost" data-mclose>Fermer</button><button class="btn" id="shCopy" disabled>${ic('copy')}Copy code</button></div>`,
  async m => {
    const box = m.querySelector('#shCode'), btn = m.querySelector('#shCopy');
    try { box.value = await encodeShare(p); btn.disabled = false; } catch { box.value = 'Impossible de générer le code.'; return; }
    box.addEventListener('focus', () => box.select());
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(box.value); } catch { box.select(); try { document.execCommand('copy'); } catch {} }
      toast('Code copié');
    });
  });
}
