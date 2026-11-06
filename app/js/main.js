/*
 * Startpunkt: skärmväxling, knappar, vilotimer och klocka. ES5.
 */
var App = (function () {
  'use strict';

  var screens = {};
  var current = null;
  var idleTimer = null;
  var started = false;

  function register(screen) { screens[screen.id] = screen; }

  function go(id) {
    var next = screens[id];
    if (!next || next === current) return;
    if (current) current.hide();
    current = next;
    current.show();
    resetIdle();
  }

  // Startskärmen går till viloläge efter CONFIG.idleAfterSeconds utan knapptryck
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = null;
    if (current && current.id === 'home') {
      idleTimer = setTimeout(function () { go('idle'); }, CONFIG.idleAfterSeconds * 1000);
    }
  }

  function handleKey(code) {
    if (!current) return;
    resetIdle();
    if (current.onKey(code)) return;

    if (code === 37) Focus.move('left');
    else if (code === 38) Focus.move('up');
    else if (code === 39) Focus.move('right');
    else if (code === 40) Focus.move('down');
    else if (code === 13) {
      var f = Focus.get();
      if (f) current.activate(f);
    }
  }

  function onKeyDown(e) {
    var code = e.keyCode;
    var handled = code === 13 || code === 10009 || (code >= 37 && code <= 40) ||
                  code === TV.keyChUp() || code === TV.keyChDown();
    if (!handled && current && current.id !== 'idle') return;
    if (e.preventDefault) e.preventDefault();
    handleKey(code);
  }

  function tick() {
    var now = new Date();
    for (var id in screens) {
      if (screens.hasOwnProperty(id) && screens[id].tick) screens[id].tick(now);
    }
  }

  function start() {
    if (started) return;
    started = true;

    var root = document.getElementById('app') || document.body;
    register(HomeScreen);
    register(LiveScreen);
    register(IdleScreen);
    for (var id in screens) {
      if (screens.hasOwnProperty(id)) screens[id].build(root);
    }

    TV.disableScreenSaver();
    TV.registerKeys();
    document.addEventListener('keydown', onKeyDown);

    Api.start();
    setInterval(tick, 1000);
    setInterval(function () {
      if (current && current.refreshProgram) current.refreshProgram();
    }, (CONFIG.refreshProgram || 60) * 1000);

    // När appen kommer tillbaka från bakgrunden (t.ex. efter YouTube): visa TV-bilden igen och uppdatera
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        TV.hideWindow();
      } else {
        TV.disableScreenSaver();
        Api.refreshAll();
        if (current) current.show();
      }
    });

    go('home');
  }

  return {
    start: start,
    go: go,
    handleKey: handleKey,
    current: function () { return current ? current.id : null; }
  };
})();
