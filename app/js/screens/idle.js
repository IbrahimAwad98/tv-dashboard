/*
 * Skärm 3 – Viloläge. ES5.
 * Stor klocka och datum till vänster, stort väder längst ner till vänster.
 * Höger kolumn: 3 avgångar, kommande kalenderhändelser och "På TV nu".
 * Valfri knapp går tillbaka till startskärmen.
 */
var IdleScreen = (function () {
  'use strict';

  var U = Util;
  var el = null;
  var lastClock = '', lastDate = '';

  function build(container) {
    el = document.createElement('div');
    el.id = 'screen-idle';
    el.className = 'screen';
    el.innerHTML =
      '<div class="idle-left">' +
        '<div class="idle-clock" id="idle-clock">--:--</div>' +
        '<div class="idle-date" id="idle-date"></div>' +
      '</div>' +
      '<div class="idle-weather" id="idle-weather"><div class="muted">Hämtar väder…</div></div>' +
      '<div class="idle-right">' +
        '<div class="idle-card">' +
          '<div class="widget-title">' + U.icon('train', 26) + '<span>Avgångar · ' + U.esc(CONFIG.slSiteName) + '</span></div>' +
          '<div id="idle-sl"><div class="muted">Hämtar…</div></div>' +
        '</div>' +
        '<div class="idle-card grow">' +
          '<div class="widget-title">' + U.icon('calendar', 26) + '<span>Kommande</span></div>' +
          '<div id="idle-cal"><div class="muted">Hämtar…</div></div>' +
        '</div>' +
        '<div class="idle-card small">' +
          '<div class="widget-title">' + U.icon('tv', 26) + '<span>På TV nu</span></div>' +
          '<div id="idle-tv"><div class="muted">–</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="idle-hint">Tryck på valfri knapp för startskärmen</div>';
    container.appendChild(el);

    Api.on('weather', renderWeather);
    Api.on('sl', renderSl);
    Api.on('calendar', renderCalendar);
    TV.onChannelChange(function () { renderTv(); });
  }

  function tick(now) {
    var t = U.hhmm(now);
    if (t !== lastClock) { lastClock = t; U.text('idle-clock', t); }
    var d = U.longDate(now);
    if (d !== lastDate) { lastDate = d; U.text('idle-date', d); }
    if (now.getSeconds() === 0 && now.getMinutes() % 5 === 0) renderTv();
  }

  function renderWeather(w) {
    if (!w) {
      U.html('idle-weather', '<div class="error">Kunde inte hämta väder</div>');
      return;
    }
    U.html('idle-weather',
      '<div class="idle-weather-icon">' + U.weatherIcon(w.kind, w.isDay) + '</div>' +
      '<div class="idle-weather-main">' +
        '<div class="idle-temp">' + w.temp + '°</div>' +
        '<div class="idle-desc">' + U.esc(w.desc) + '</div>' +
        '<div class="idle-extra">Känns som ' + w.feels + '° · Vind ' + w.wind + ' m/s · ' + U.esc(CONFIG.place) + '</div>' +
      '</div>');
  }

  function renderSl(sl) {
    if (!sl) { U.html('idle-sl', '<div class="error">Kunde inte hämta avgångar</div>'); return; }
    var deps = Api.nextDepartures(3), html = '';
    for (var i = 0; i < deps.length; i++) {
      var d = deps[i];
      html += '<div class="dep"><div class="line mode-' + U.esc(d.mode) + '">' + U.esc(d.line) + '</div>' +
        '<div class="dest">' + U.esc(d.destination) + '<small>' + (d.platform ? 'Spår ' + U.esc(d.platform) + ' · ' : '') + U.esc(d.time) + '</small></div>' +
        '<div class="when' + (d.display === 'Nu' ? ' now' : '') + '">' + U.esc(d.display) + '</div></div>';
    }
    U.html('idle-sl', html || '<div class="muted">Inga avgångar just nu</div>');
  }

  function renderCalendar(cal) {
    if (!cal) { U.html('idle-cal', '<div class="error">Kunde inte hämta kalender</div>'); return; }
    if (!cal.configured) { U.html('idle-cal', '<div class="muted">Ingen kalender inställd</div>'); return; }
    var items = Api.calendarItems(7, 6), html = '', lastDay = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.day !== lastDay) { html += '<div class="cal-day">' + U.esc(it.dayLabel) + '</div>'; lastDay = it.day; }
      html += '<div class="cal-item"><div class="cal-time">' + U.esc(it.when) + '</div>' +
        '<div class="cal-title">' + U.esc(it.title) + '</div></div>';
    }
    U.html('idle-cal', html || '<div class="muted">Inget inbokat den närmaste veckan</div>');
  }

  function renderTv() {
    var ch = TV.getCurrentChannel();
    var p = TV.getCurrentProgram();
    if (!ch) { U.html('idle-tv', '<div class="muted">Ingen kanal vald</div>'); return; }
    U.html('idle-tv', '<div class="idle-tv-row"><span class="tv-num">' + U.esc(TV.channelLabel(ch)) + '</span>' +
      '<span class="tv-name">' + U.esc(ch.channelName || '') + '</span></div>' +
      (p ? '<div class="idle-tv-prog">' + U.esc(p.title) + ' <span class="muted">' + U.hhmm(p.start) + ' – ' + U.hhmm(p.end) + '</span></div>' : ''));
  }

  function show() {
    el.style.display = 'block';
    Focus.clear();
    TV.hideWindow();
    tick(new Date());
    renderTv();
    if (Api.state.weather) renderWeather(Api.state.weather);
    if (Api.state.sl) renderSl(Api.state.sl);
    if (Api.state.calendar) renderCalendar(Api.state.calendar);
  }

  function hide() {
    el.style.display = 'none';
  }

  function onKey() {
    App.go('home');
    return true;
  }

  return {
    id: 'idle',
    build: build,
    show: show,
    hide: hide,
    tick: tick,
    onKey: onKey,
    activate: function () {}
  };
})();
