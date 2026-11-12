/* Minuteur Pomodoro : concentration, pauses, cycle de 4 sessions. Permissions : storage (se souvenir), player.control (musique en pause pendant les pauses). */
(function () {
  var MODES = { focus: { label: 'Concentration', min: 25 }, short: { label: 'Pause courte', min: 5 }, long: { label: 'Pause longue', min: 15 } };
  var st = { mode: 'focus', left: MODES.focus.min * 60000, endAt: 0, running: false, done: 0, pauseMusic: true };
  document.body.innerHTML =
    '<div class="wrap"><div class="modes" role="tablist" id="modes"></div>' +
    '<div class="ring" id="ring"><div class="in"><div class="time" id="tm"></div><div class="phase" id="ph"></div></div></div>' +
    '<div class="dots" id="dots" aria-label="Sessions du cycle"></div>' +
    '<div class="row"><button class="main" id="go"></button><button id="rs">Réinitialiser</button><button id="sk">Passer</button></div>' +
    '<label class="opt"><input type="checkbox" id="pm"><span>Mettre la musique en pause pendant les pauses</span></label>' +
    '<div class="count" id="ct"></div></div>';
  var $ = function (i) { return document.getElementById(i); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  function total() { return MODES[st.mode].min * 60000; }
  function fmt(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
  function save() { saturne.storage.set('state', JSON.stringify({ done: st.done, pauseMusic: st.pauseMusic })).catch(function () {}); }
  function draw() {
    var left = st.running ? Math.max(0, st.endAt - Date.now()) : st.left;
    $('tm').textContent = fmt(left); $('ph').textContent = MODES[st.mode].label;
    $('ring').style.setProperty('--p', ((1 - left / total()) * 100).toFixed(2));
    $('go').textContent = st.running ? 'Pause' : (left < total() ? 'Reprendre' : 'Démarrer');
    $('modes').innerHTML = Object.keys(MODES).map(function (k) { return '<button role="tab" data-m="' + k + '" class="' + (k === st.mode ? 'on' : '') + '">' + MODES[k].label + '</button>'; }).join('');
    var inCycle = st.done % 4;
    $('dots').innerHTML = [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < inCycle ? 'on' : '') + '"></i>'; }).join('');
    $('ct').textContent = st.done + (st.done > 1 ? ' sessions terminées' : ' session terminée'); $('pm').checked = st.pauseMusic;
    document.title = fmt(left) + ' · ' + MODES[st.mode].label;
  }
  function setMode(m, autostart) {
    st.mode = m; st.left = total(); st.running = false;
    if (autostart) { st.running = true; st.endAt = Date.now() + st.left; }
    draw();
  }
  function finish() {
    if (st.mode === 'focus') {
      st.done++; var long = st.done % 4 === 0; save();
      saturne.ui.toast(long ? 'Quatre sessions ! Pause longue de 15 minutes.' : 'Bien joué ! Pause de 5 minutes.');
      if (st.pauseMusic) saturne.player.pause().catch(function () {});
      setMode(long ? 'long' : 'short', true);
    } else {
      saturne.ui.toast('Retour à la concentration.');
      if (st.pauseMusic) saturne.player.play().catch(function () {});
      setMode('focus', true);
    }
  }
  function tick() { if (st.running && Date.now() >= st.endAt) finish(); else draw(); }
  $('go').onclick = function () {
    if (st.running) { st.left = Math.max(0, st.endAt - Date.now()); st.running = false; }
    else { st.running = true; st.endAt = Date.now() + st.left; }
    draw();
  };
  $('rs').onclick = function () { setMode(st.mode, false); };
  $('sk').onclick = function () { if (st.mode === 'focus') finish(); else { if (st.pauseMusic) saturne.player.play().catch(function () {}); setMode('focus', false); } };
  $('pm').onchange = function (e) { st.pauseMusic = e.target.checked; save(); };
  $('modes').onclick = function (e) { var b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m, false); };
  setInterval(tick, 250);
  saturne.storage.get('state').then(function (v) {
    try { var o = JSON.parse(v || '{}'); st.done = o.done | 0; if (typeof o.pauseMusic === 'boolean') st.pauseMusic = o.pauseMusic; } catch (e) {}
    draw();
  }).catch(draw);
  draw();
})();
