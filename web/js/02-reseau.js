/* ---------- Réseau ---------- */
async function http(url, opt){
  let r;
  try { r = await fetch(url, opt); } catch { const e = new Error('Le serveur de Saturne ne répond pas.'); e.offline = true; throw e; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Erreur ' + r.status); e.status = r.status; throw e; }
  return j;
}
const api = (route, params) => http('/api/' + route + '?' + new URLSearchParams(params));
const send = (url, body, method = 'POST') => http(url, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
const errText = e => e.offline ? 'Le serveur de Saturne ne répond pas. Relance l\'application.' : (e.message || 'Erreur') + (/limite temporairement/.test(e.message || '') ? '' : ' Réessaie dans un instant.');

