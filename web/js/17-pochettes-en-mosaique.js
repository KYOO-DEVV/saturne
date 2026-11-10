/* ---------- Pochettes en mosaïque ---------- */
const mosaic = p => p.cover ? `<img src="${esc(p.cover)}" alt="">`
  : p.tracks.length >= 4 ? `<span class="mosaic">${p.tracks.slice(0, 4).map(t => `<img src="${esc(t.thumb)}" alt="" loading="lazy">`).join('')}</span>`
  : p.tracks[0] ? `<img src="${esc(p.tracks[0].thumb)}" alt="">` : '';

