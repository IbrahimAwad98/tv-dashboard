/*
 * Home Screen – Samsung Tizen 3.0 (Chromium 47)
 * Plain ES5: no arrow functions, let/const, template strings, fetch or Promise.
 */
(function () {
  'use strict';

  // ================= Helpers =================

  // Week starts on Monday; index with weekday(), not getDay()
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

  function $(id) { return document.getElementById(id); }
  function weekday(d) { return (d.getDay() + 6) % 7; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function dayDiff(a, b) {
    // Number of whole days from a to b (DST-safe via UTC)
    var ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((ub - ua) / 86400000);
  }

  function getJSON(url, ok, fail) {
    getText(url, function (txt) {
      try { ok(JSON.parse(txt)); } catch (e) { fail('Invalid response'); }
    }, fail);
  }

  function getText(url, ok, fail) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) ok(xhr.responseText);
      else fail('HTTP ' + xhr.status);
    };
    xhr.onerror = function () { fail('Network error'); };
    xhr.ontimeout = function () { fail('Timeout'); };
    xhr.send();
  }

  function markUpdated() {
    $('updated').textContent = 'Updated ' + hhmm(new Date());
  }

  // ================= Clock =================

  function tickClock() {
    var now = new Date();
    $('time').textContent = hhmm(now);
    $('date').textContent = DAYS[weekday(now)] + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
  }

  // ================= Weather (Open-Meteo, no API key) =================

  var WMO = {
    0: ['Clear', 'clear'], 1: ['Mostly clear', 'clear'], 2: ['Partly cloudy', 'partly'],
    3: ['Overcast', 'cloud'], 45: ['Fog', 'fog'], 48: ['Freezing fog', 'fog'],
    51: ['Light drizzle', 'rain'], 53: ['Drizzle', 'rain'], 55: ['Heavy drizzle', 'rain'],
    56: ['Freezing drizzle', 'rain'], 57: ['Freezing drizzle', 'rain'],
    61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
    66: ['Freezing rain', 'rain'], 67: ['Freezing rain', 'rain'],
    71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'],
    77: ['Snow grains', 'snow'], 80: ['Rain showers', 'rain'], 81: ['Rain showers', 'rain'],
    82: ['Heavy showers', 'rain'], 85: ['Snow showers', 'snow'], 86: ['Heavy snow showers', 'snow'],
    95: ['Thunderstorm', 'thunder'], 96: ['Thunderstorm with hail', 'thunder'], 99: ['Thunderstorm with hail', 'thunder']
  };

  function wmo(code) { return WMO[code] || ['–', 'cloud']; }

  var CLOUD = '<path d="M30 70h44a16 16 0 0 0 0-32 22 22 0 0 0-42-6 18 18 0 0 0-2 38z" fill="#c9d2e3"/>';

  function icon(kind, isDay) {
    var s = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">';
    if (kind === 'clear') {
      if (isDay === 0) {
        s += '<path d="M62 18a32 32 0 1 0 20 52A28 28 0 0 1 62 18z" fill="#f2d16b"/>';
      } else {
        s += '<circle cx="50" cy="50" r="20" fill="#ffc94a"/>';
        for (var i = 0; i < 8; i++) {
          var a = i * Math.PI / 4;
          s += '<line x1="' + (50 + Math.cos(a) * 28) + '" y1="' + (50 + Math.sin(a) * 28) +
               '" x2="' + (50 + Math.cos(a) * 40) + '" y2="' + (50 + Math.sin(a) * 40) +
               '" stroke="#ffc94a" stroke-width="6" stroke-linecap="round"/>';
        }
      }
    } else if (kind === 'partly') {
      s += isDay === 0
        ? '<path d="M56 10a22 22 0 1 0 14 36 19 19 0 0 1-14-36z" fill="#f2d16b"/>'
        : '<circle cx="62" cy="34" r="18" fill="#ffc94a"/>';
      s += CLOUD;
    } else if (kind === 'cloud') {
      s += CLOUD;
    } else if (kind === 'fog') {
      s += '<g stroke="#9aa6bd" stroke-width="7" stroke-linecap="round">' +
           '<line x1="18" y1="36" x2="82" y2="36"/><line x1="26" y1="52" x2="74" y2="52"/>' +
           '<line x1="18" y1="68" x2="82" y2="68"/></g>';
    } else if (kind === 'rain') {
      s += '<g transform="translate(0,-10)">' + CLOUD + '</g>' +
           '<g stroke="#5b9cff" stroke-width="6" stroke-linecap="round">' +
           '<line x1="36" y1="72" x2="32" y2="86"/><line x1="52" y1="72" x2="48" y2="86"/>' +
           '<line x1="68" y1="72" x2="64" y2="86"/></g>';
    } else if (kind === 'snow') {
      s += '<g transform="translate(0,-10)">' + CLOUD + '</g>' +
           '<g fill="#ffffff"><circle cx="34" cy="78" r="5"/><circle cx="50" cy="86" r="5"/>' +
           '<circle cx="66" cy="78" r="5"/></g>';
    } else if (kind === 'thunder') {
      s += '<g transform="translate(0,-10)">' + CLOUD + '</g>' +
           '<path d="M52 62 40 82h12l-6 16 18-24H52l6-12z" fill="#ffc94a"/>';
    }
    return s + '</svg>';
  }

  function loadWeather() {
    var url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + CONFIG.latitude + '&longitude=' + CONFIG.longitude +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&timezone=Europe%2FStockholm&forecast_days=5&wind_speed_unit=ms';

    getJSON(url, function (d) {
      var c = d.current, w = wmo(c.weather_code);
      $('weather-icon').innerHTML = icon(w[1], c.is_day);
      $('weather-temp').textContent = Math.round(c.temperature_2m) + '°';
      $('weather-desc').textContent = w[0];
      $('weather-extra').textContent = 'Feels like ' + Math.round(c.apparent_temperature) +
        '° · Wind ' + Math.round(c.wind_speed_10m) + ' m/s';

      var html = '';
      for (var i = 0; i < d.daily.time.length; i++) {
        var p = d.daily.time[i].split('-');
        var name = i === 0 ? 'Today' : DAYS_SHORT[weekday(new Date(+p[0], +p[1] - 1, +p[2]))];
        html += '<div class="fc-day"><div class="fc-name">' + name + '</div>' +
          '<div class="fc-icon">' + icon(wmo(d.daily.weather_code[i])[1], 1) + '</div>' +
          '<div class="fc-temp">' + Math.round(d.daily.temperature_2m_max[i]) + '° ' +
          '<span>' + Math.round(d.daily.temperature_2m_min[i]) + '°</span></div></div>';
      }
      $('forecast').innerHTML = html;
      markUpdated();
    }, function (err) {
      $('weather-desc').innerHTML = '<span class="error">Could not load weather (' + esc(err) + ')</span>';
    });
  }

  // ================= SL departures (Trafiklab, no API key) =================

  function lineClass(dep) {
    var mode = dep.line.transport_mode || '';
    var group = (dep.line.group_of_lines || '').toLowerCase();
    var cls = 'line mode-' + esc(mode);
    if (mode === 'METRO') {
      if (group.indexOf('grön') !== -1) cls += ' green';
      else if (group.indexOf('röd') !== -1) cls += ' red';
      else if (group.indexOf('blå') !== -1) cls += ' blue';
    } else if (mode === 'BUS' && group.indexOf('blåbuss') !== -1) {
      cls += ' bluebus';
    }
    return cls;
  }

  function wanted(dep) {
    if (CONFIG.slTransportModes.length &&
        CONFIG.slTransportModes.indexOf(dep.line.transport_mode) === -1) return false;
    if (CONFIG.slLines.length &&
        CONFIG.slLines.indexOf(String(dep.line.designation)) === -1) return false;
    return true;
  }

  function loadSl() {
    var url = 'https://transport.integration.sl.se/v1/sites/' + CONFIG.slSiteId +
      '/departures?forecast=' + CONFIG.slForecastMinutes;

    getJSON(url, function (d) {
      var deps = (d.departures || []).filter(wanted);
      deps.sort(function (a, b) { return a.expected < b.expected ? -1 : a.expected > b.expected ? 1 : 0; });
      deps = deps.slice(0, CONFIG.slMaxDepartures);

      if (!deps.length) {
        $('sl-list').innerHTML = '<div class="muted">No departures right now</div>';
      } else {
        var html = '';
        for (var i = 0; i < deps.length; i++) {
          var dep = deps[i];
          var cancelled = dep.state === 'CANCELLED';
          var display = cancelled ? 'Cancelled' : dep.display;
          var platform = dep.stop_point && dep.stop_point.designation
            ? 'Platform ' + dep.stop_point.designation : '';
          var via = dep.via ? 'via ' + dep.via : '';
          var sub = [platform, via].filter(function (x) { return x; }).join(' · ');

          html += '<div class="dep' + (cancelled ? ' cancelled' : '') + '">' +
            '<div class="' + lineClass(dep) + '">' + esc(dep.line.designation) + '</div>' +
            '<div class="dest">' + esc(dep.destination) +
              (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
            '<div class="when' + (display === 'Nu' ? ' now' : '') + '">' + esc(display) + '</div>' +
          '</div>';
        }
        $('sl-list').innerHTML = html;
      }

      // Unique deviation messages (excluding cancellations)
      var seen = {}, msgs = [];
      var all = (d.stop_deviations || []).slice();
      for (var j = 0; j < deps.length; j++) all = all.concat(deps[j].deviations || []);
      for (var k = 0; k < all.length; k++) {
        var m = all[k].message;
        if (m && !seen[m] && all[k].consequence !== 'CANCELLED') { seen[m] = 1; msgs.push(m); }
      }
      $('sl-deviations').innerHTML = msgs.slice(0, 3).map(function (m) {
        return '<div>⚠ ' + esc(m.replace(/\s+/g, ' ')) + '</div>';
      }).join('');
      markUpdated();
    }, function (err) {
      $('sl-list').innerHTML = '<div class="error">Could not load departures (' + esc(err) + ')</div>';
    });
  }

  // ================= Calendar (iCal/ICS) =================

  function parseIcsDate(v) {
    // v = '20261023' (all-day) | '20261023T090000' (floating/TZID) | '20261023T090000Z' (UTC)
    var allDay = v.length === 8;
    var y = +v.substr(0, 4), mo = +v.substr(4, 2) - 1, da = +v.substr(6, 2);
    if (allDay) return { date: new Date(y, mo, da), allDay: true };
    var h = +v.substr(9, 2), mi = +v.substr(11, 2), s = +v.substr(13, 2);
    if (v.charAt(v.length - 1) === 'Z') {
      return { date: new Date(Date.UTC(y, mo, da, h, mi, s)), allDay: false };
    }
    // TZID or floating time: interpreted as the TV's local time
    return { date: new Date(y, mo, da, h, mi, s), allDay: false };
  }

  function parseIcs(text) {
    // Unfold line continuations per RFC 5545
    var lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    var events = [], ev = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line === 'BEGIN:VEVENT') { ev = { exdates: [] }; continue; }
      if (line === 'END:VEVENT') { if (ev && ev.start) events.push(ev); ev = null; continue; }
      if (!ev) continue;
      var c = line.indexOf(':');
      if (c < 0) continue;
      var name = line.substr(0, c).split(';')[0], value = line.substr(c + 1);

      if (name === 'DTSTART') ev.start = parseIcsDate(value);
      else if (name === 'DTEND') ev.end = parseIcsDate(value);
      else if (name === 'SUMMARY') ev.title = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ');
      else if (name === 'RRULE') ev.rrule = value;
      else if (name === 'UID') ev.uid = value;
      else if (name === 'STATUS') ev.status = value;
      else if (name === 'RECURRENCE-ID') ev.recurrenceId = parseIcsDate(value);
      else if (name === 'EXDATE') {
        var parts = value.split(',');
        for (var p = 0; p < parts.length; p++) {
          ev.exdates.push(startOfDay(parseIcsDate(parts[p]).date).getTime());
        }
      }
    }
    return events;
  }

  function parseRrule(s) {
    var r = {}, parts = s.split(';');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      r[kv[0]] = kv[1];
    }
    return r;
  }

  var BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  // Returns the start date (Date) of every occurrence within [from, to)
  function occurrences(ev, from, to) {
    var start = ev.start.date;
    if (!ev.rrule) {
      var ongoing = ev.end && ev.end.date > from;
      return start < to && (start >= from || ongoing) ? [start] : [];
    }

    var r = parseRrule(ev.rrule);
    var freq = r.FREQ, interval = +(r.INTERVAL || 1);
    var until = r.UNTIL ? parseIcsDate(r.UNTIL).date : null;
    var count = r.COUNT ? +r.COUNT : null;
    var days = r.BYDAY ? r.BYDAY.split(',').map(function (d) { return BYDAY[d.slice(-2)]; })
                       : [start.getDay()];
    var startDay = startOfDay(start);
    // Monday of the start week (for WEEKLY + INTERVAL)
    var startMonday = addDays(startDay, -weekday(startDay));

    var out = [], n = 0;
    // Without COUNT we can skip straight to the window
    var cur = count ? startDay : (startOfDay(from) > startDay ? startOfDay(from) : startDay);
    var limit = 0;

    while (cur < to && limit++ < 5000) {
      var match = false, diff = dayDiff(startDay, cur);
      if (freq === 'DAILY') {
        match = diff % interval === 0;
      } else if (freq === 'WEEKLY') {
        var weeks = Math.floor(dayDiff(startMonday, cur) / 7);
        match = weeks % interval === 0 && days.indexOf(cur.getDay()) !== -1;
      } else if (freq === 'MONTHLY') {
        var months = (cur.getFullYear() - startDay.getFullYear()) * 12 + cur.getMonth() - startDay.getMonth();
        match = cur.getDate() === startDay.getDate() && months % interval === 0;
      } else if (freq === 'YEARLY') {
        match = cur.getDate() === startDay.getDate() && cur.getMonth() === startDay.getMonth() &&
                (cur.getFullYear() - startDay.getFullYear()) % interval === 0;
      }

      if (match) {
        var occ = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(),
                           start.getHours(), start.getMinutes());
        if (until && occ > until) break;
        n++;
        if (count && n > count) break;
        if (occ >= from && ev.exdates.indexOf(cur.getTime()) === -1) out.push(occ);
      }
      cur = addDays(cur, 1);
    }
    return out;
  }

  function loadCalendar() {
    if (!CONFIG.calendarIcsUrl) {
      $('calendar-panel').style.display = 'none';
      return;
    }
    getText(CONFIG.calendarIcsUrl, function (txt) {
      var events = parseIcs(txt);
      var today = startOfDay(new Date());
      var to = addDays(today, CONFIG.calendarDays);

      // Modified single occurrences replace the original on that day
      var overrides = {};
      events.forEach(function (e) {
        if (e.recurrenceId) {
          overrides[e.uid] = overrides[e.uid] || [];
          overrides[e.uid].push(startOfDay(e.recurrenceId.date).getTime());
        }
      });

      var items = [], now = new Date();
      events.forEach(function (e) {
        if (e.status === 'CANCELLED') return;
        if (e.rrule && overrides[e.uid]) e.exdates = e.exdates.concat(overrides[e.uid]);
        // Duration, so that finished meetings can be hidden
        var dur = e.end && !e.start.allDay ? e.end.date - e.start.date : 3600000;
        var occ = occurrences(e, today, to);
        for (var i = 0; i < occ.length; i++) {
          var at = occ[i], allDay = e.start.allDay;
          if (!allDay && at.getTime() + dur < now.getTime()) continue;
          items.push({
            date: at,
            allDay: allDay,
            day: startOfDay(at < today ? today : at).getTime(),
            when: allDay ? 'All day' : at < today ? 'Ongoing' : hhmm(at),
            title: e.title || '(untitled)'
          });
        }
      });

      // Day, then all-day first, then start time
      items.sort(function (a, b) { return a.day - b.day || b.allDay - a.allDay || a.date - b.date; });

      var html = '', lastDay = null;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.day !== lastDay) {
          var dd = dayDiff(today, new Date(it.day));
          html += '<div class="cal-day">' + (dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' :
                  DAYS[weekday(new Date(it.day))]) + '</div>';
          lastDay = it.day;
        }
        html += '<div class="cal-item"><div class="cal-time">' + it.when + '</div>' +
          '<div class="cal-title">' + esc(it.title) + '</div></div>';
      }
      $('calendar-list').innerHTML = html || '<div class="muted">Nothing scheduled</div>';
    }, function (err) {
      $('calendar-list').innerHTML = '<div class="error">Could not load calendar (' + esc(err) + ')</div>';
    });
  }

  // ================= Remote control =================

  function refreshAll() {
    loadWeather();
    loadSl();
    loadCalendar();
  }

  document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
      case 13:     // OK
        refreshAll();
        break;
      case 10009:  // Back
        try { tizen.application.getCurrentApplication().exit(); } catch (err) {}
        break;
    }
  });

  // ================= Start =================

  function disableScreenSaver() {
    try {
      webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF);
    } catch (e) { /* not on a TV */ }
  }

  function init() {
    $('weather-place').textContent = CONFIG.place;
    $('sl-site').textContent = CONFIG.slSiteName;

    disableScreenSaver();
    tickClock();
    refreshAll();

    setInterval(tickClock, 1000);
    setInterval(loadWeather, CONFIG.refreshWeather * 1000);
    setInterval(loadSl, CONFIG.refreshSl * 1000);
    setInterval(loadCalendar, CONFIG.refreshCalendar * 1000);

    // Refresh immediately when the app returns to the foreground
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { disableScreenSaver(); refreshAll(); }
    });
  }

  init();
})();
