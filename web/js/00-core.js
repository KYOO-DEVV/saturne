/* Icônes : une seule famille, en trait (1.8 px, extrémités arrondies). Les icônes de transport (lecture, pause, suivant, précédent) restent pleines, comme partout. « F: » = tracé plein. */
const ICONS = {
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  person:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5"/>',
  lib:'<path d="M5 4v16"/><path d="M10 4v16"/><path d="m15 5.5 4.5 14"/>',
  settings:'<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',
  queue:'<path d="M4 6h12M4 11h12M4 16h7"/><circle cx="17.5" cy="17" r="2.5"/><path d="M20 17V9l2.5 1"/>',
  addq:'<path d="M4 6h12M4 11h8M4 16h6"/><path d="M18 11v8M14 15h8"/>',
  left:'<path d="m15 5-7 7 7 7"/>', right:'<path d="m9 5 7 7-7 7"/>',
  up:'<path d="m5 15 7-7 7 7"/>', down:'<path d="m5 9 7 7 7-7"/>', chevd:'<path d="m6 9 6 6 6-6"/>',
  note:'<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  play:'F:M8 5v14l11-7z', pause:'F:M6 5h4v14H6zM14 5h4v14h-4z',
  next:'F:M6 5l9 7-9 7zM17 5h2v14h-2z', prev:'F:M18 5l-9 7 9 7zM5 5h2v14H5z',
  bookmarkf:'F:M7 3h10a2 2 0 012 2v16l-7-4.2L5 21V5a2 2 0 012-2z',
  shuffle:'<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.45-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/>',
  repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  repeat1:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  plusc:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  vol:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>',
  trash:'<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  more:'<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  download:'<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
  upload:'<path d="M12 16V5"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/>',
  shield:'<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/>',
  tune:'<path d="M3 12h3.5l2.5-7 4 14 2.5-7H21"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.6-.3-1-.6-1.4-.3-.4-.4-.7-.4-1.1 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>',
  storage:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  logout:'<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="m16 8 4 4-4 4M20 12H9"/>',
  check:'<path d="m5 12 5 5 9-10"/>',
  genres:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  history:'<path d="M4 6v6h6"/><path d="M5.2 12A8 8 0 1 0 8 6.1L4 10"/><path d="M12 8v4l3 2"/>',
  lyrics:'<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 9.5h8M8 13h5"/>',
  mic:'<path d="M4 20c3-1 5-3 6-5"/><path d="m14 4 6 6-8 8-6-6z"/><path d="m12 8 4 4"/>',
  expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  mini:'<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5" rx="1"/>',
  radio:'<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"/>'
};
const ic = (n, cls = '') => {
  const v = ICONS[n] || '';
  return v.startsWith('F:') ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${v.slice(2)}"/></svg>`
    : `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${v}</svg>`;
};
const BM_PATH = 'M7 3h10a2 2 0 012 2v16l-7-4.2L5 21V5a2 2 0 012-2z';
// Bookmark : le remplissage monte du bas vers le haut (voir .bm-fill dans le CSS).
const bmSvg = `<svg class="bm" viewBox="0 0 24 24" aria-hidden="true"><g clip-path="url(#bmclip)"><rect class="bm-fill" x="0" y="0" width="24" height="24"/></g><path class="bm-out" d="${BM_PATH}"/></svg>`;
const logoSvg = (px = 30) => `<svg viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true" style="width:${px}px;height:${px}px"><g transform="rotate(-22 12 12)"><path d="M2.4 12a9.6 3.1 0 0 1 19.2 0" fill="none" stroke="#6b46c8" stroke-width="1.6"/></g><circle cx="12" cy="12" r="5.2" fill="#f5f5fa"/><g transform="rotate(-22 12 12)"><path d="M2.4 12a9.6 3.1 0 0 0 19.2 0" fill="none" stroke="#8b5cf6" stroke-width="1.8"/></g></svg>`;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = String(s%60).padStart(2,'0'); return h ? `${h}:${String(m).padStart(2,'0')}:${x}` : `${m}:${x}`; };
const shuffleArr = a => { for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
const injectIcons = root => root.querySelectorAll('[data-ic]').forEach(el => { if (!el.querySelector(':scope > svg')) el.insertAdjacentHTML('afterbegin', ic(el.dataset.ic)); });
const ago = m => m == null ? '' : m < 60 ? `il y a ${Math.max(1, m)} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : m < 10080 ? `il y a ${Math.round(m / 1440)} j` : `il y a ${Math.round(m / 10080)} sem.`;
const initial = s => (String(s || '?').trim()[0] || '?').toUpperCase();
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;

const COUNTRIES = {JP:'Japon', FR:'France', US:'États-Unis', KR:'Corée du Sud', GB:'Royaume-Uni', BR:'Brésil'};
const GENRES = [
  {n:'J-Pop', q:'J-Pop', cc:'JP'}, {n:'City Pop', q:'city pop', cc:'JP'}, {n:'Anime', q:'anime opening', cc:'JP'}, {n:'Vocaloid', q:'vocaloid', cc:'JP'},
  {n:'K-Pop', q:'K-Pop', cc:'KR'}, {n:'Pop', q:'pop hits'}, {n:'Rock', q:'rock music'}, {n:'Hip-Hop', q:'hip hop music'},
  {n:'R&B', q:'r&b soul'}, {n:'Électro', q:'electronic dance music'}, {n:'Lo-fi', q:'lofi chill'}, {n:'Jazz', q:'jazz music'},
  {n:'Classique', q:'classical piano'}, {n:'Metal', q:'metal music'}, {n:'Reggae', q:'reggae'}, {n:'Latino', q:'reggaeton latin'}
];
let SHELVES = [
  {key:'anime', title:'Anime & OST', q:'anime opening', cc:'JP'},
  {key:'citypop', title:'City Pop', q:'city pop', cc:'JP'}
];
const CHIPS = [['all','All'], ['bookmarks','Bookmarks'], ['mine','Created by You'], ['public','Public'], ['private','Private'], ['community','Community']];

