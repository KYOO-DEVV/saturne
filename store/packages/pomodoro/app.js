/* Minuteur Pomodoro : exemple d'App Saturne (permissions : storage, player.control). */
(function () {
  var FOCUS = 25 * 60, BREAK = 5 * 60;
  var st = { phase: 'focus', left: FOCUS, running: false, done: 0, pauseMusic: true }, timer = 0;
  document.body.innerHTML = '<div class="box"><h1>Pomodoro</h1><div class="phase" id="ph"></div><div class="time" id="tm"></div>' +
    '<div class="row"><button class="main" id="go"></button><button id="rs">Réinitialiser</button><button id="sk">Passer</button></div>' +
    '<label><input type="checkbox" id="pm"> Mettre la musique en pause pendant la pause</label><div class="count" id="ct"></div></div>';
  var $ = function (i) { return document.getElementById(i); };
  function fmt(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function draw() {
    $('ph').textContent = st.phase === 'focus' ? 'Concentration' : 'Pause';
    $('tm').textContent = fmt(st.left); $('go').textContent = st.running ? 'Pause' : 'Démarrer';
    $('ct').textContent = st.done + (st.done > 1 ? ' sessions terminées' : ' session terminée'); $('pm').checked = st.pauseMusic;
    document.title = fmt(st.left);
  }
  function persist() { saturne.storage.set('state', JSON.stringify({ done: st.done, pauseMusic: st.pauseMusic })).catch(function () {}); }
  function next() {
    if (st.phase === 'focus') { st.done++; st.phase = 'break'; st.left = BREAK; saturne.ui.toast('Bien joué ! Pause de 5 minutes.'); if (st.pauseMusic) saturne.player.pause().catch(function () {}); }
    else { st.phase = 'focus'; st.left = FOCUS; saturne.ui.toast('Retour à la concentration.'); if (st.pauseMusic) saturne.player.play().catch(function () {}); }
    persist(); draw();
  }
  function tick() { if (--st.left <= 0) next(); draw(); }
  $('go').onclick = function () { st.running = !st.running; clearInterval(timer); if (st.running) timer = setInterval(tick, 1000); draw(); };
  $('rs').onclick = function () { clearInterval(timer); st.running = false; st.phase = 'focus'; st.left = FOCUS; draw(); };
  $('sk').onclick = function () { next(); };
  $('pm').onchange = function (e) { st.pauseMusic = e.target.checked; persist(); };
  saturne.storage.get('state').then(function (v) { try { var o = JSON.parse(v || '{}'); st.done = o.done | 0; if (typeof o.pauseMusic === 'boolean') st.pauseMusic = o.pauseMusic; } catch (e) {} draw(); }).catch(draw);
  draw();
})();
