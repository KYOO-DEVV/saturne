/* ---------- 0.9.0 : autres sources de musique : YouTube Music et SoundCloud ---------- */
/* YouTube Music : recherche de morceaux (mêmes identifiants que YouTube, joués par le même lecteur).
   SoundCloud : coller le lien d'un titre (sans clé), ou chercher avec ton propre Client ID ; lecture par le widget officiel. */
const SRC_LIST = () => [['yt', 'YouTube'], ['ytm', 'YouTube Music'], ['sc', 'SoundCloud']];
const scUrl = s => /^https?:\/\/(?:www\.|m\.|on\.)?soundcloud\.com\/[\w\-./%]+/i.test(String(s).trim());
const curSrc = () => S.settings.searchSrc && SRC_LIST().some(x => x[0] === S.settings.searchSrc) ? S.settings.searchSrc : 'yt';
function srcChips(){
  const cur = S.view.type === 'search' && S.search.q && S.search.src ? S.search.src : curSrc();
  return `<div class="seg srcseg" role="group" aria-label="${L('Source', 'Source')}">${SRC_LIST().map(([k, n]) => `<button data-srcset="${k}" class="${cur === k ? 'on' : ''}" aria-pressed="${cur === k}">${n}</button>`).join('')}</div>`;
}
const srcBadge = t => t && t.src === 'sc' ? `<span class="srcbadge" title="SoundCloud">SC</span>` : '';
$('#view').addEventListener('click', e => {
  const b = e.target.closest('[data-srcset]'); if (!b) return;
  S.settings.searchSrc = b.dataset.srcset; save();
  const q = S.view.type === 'search' ? S.view.q : ''; if (q) runSearch(q); else renderView();
  const bq = $('#bigQ'); if (bq) bq.focus();
});
/* Réglage : Client ID SoundCloud (API officielle). */
const scRow = () => setRow('SoundCloud', L('To search SoundCloud, paste your own Client ID (from developers.soundcloud.com). Without it you can still paste a track link in the search bar. Saturne never reads a key from SoundCloud’s website.', 'Pour chercher sur SoundCloud, colle ton propre Client ID (de developers.soundcloud.com). Sans lui, tu peux quand même coller le lien d’un titre dans la barre de recherche. Saturne ne lit jamais de clé sur le site de SoundCloud.'),
  `<input class="input scinput" id="scCid" type="password" maxlength="64" spellcheck="false" autocomplete="off" placeholder="Client ID" aria-label="SoundCloud Client ID" value="${esc(S.settings.scClientId || '')}">`);
$('#view').addEventListener('input', e => {
  if (e.target.id !== 'scCid') return;
  const v = e.target.value.trim(); S.settings.scClientId = /^[A-Za-z0-9]{16,64}$/.test(v) ? v : (v === '' ? '' : S.settings.scClientId || ''); e.target.classList.toggle('bad', v !== '' && !/^[A-Za-z0-9]{16,64}$/.test(v)); save();
});
