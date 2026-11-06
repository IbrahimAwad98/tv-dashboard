/*
 * Skärm 1 – Startskärm. ES5.
 * Topprad med meny, hero (hälsning + live-TV-ruta), apprad, tre widgets och fotrad.
 */
var HomeScreen = (function () {
  'use strict';

  var U = Util;
  var el = null;
  var channel = null;       // aktuell kanal (ChannelInfo)
  var program = null;       // aktuellt program (normaliserat)
  var settingsOpen = false;
  var lastClock = '', lastDate = '', lastGreeting = '';
  var appsResolved = false;
  var detectedApps = [];

  // Ruta för live-TV: 720x405, fast position (används både för CSS och tizen.tvwindow)
  var TV_RECT = [1136, 136, 720, 405];

  var MENU = [
    { key: 'home', label: 'Hem', icon: 'home' },
    { key: 'live', label: 'Live-TV', icon: 'tv' },
    { key: 'apps', label: 'Appar', icon: 'apps' },
    { key: 'idle', label: 'Viloläge', icon: 'moon' },
    { key: 'settings', label: 'Inställningar', icon: 'settings' }
  ];

  var APP_ICONS = { live: 'tv', youtube: 'youtube', svtplay: 'play', tv4play: 'play', netflix: 'film', spotify: 'music', idle: 'moon' };

  // ---------- Bygg DOM ----------

  function build(container) {
    el = document.createElement('div');
    el.id = 'screen-home';
    el.className = 'screen';

    var menu = '';
    for (var i = 0; i < MENU.length; i++) {
      menu += '<div class="menu-btn" data-focus data-action="menu:' + MENU[i].key + '">' +
        U.icon(MENU[i].icon, 28) + '<span>' + MENU[i].label + '</span></div>';
    }

    el.innerHTML =
      // Första barnet: målar bakgrunden runt hålet där TV-bilden syns (box-shadow-trick)
      '<div class="tv-hole-bg" style="left:' + TV_RECT[0] + 'px;top:' + TV_RECT[1] + 'px;width:' +
        TV_RECT[2] + 'px;height:' + TV_RECT[3] + 'px"></div>' +

      '<div class="topbar">' +
        '<div class="menu" data-zone="menu">' + menu + '</div>' +
        '<div class="topbar-right">' +
          '<div id="home-weather-mini" class="weather-mini"></div>' +
          '<div id="home-clock" class="topbar-clock">--:--</div>' +
        '</div>' +
      '</div>' +

      '<div class="hero">' +
        '<div class="hero-left">' +
          '<div id="home-date" class="hero-date"></div>' +
          '<div id="home-greeting" class="hero-greeting"></div>' +
          '<div class="hero-facts">' +
            '<div class="fact" id="home-fact-dep">' + U.icon('train', 34) + '<span>Hämtar avgångar…</span></div>' +
            '<div class="fact" id="home-fact-weather">' + U.icon('cloud', 34) + '<span>Hämtar väder…</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Ligger utanför .hero så att left/top är i skärmkoordinater (samma som tizen.tvwindow)
      '<div class="hero-tv" data-zone="hero">' +
        '<div id="home-tv" class="tv-box" data-focus data-action="live" style="left:' + TV_RECT[0] + 'px;top:' +
          TV_RECT[1] + 'px;width:' + TV_RECT[2] + 'px;height:' + TV_RECT[3] + 'px">' +
          '<div class="tv-nosignal" id="home-tv-nosignal">' + U.icon('tv', 64) + '<div>Live-TV</div></div>' +
          '<div class="tv-info">' +
            '<div class="tv-info-row">' +
              '<span class="tv-num" id="home-tv-num"></span>' +
              '<span class="tv-name" id="home-tv-name">Live-TV</span>' +
              '<span class="tv-prog" id="home-tv-prog"></span>' +
            '</div>' +
            '<div class="progress" id="home-tv-progress"><div class="bar" id="home-tv-bar"></div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="section-title">Dina appar</div>' +
      '<div class="apps" data-zone="apps" id="home-apps"></div>' +

      '<div class="widgets" data-zone="widgets">' +
        '<div class="widget" data-focus data-action="refresh:sl">' +
          '<div class="widget-title">' + U.icon('train', 26) + '<span>Avgångar · ' + U.esc(CONFIG.slSiteName) + '</span></div>' +
          '<div class="widget-body" id="home-sl"><div class="muted">Hämtar…</div></div>' +
        '</div>' +
        '<div class="widget" data-focus data-action="refresh:weather">' +
          '<div class="widget-title">' + U.icon('cloud', 26) + '<span>Väder · ' + U.esc(CONFIG.place) + '</span></div>' +
          '<div class="widget-body" id="home-weather"><div class="muted">Hämtar…</div></div>' +
        '</div>' +
        '<div class="widget" data-focus data-action="refresh:calendar">' +
          '<div class="widget-title">' + U.icon('calendar', 26) + '<span>Kalender</span></div>' +
          '<div class="widget-body" id="home-calendar"><div class="muted">Hämtar…</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="footer">' +
        '<span class="hint">' + U.icon('left', 22) + U.icon('up', 22) + U.icon('down', 22) + U.icon('right', 22) + ' Navigera</span>' +
        '<span class="hint">' + U.icon('ok', 22) + ' Välj</span>' +
        '<span class="hint">' + U.icon('channel', 22) + ' CH+ / CH− Kanal</span>' +
        '<span class="hint">' + U.icon('back', 22) + ' Tillbaka: Viloläge</span>' +
        '<span class="hint right" id="home-updated"></span>' +
      '</div>' +

      '<div class="modal-backdrop" id="home-settings">' +
        '<div class="modal" data-zone="settings">' +
          '<div class="modal-title">Inställningar</div>' +
          '<div class="modal-body" id="home-settings-body"></div>' +
          '<div class="modal-actions">' +
            '<div class="btn" data-focus data-action="settings:refresh">Uppdatera data</div>' +
            '<div class="btn" data-focus data-action="settings:close">Stäng</div>' +
            '<div class="btn danger" data-focus data-action="settings:exit">Avsluta appen</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    container.appendChild(el);

    renderApps();
    Api.on('weather', renderWeather);
    Api.on('sl', renderSl);
    Api.on('calendar', renderCalendar);
    TV.onChannelChange(function (ch) { channel = ch; updateProgram(); });
  }

  // ---------- Appar ----------

  function matches(app, name) {
    var n = (name || '').toLowerCase();
    for (var i = 0; i < (app.match || []).length; i++) {
      if (n.indexOf(app.match[i]) !== -1) return true;
    }
    return false;
  }

  function resolveApps(cb) {
    TV.getApps(function (infos) {
      detectedApps = infos;
      for (var i = 0; i < CONFIG.apps.length; i++) {
        var app = CONFIG.apps[i];
        if (app.screen || app.id) continue;
        for (var j = 0; j < infos.length; j++) {
          if (matches(app, infos[j].name)) { app.id = infos[j].id; break; }
        }
      }
      appsResolved = true;
      try {
        console.log('[apps] installerade: ' + JSON.stringify(infos));
        console.log('[apps] matchade: ' + JSON.stringify(CONFIG.apps));
      } catch (e) {}
      cb();
    });
  }

  function renderApps() {
    var html = '';
    for (var i = 0; i < CONFIG.apps.length; i++) {
      var app = CONFIG.apps[i];
      if (!app.screen && !app.id) continue; // visa bara installerade appar
      html += '<div class="tile" data-focus data-action="app:' + i + '">' +
        '<div class="tile-icon">' + U.icon(APP_ICONS[app.key] || 'apps', 44) + '</div>' +
        '<div class="tile-name">' + U.esc(app.name) + '</div></div>';
    }
    U.html('home-apps', html);
  }

  // ---------- Klocka, datum, hälsning ----------

  function tick(now) {
    var t = U.hhmm(now);
    if (t !== lastClock) { lastClock = t; U.text('home-clock', t); }
    var d = U.longDate(now).toUpperCase();
    if (d !== lastDate) { lastDate = d; U.text('home-date', d); }
    var g = U.greeting(now) + ', ' + CONFIG.userName;
    if (g !== lastGreeting) { lastGreeting = g; U.text('home-greeting', g); }
    if (now.getSeconds() % 10 === 0) updateProgress(now);
  }

  // ---------- Väder ----------

  function renderWeather(w) {
    if (!w) {
      U.html('home-weather', '<div class="error">Kunde inte hämta väder (' + U.esc(Api.state.errors.weather) + ')</div>');
      return;
    }
    U.html('home-weather-mini', U.weatherIcon(w.kind, w.isDay) + '<span>' + w.temp + '°</span>');

    var html = '';
    for (var i = 0; i < w.days.length; i++) {
      var d = w.days[i];
      html += '<div class="fc-day"><div class="fc-name">' + U.esc(d.name) + '</div>' +
        '<div class="fc-icon">' + U.weatherIcon(d.kind, 1) + '</div>' +
        '<div class="fc-temp">' + d.max + '°<span>' + d.min + '°</span></div></div>';
    }
    U.html('home-weather', '<div class="forecast">' + html + '</div>');

    var tm = w.days[1];
    if (tm) {
      U.html('home-fact-weather', U.icon('cloud', 34) + '<span>Imorgon: ' + U.esc(tm.desc) + ', ' +
        tm.max + '° / ' + tm.min + '°</span>');
    }
    markUpdated();
  }

  // ---------- Avgångar ----------

  function lineClass(dep) {
    var cls = 'line mode-' + U.esc(dep.mode);
    var g = dep.group.toLowerCase();
    if (dep.mode === 'METRO') {
      if (g.indexOf('grön') !== -1) cls += ' green';
      else if (g.indexOf('röd') !== -1) cls += ' red';
      else if (g.indexOf('blå') !== -1) cls += ' blue';
    } else if (dep.mode === 'BUS' && g.indexOf('blåbuss') !== -1) cls += ' bluebus';
    return cls;
  }

  function depRow(dep) {
    var sub = [];
    if (dep.platform) sub.push('Spår ' + dep.platform);
    if (dep.time) sub.push(dep.time);
    return '<div class="dep' + (dep.cancelled ? ' cancelled' : '') + '">' +
      '<div class="' + lineClass(dep) + '">' + U.esc(dep.line) + '</div>' +
      '<div class="dest">' + U.esc(dep.destination) + '<small>' + U.esc(sub.join(' · ')) + '</small></div>' +
      '<div class="when' + (dep.display === 'Nu' ? ' now' : '') + '">' + U.esc(dep.display) + '</div>' +
    '</div>';
  }

  function renderSl(sl) {
    if (!sl) {
      U.html('home-sl', '<div class="error">Kunde inte hämta avgångar (' + U.esc(Api.state.errors.sl) + ')</div>');
      U.html('home-fact-dep', U.icon('train', 34) + '<span>Avgångar saknas just nu</span>');
      return;
    }
    var deps = Api.nextDepartures(2);
    var html = '';
    for (var i = 0; i < deps.length; i++) html += depRow(deps[i]);
    if (!html) html = '<div class="muted">Inga avgångar just nu</div>';
    if (sl.deviations.length) html += '<div class="deviation">' + U.esc(sl.deviations[0]) + '</div>';
    U.html('home-sl', html);

    var next = deps[0];
    if (next) {
      var when = next.display === 'Nu' ? 'går nu' : /min/.test(next.display) ? 'om ' + next.display : 'kl ' + next.display;
      U.html('home-fact-dep', U.icon('train', 34) + '<span>Nästa tåg: <b>' + U.esc(next.line) + '</b> mot ' +
        U.esc(next.destination) + ' <b>' + U.esc(when) + '</b></span>');
    } else {
      U.html('home-fact-dep', U.icon('train', 34) + '<span>Inga tåg de närmaste ' + CONFIG.slForecastMinutes + ' minuterna</span>');
    }
    markUpdated();
  }

  // ---------- Kalender ----------

  function renderCalendar(cal) {
    if (!cal) {
      U.html('home-calendar', '<div class="error">Kunde inte hämta kalender (' + U.esc(Api.state.errors.calendar) + ')</div>');
      return;
    }
    if (!cal.configured) {
      U.html('home-calendar', '<div class="muted">Ingen kalender inställd.<br>Lägg in en iCal-länk i config.js.</div>');
      return;
    }
    var items = Api.calendarItems(CONFIG.calendarDays, 5);
    var html = '', lastDay = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.day !== lastDay) {
        html += '<div class="cal-day">' + U.esc(it.dayLabel) + '</div>';
        lastDay = it.day;
      }
      html += '<div class="cal-item"><div class="cal-time">' + U.esc(it.when) + '</div>' +
        '<div class="cal-title">' + U.esc(it.title) + '</div></div>';
    }
    U.html('home-calendar', html || '<div class="muted">Inget inbokat idag eller imorgon</div>');
  }

  function markUpdated() {
    U.text('home-updated', 'Uppdaterad ' + U.hhmm(new Date()));
  }

  // ---------- Live-TV-rutan ----------

  function showTvWindow() {
    TV.showWindow(TV_RECT, function (ok, err) {
      var ns = U.$('home-tv-nosignal');
      if (ns) ns.style.display = ok ? 'none' : '';
      if (!ok && TV.available) U.toast('TV-bilden kunde inte visas' + (err ? ' (' + err + ')' : ''));
    });
    channel = TV.getCurrentChannel();
    updateProgram();
  }

  function updateProgram() {
    if (!channel) channel = TV.getCurrentChannel();
    program = TV.getCurrentProgram();
    U.text('home-tv-num', channel ? TV.channelLabel(channel) : '');
    U.text('home-tv-name', channel ? (channel.channelName || 'Live-TV') : 'Live-TV');
    U.text('home-tv-prog', program ? program.title : '');
    var pr = U.$('home-tv-progress');
    if (pr) pr.style.display = program ? '' : 'none';
    updateProgress(new Date());
  }

  function updateProgress(now) {
    var bar = U.$('home-tv-bar');
    if (!bar || !program) return;
    if (now > program.end) { updateProgram(); return; }
    var pct = program.duration ? (now - program.start) / (program.duration * 1000) * 100 : 0;
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  // ---------- Inställningar ----------

  function settingsHtml() {
    var rows = [
      ['Hållplats', CONFIG.slSiteName + ' (site ' + CONFIG.slSiteId + ', ' + (CONFIG.slTransportModes.join(', ') || 'alla') + ')'],
      ['Väder', CONFIG.place + ' (' + CONFIG.latitude + ', ' + CONFIG.longitude + ')'],
      ['Kalender', CONFIG.calendarIcsUrl ? 'iCal-länk inställd' : 'Ej inställd'],
      ['Programguide', TV.epgAvailable() === true ? 'Tillgänglig' : TV.epgAvailable() === false ? 'Saknas på denna TV' : 'Okänt'],
      ['TV-fönster', TV.available ? 'Tizen (' + TV.zPosition() + ')' : 'Ej tillgängligt (inte på TV)'],
      ['Viloläge efter', Math.round(CONFIG.idleAfterSeconds / 60) + ' min']
    ];
    var apps = [];
    for (var i = 0; i < CONFIG.apps.length; i++) {
      var a = CONFIG.apps[i];
      if (a.screen) continue;
      apps.push(a.name + ': ' + (a.id ? a.id : 'ej installerad'));
    }
    rows.push(['Appar', apps.join('<br>')]);
    rows.push(['Hittade på TV:n', detectedApps.length ? detectedApps.map(function (x) {
      return U.esc(x.name) + ' (' + U.esc(x.id) + ')';
    }).join('<br>') : 'inga']);
    var html = '';
    for (var r = 0; r < rows.length; r++) {
      html += '<div class="row"><div class="k">' + rows[r][0] + '</div><div class="v">' + rows[r][1] + '</div></div>';
    }
    return html;
  }

  function openSettings() {
    settingsOpen = true;
    U.html('home-settings-body', settingsHtml());
    U.$('home-settings').style.display = 'block';
    Focus.setRoot(U.$('home-settings'));
  }

  function closeSettings() {
    settingsOpen = false;
    U.$('home-settings').style.display = 'none';
    Focus.setRoot(el);
    Focus.focusFirst('menu');
  }

  // ---------- Livscykel ----------

  function show() {
    el.style.display = 'block';
    tick(new Date());
    var start = function () {
      renderApps();
      Focus.setRoot(el, U.$('home-tv'));
      showTvWindow();
    };
    if (appsResolved) start(); else resolveApps(start);
  }

  function hide() {
    if (settingsOpen) closeSettings();
    el.style.display = 'none';
  }

  function activate(target) {
    var action = target.getAttribute('data-action') || '';
    var parts = action.split(':'), kind = parts[0], arg = parts[1];

    if (kind === 'live') { App.go('live'); return; }
    if (kind === 'menu') {
      if (arg === 'home') Focus.set(U.$('home-tv'));
      else if (arg === 'live') App.go('live');
      else if (arg === 'apps') Focus.focusFirst('apps');
      else if (arg === 'idle') App.go('idle');
      else if (arg === 'settings') openSettings();
      return;
    }
    if (kind === 'app') {
      var app = CONFIG.apps[+arg];
      if (!app) return;
      if (app.screen) { App.go(app.screen); return; }
      U.toast('Startar ' + app.name + '…');
      TV.launchApp(app.id, null, function (err) { U.toast(app.name + ': ' + err); });
      return;
    }
    if (kind === 'refresh') {
      U.toast('Uppdaterar…', 1500);
      if (arg === 'sl') Api.loadSl();
      else if (arg === 'weather') Api.loadWeather();
      else Api.loadCalendar();
      return;
    }
    if (kind === 'settings') {
      if (arg === 'close') closeSettings();
      else if (arg === 'refresh') { Api.refreshAll(); U.toast('Uppdaterar all data…'); }
      else if (arg === 'exit') TV.exitApp();
    }
  }

  function onKey(code) {
    if (code === 10009) {              // Tillbaka
      if (settingsOpen) closeSettings();
      else App.go('idle');
      return true;
    }
    if (code === TV.keyChUp() || code === TV.keyChDown()) {
      if (settingsOpen) return true;
      var up = code === TV.keyChUp();
      (up ? TV.tuneUp : TV.tuneDown)(function (ok, ch, err) {
        if (ok) { channel = ch; updateProgram(); }
        else if (err) U.toast(err);
      });
      return true;
    }
    return false; // pilar och OK hanteras av main.js
  }

  function onChannelChanged(ch) {
    channel = ch;
    updateProgram();
  }

  return {
    id: 'home',
    build: build,
    show: show,
    hide: hide,
    tick: tick,
    onKey: onKey,
    activate: activate,
    onChannelChanged: onChannelChanged,
    refreshProgram: updateProgram
  };
})();
