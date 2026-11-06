/*
 * Skärm 2 – Live-TV i helskärm. ES5.
 * TV-bilden visas via tizen.tvwindow (0,0,1920,1080). Liten ruta uppe till höger med klocka
 * och nästa avgång. Panel längst ner med kanal, program, förloppsstapel, "Sedan" och kanalremsa.
 * Panelen göms efter CONFIG.livePanelHideSeconds utan knapptryck.
 */
var LiveScreen = (function () {
  'use strict';

  var U = Util;
  var el = null;
  var channels = [];        // ChannelInfo-lista
  var channel = null;       // aktuell kanal
  var program = null;       // aktuellt program
  var upcoming = [];        // nästa program
  var stripIndex = 0;       // fokuserad kanal i remsan
  var panelVisible = true;
  var hideTimer = null;
  var lastClock = '';
  var FULL = [0, 0, 1920, 1080];

  function build(container) {
    el = document.createElement('div');
    el.id = 'screen-live';
    el.className = 'screen transparent';
    el.innerHTML =
      '<div class="live-corner" id="live-corner">' +
        '<div class="live-clock" id="live-clock">--:--</div>' +
        '<div class="live-dep" id="live-dep">' + U.icon('train', 24) + '<span>Hämtar avgångar…</span></div>' +
      '</div>' +
      '<div class="live-panel" id="live-panel">' +
        '<div class="live-now">' +
          '<div class="live-num" id="live-num"></div>' +
          '<div class="live-meta">' +
            '<div class="live-name" id="live-name">Live-TV</div>' +
            '<div class="live-prog" id="live-prog"></div>' +
            '<div class="live-times" id="live-times"></div>' +
            '<div class="progress big" id="live-progress"><div class="bar" id="live-bar"></div></div>' +
          '</div>' +
          '<div class="live-next" id="live-next"></div>' +
        '</div>' +
        '<div class="strip" data-zone="strip" id="live-strip"></div>' +
        '<div class="live-hints">' +
          '<span class="hint">' + U.icon('left', 22) + U.icon('right', 22) + ' Bläddra</span>' +
          '<span class="hint">' + U.icon('ok', 22) + ' Byt kanal</span>' +
          '<span class="hint">' + U.icon('channel', 22) + ' CH+ / CH−</span>' +
          '<span class="hint">' + U.icon('back', 22) + ' Tillbaka: Startskärm</span>' +
        '</div>' +
      '</div>';
    container.appendChild(el);

    Api.on('sl', renderDeparture);
    TV.onChannelChange(function (ch) { onChannelChanged(ch); });
  }

  // ---------- Hörnruta ----------

  function tick(now) {
    var t = U.hhmm(now);
    if (t !== lastClock) { lastClock = t; U.text('live-clock', t); }
    if (now.getSeconds() % 10 === 0) updateProgress(now);
  }

  function renderDeparture() {
    var next = Api.nextDepartures(1)[0];
    var txt;
    if (!Api.state.sl) txt = 'Avgångar saknas';
    else if (!next) txt = 'Inga tåg just nu';
    else {
      var when = next.display === 'Nu' ? 'nu' : /min/.test(next.display) ? 'om ' + next.display : next.display;
      txt = next.line + ' mot ' + next.destination + ' ' + when;
    }
    U.html('live-dep', U.icon('train', 24) + '<span>' + U.esc(txt) + '</span>');
  }

  // ---------- Kanaler ----------

  function loadChannels(cb) {
    TV.getChannels(function (list) {
      channels = list;
      cb();
    });
  }

  function currentIndex() {
    for (var i = 0; i < channels.length; i++) {
      if (TV.sameChannel(channels[i], channel)) return i;
    }
    return -1;
  }

  function renderStrip() {
    var n = CONFIG.liveChannelsVisible || 7;
    var strip = U.$('live-strip');
    if (!channels.length) {
      strip.innerHTML = '<div class="muted">Ingen kanallista tillgänglig</div>';
      return;
    }
    if (stripIndex < 0) stripIndex = 0;
    if (stripIndex >= channels.length) stripIndex = channels.length - 1;
    var half = Math.floor(n / 2);
    var start = Math.max(0, Math.min(stripIndex - half, channels.length - n));
    var cur = currentIndex();
    var html = '';
    for (var i = start; i < Math.min(start + n, channels.length); i++) {
      var ch = channels[i];
      html += '<div class="ch' + (i === cur ? ' current' : '') + '" data-focus data-action="ch:' + i + '" id="live-ch-' + i + '">' +
        '<div class="ch-num">' + U.esc(TV.channelLabel(ch)) + '</div>' +
        '<div class="ch-name">' + U.esc(ch.channelName || 'Kanal') + '</div></div>';
    }
    strip.innerHTML = html;
    var focusEl = U.$('live-ch-' + stripIndex);
    if (focusEl) Focus.set(focusEl);
  }

  function tuneTo(index) {
    var ch = channels[index];
    if (!ch) return;
    TV.tune(ch, function (ok, newCh, err) {
      if (ok) onChannelChanged(newCh || ch);
      else U.toast(err || 'Kunde inte byta kanal');
    });
  }

  function onChannelChanged(ch) {
    channel = ch || TV.getCurrentChannel();
    var idx = currentIndex();
    if (idx >= 0) stripIndex = idx;
    updateProgram();
    if (el.style.display !== 'none') renderStrip();
  }

  // ---------- Program ----------

  function updateProgram() {
    if (!channel) channel = TV.getCurrentChannel();
    program = TV.getCurrentProgram();
    U.text('live-num', channel ? TV.channelLabel(channel) : '');
    U.text('live-name', channel ? (channel.channelName || 'Live-TV') : 'Ingen kanal');
    U.text('live-prog', program ? program.title : (TV.epgAvailable() === false ? 'Programinformation saknas' : ''));
    U.text('live-times', program ? U.hhmm(program.start) + ' – ' + U.hhmm(program.end) : '');
    var pr = U.$('live-progress');
    if (pr) pr.style.display = program ? '' : 'none';
    updateProgress(new Date());

    upcoming = [];
    renderUpcoming();
    TV.getUpcoming(channel, 2, function (list) {
      upcoming = list;
      renderUpcoming();
    });
  }

  function renderUpcoming() {
    var box = U.$('live-next');
    if (!upcoming.length) { box.innerHTML = ''; return; }
    var html = '<div class="live-next-title">Sedan</div>';
    for (var i = 0; i < upcoming.length; i++) {
      html += '<div class="live-next-item"><span>' + U.hhmm(upcoming[i].start) + '</span>' + U.esc(upcoming[i].title) + '</div>';
    }
    box.innerHTML = html;
  }

  function updateProgress(now) {
    var bar = U.$('live-bar');
    if (!bar || !program) return;
    if (now > program.end) { updateProgram(); return; }
    var pct = program.duration ? (now - program.start) / (program.duration * 1000) * 100 : 0;
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  // ---------- Panel ----------

  function showPanel() {
    panelVisible = true;
    U.$('live-panel').className = 'live-panel';
    armHide();
  }

  function hidePanel() {
    panelVisible = false;
    U.$('live-panel').className = 'live-panel hidden';
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  function armHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hidePanel, (CONFIG.livePanelHideSeconds || 5) * 1000);
  }

  // ---------- Livscykel ----------

  function show() {
    el.style.display = 'block';
    tick(new Date());
    renderDeparture();
    Focus.setRoot(el);
    TV.showWindow(FULL, function (ok, err) {
      if (!ok && TV.available) U.toast('TV-bilden kunde inte visas' + (err ? ' (' + err + ')' : ''));
    });
    channel = TV.getCurrentChannel();
    var ready = function () {
      var idx = currentIndex();
      stripIndex = idx >= 0 ? idx : 0;
      updateProgram();
      renderStrip();
      showPanel();
    };
    if (channels.length) ready(); else loadChannels(ready);
  }

  function hide() {
    clearTimeout(hideTimer);
    hideTimer = null;
    el.style.display = 'none';
  }

  function activate(target) {
    var action = target.getAttribute('data-action') || '';
    if (action.indexOf('ch:') === 0) tuneTo(+action.substr(3));
  }

  function onKey(code) {
    var wasHidden = !panelVisible;
    if (code === 10009) { App.go('home'); return true; }

    if (code === TV.keyChUp() || code === TV.keyChDown()) {
      showPanel();
      (code === TV.keyChUp() ? TV.tuneUp : TV.tuneDown)(function (ok, ch, err) {
        if (ok) onChannelChanged(ch);
        else if (err) U.toast(err);
      });
      return true;
    }

    showPanel();
    if (wasHidden) return true;          // första knappen visar bara panelen

    if (code === 37 || code === 39) {    // vänster/höger bläddrar i remsan
      if (!channels.length) return true;
      stripIndex = Math.max(0, Math.min(channels.length - 1, stripIndex + (code === 39 ? 1 : -1)));
      renderStrip();
      return true;
    }
    if (code === 38 || code === 40) return true; // upp/ner gör inget här
    return false;                        // OK hanteras av main.js -> activate
  }

  return {
    id: 'live',
    build: build,
    show: show,
    hide: hide,
    tick: tick,
    onKey: onKey,
    activate: activate,
    refreshProgram: updateProgram
  };
})();
