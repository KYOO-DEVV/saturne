/* Saturne SDK : chargé automatiquement dans chaque App (iframe isolée). Expose `window.saturne`.
   Les appels passent par postMessage ; Saturne vérifie les permissions déclarées dans manifest.json. */
(function () {
  'use strict';
  var pending = {}, seq = 0, handlers = {}, lastTheme = null;
  function call(method, args) {
    return new Promise(function (resolve, reject) {
      var id = ++seq; pending[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({ saturne: 1, id: id, method: method, args: args || [] }, '*');
      setTimeout(function () { if (pending[id]) { delete pending[id]; reject(new Error('Saturne ne répond pas')); } }, 20000);
    });
  }
  function applyTheme(t) {
    if (!t || !t.vars) return;
    var st = document.documentElement.style;
    Object.keys(t.vars).forEach(function (k) { if (/^--[a-z0-9-]+$/.test(k)) st.setProperty(k, String(t.vars[k]).slice(0, 200)); });
    document.documentElement.style.colorScheme = t.light ? 'light' : 'dark';
  }
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    var m = e.data; if (!m || m.saturne !== 1) return;
    if (m.id && pending[m.id]) {
      var p = pending[m.id]; delete pending[m.id];
      if (m.error) p.reject(new Error(m.error)); else p.resolve(m.result);
    } else if (m.event) {
      if (m.event === 'theme') { lastTheme = m.data; applyTheme(m.data); }
      (handlers[m.event] || []).forEach(function (f) { try { f(m.data); } catch (err) { console.error(err); } });
    }
  });
  window.saturne = {
    /* permission « player.read » : état de la lecture ; « player.control » : commandes */
    player: {
      current: function () { return call('player.current'); },
      state: function () { return call('player.state'); },
      play: function () { return call('player.play'); },
      pause: function () { return call('player.pause'); },
      next: function () { return call('player.next'); },
      prev: function () { return call('player.prev'); }
    },
    /* permission « queue.add » : { id, title, channel } d'une vidéo YouTube */
    queue: { add: function (track) { return call('queue.add', [track]); } },
    /* permission « search » : renvoie une liste de titres */
    search: function (query) { return call('search', [query]); },
    /* permission « storage » : petit espace de stockage propre à l'App (texte, 100 Ko au plus) */
    storage: {
      get: function (key) { return call('storage.get', [key]); },
      set: function (key, value) { return call('storage.set', [key, value]); },
      remove: function (key) { return call('storage.remove', [key]); }
    },
    /* toujours permis */
    ui: { toast: function (message) { return call('ui.toast', [message]); } },
    /* événements : « player » (état de lecture, permission player.read), « theme » */
    on: function (event, fn) {
      (handlers[event] = handlers[event] || []).push(fn);
      if (event === 'theme' && lastTheme) setTimeout(function () { fn(lastTheme); }, 0); // le thème est déjà arrivé : on le rejoue
    },
    ready: call('hello')
  };
})();
