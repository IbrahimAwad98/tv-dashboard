/*
 * Datakällor: väder (Open-Meteo), SL-avgångar (Trafiklab) och kalender (iCal/ICS).
 * Ren ES5. Alla anrop via XMLHttpRequest. Resultaten sparas i Api.state och
 * prenumeranter får besked via Api.on('weather' | 'sl' | 'calendar', fn).
 */
var Api = (function () {
  'use strict';

  var U = Util;

  var state = { weather: null, sl: null, calendar: null, errors: {} };
  var listeners = {};

  function on(topic, fn) {
    (listeners[topic] = listeners[topic] || []).push(fn);
  }
  function emit(topic) {
    var list = listeners[topic] || [];
    for (var i = 0; i < list.length; i++) {
      try { list[i](state[topic]); } catch (e) { /* en trasig vy ska inte stoppa övriga */ }
    }
  }

  // ---------- HTTP ----------

  function getText(url, ok, fail) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) ok(xhr.responseText);
      else fail('HTTP ' + xhr.status);
    };
    xhr.onerror = function () { fail('Nätverksfel'); };
    xhr.ontimeout = function () { fail('Timeout'); };
    xhr.send();
  }

  function getJSON(url, ok, fail) {
    getText(url, function (txt) {
      var data;
      try { data = JSON.parse(txt); } catch (e) { fail('Ogiltigt svar'); return; }
      ok(data);
    }, fail);
  }

  // ---------- Väder ----------

  var WMO = {
    0: ['Klart', 'clear'], 1: ['Mest klart', 'clear'], 2: ['Halvklart', 'partly'],
    3: ['Mulet', 'cloud'], 45: ['Dimma', 'fog'], 48: ['Underkyld dimma', 'fog'],
    51: ['Lätt duggregn', 'rain'], 53: ['Duggregn', 'rain'], 55: ['Tätt duggregn', 'rain'],
    56: ['Underkylt duggregn', 'rain'], 57: ['Underkylt duggregn', 'rain'],
    61: ['Lätt regn', 'rain'], 63: ['Regn', 'rain'], 65: ['Kraftigt regn', 'rain'],
    66: ['Underkylt regn', 'rain'], 67: ['Underkylt regn', 'rain'],
    71: ['Lätt snöfall', 'snow'], 73: ['Snöfall', 'snow'], 75: ['Kraftigt snöfall', 'snow'],
    77: ['Snökorn', 'snow'], 80: ['Regnskurar', 'rain'], 81: ['Regnskurar', 'rain'],
    82: ['Kraftiga skurar', 'rain'], 85: ['Snöbyar', 'snow'], 86: ['Kraftiga snöbyar', 'snow'],
    95: ['Åska', 'thunder'], 96: ['Åska med hagel', 'thunder'], 99: ['Åska med hagel', 'thunder']
  };
  function wmo(code) { return WMO[code] || ['–', 'cloud']; }

  function loadWeather() {
    var url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + CONFIG.latitude + '&longitude=' + CONFIG.longitude +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&timezone=Europe%2FStockholm&forecast_days=5&wind_speed_unit=ms';

    getJSON(url, function (d) {
      var c = d.current, w = wmo(c.weather_code);
      var days = [];
      for (var i = 0; i < d.daily.time.length; i++) {
        var p = d.daily.time[i].split('-');
        var date = new Date(+p[0], +p[1] - 1, +p[2]);
        var dw = wmo(d.daily.weather_code[i]);
        days.push({
          date: date,
          name: i === 0 ? 'Idag' : i === 1 ? 'Imorgon' : U.DAYS_SHORT[U.weekday(date)],
          desc: dw[0], kind: dw[1],
          max: Math.round(d.daily.temperature_2m_max[i]),
          min: Math.round(d.daily.temperature_2m_min[i])
        });
      }
      state.weather = {
        temp: Math.round(c.temperature_2m),
        feels: Math.round(c.apparent_temperature),
        wind: Math.round(c.wind_speed_10m),
        isDay: c.is_day,
        desc: w[0], kind: w[1],
        days: days,
        updated: new Date()
      };
      state.errors.weather = null;
      emit('weather');
    }, function (err) {
      state.errors.weather = err;
      emit('weather');
    });
  }

  // ---------- SL-avgångar ----------

  function wanted(dep) {
    if (CONFIG.slTransportModes.length &&
        CONFIG.slTransportModes.indexOf(dep.line.transport_mode) === -1) return false;
    if (CONFIG.slLines.length &&
        CONFIG.slLines.indexOf(String(dep.line.designation)) === -1) return false;
    return true;
  }

  // "10 min" -> 10, "Nu" -> 0, "20:31" -> minuter kvar
  function minutesUntil(dep, now) {
    var t = dep.expected || dep.scheduled;
    if (!t) return null;
    var p = t.split(/[-T:]/);
    var d = new Date(+p[0], +p[1] - 1, +p[2], +p[3], +p[4], +(p[5] || 0));
    return Math.max(0, Math.round((d - now) / 60000));
  }

  function loadSl() {
    var url = 'https://transport.integration.sl.se/v1/sites/' + CONFIG.slSiteId +
      '/departures?forecast=' + CONFIG.slForecastMinutes;
    if (CONFIG.slTransportModes.length === 1) url += '&transport=' + CONFIG.slTransportModes[0];

    getJSON(url, function (d) {
      var now = new Date();
      var deps = (d.departures || []).filter(wanted);
      deps.sort(function (a, b) { return a.expected < b.expected ? -1 : a.expected > b.expected ? 1 : 0; });

      var list = [];
      for (var i = 0; i < deps.length; i++) {
        var dep = deps[i];
        var cancelled = dep.state === 'CANCELLED';
        list.push({
          line: String(dep.line.designation),
          mode: dep.line.transport_mode || '',
          group: dep.line.group_of_lines || '',
          destination: dep.destination || '',
          direction: dep.direction || '',
          platform: dep.stop_point && dep.stop_point.designation ? String(dep.stop_point.designation) : '',
          display: cancelled ? 'Inställd' : (dep.display || ''),
          minutes: minutesUntil(dep, now),
          cancelled: cancelled,
          time: (dep.expected || dep.scheduled || '').substr(11, 5)
        });
      }

      // Unika störningsmeddelanden (ej inställda turer)
      var seen = {}, msgs = [];
      var all = (d.stop_deviations || []).slice();
      for (var j = 0; j < deps.length; j++) all = all.concat(deps[j].deviations || []);
      for (var k = 0; k < all.length; k++) {
        var m = all[k].message;
        if (m && !seen[m] && all[k].consequence !== 'CANCELLED') { seen[m] = 1; msgs.push(m.replace(/\s+/g, ' ')); }
      }

      state.sl = { departures: list, deviations: msgs, updated: now };
      state.errors.sl = null;
      emit('sl');
    }, function (err) {
      state.errors.sl = err;
      emit('sl');
    });
  }

  // ---------- Kalender (iCal/ICS) ----------

  function parseIcsDate(v) {
    // v = '20261023' (heldag) | '20261023T090000' (flytande/TZID) | '20261023T090000Z' (UTC)
    var allDay = v.length === 8;
    var y = +v.substr(0, 4), mo = +v.substr(4, 2) - 1, da = +v.substr(6, 2);
    if (allDay) return { date: new Date(y, mo, da), allDay: true };
    var h = +v.substr(9, 2), mi = +v.substr(11, 2), s = +v.substr(13, 2);
    if (v.charAt(v.length - 1) === 'Z') {
      return { date: new Date(Date.UTC(y, mo, da, h, mi, s)), allDay: false };
    }
    // TZID eller flytande tid: tolkas som TV:ns lokala tid
    return { date: new Date(y, mo, da, h, mi, s), allDay: false };
  }

  function parseIcs(text) {
    // Vik upp radfortsättningar enligt RFC 5545
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
          ev.exdates.push(U.startOfDay(parseIcsDate(parts[p]).date).getTime());
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

  // Startdatum (Date) för varje förekomst inom [from, to)
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
    var startDay = U.startOfDay(start);
    // Måndagen i startveckan (för WEEKLY + INTERVAL)
    var startMonday = U.addDays(startDay, -U.weekday(startDay));

    var out = [], n = 0;
    // Utan COUNT kan vi hoppa direkt till fönstret
    var cur = count ? startDay : (U.startOfDay(from) > startDay ? U.startOfDay(from) : startDay);
    var limit = 0;

    while (cur < to && limit++ < 5000) {
      var match = false, diff = U.dayDiff(startDay, cur);
      if (freq === 'DAILY') {
        match = diff % interval === 0;
      } else if (freq === 'WEEKLY') {
        var weeks = Math.floor(U.dayDiff(startMonday, cur) / 7);
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
      cur = U.addDays(cur, 1);
    }
    return out;
  }

  // Plattar ut händelserna till en sorterad lista för de närmaste `days` dagarna
  function upcoming(events, days) {
    var today = U.startOfDay(new Date());
    var to = U.addDays(today, days);

    // Ändrade enskilda förekomster ersätter originalet den dagen
    var overrides = {};
    events.forEach(function (e) {
      if (e.recurrenceId) {
        overrides[e.uid] = overrides[e.uid] || [];
        overrides[e.uid].push(U.startOfDay(e.recurrenceId.date).getTime());
      }
    });

    var items = [], now = new Date();
    events.forEach(function (e) {
      if (e.status === 'CANCELLED') return;
      var exdates = e.exdates;
      if (e.rrule && overrides[e.uid]) exdates = exdates.concat(overrides[e.uid]);
      var ev = { start: e.start, end: e.end, rrule: e.rrule, exdates: exdates };
      // Längd, så att avslutade möten kan döljas
      var dur = e.end && !e.start.allDay ? e.end.date - e.start.date : 3600000;
      var occ = occurrences(ev, today, to);
      for (var i = 0; i < occ.length; i++) {
        var at = occ[i], allDay = e.start.allDay;
        if (!allDay && at.getTime() + dur < now.getTime()) continue;
        var day = U.startOfDay(at < today ? today : at);
        items.push({
          date: at,
          allDay: allDay,
          day: day.getTime(),
          dayLabel: U.relativeDay(day, today),
          when: allDay ? 'Heldag' : at < today ? 'Pågår' : U.hhmm(at),
          title: e.title || '(utan titel)'
        });
      }
    });

    // Dag, sedan heldag först, sedan starttid
    items.sort(function (a, b) { return a.day - b.day || b.allDay - a.allDay || a.date - b.date; });
    return items;
  }

  function loadCalendar() {
    if (!CONFIG.calendarIcsUrl) {
      state.calendar = { configured: false, events: [], items: [] };
      emit('calendar');
      return;
    }
    getText(CONFIG.calendarIcsUrl, function (txt) {
      var events = parseIcs(txt);
      state.calendar = {
        configured: true,
        events: events,
        items: upcoming(events, 7),
        updated: new Date()
      };
      state.errors.calendar = null;
      emit('calendar');
    }, function (err) {
      state.errors.calendar = err;
      emit('calendar');
    });
  }

  // ---------- Hjälpare för vyerna ----------

  function nextDepartures(n) {
    if (!state.sl) return [];
    var out = [];
    for (var i = 0; i < state.sl.departures.length && out.length < n; i++) {
      if (!state.sl.departures[i].cancelled) out.push(state.sl.departures[i]);
    }
    return out;
  }

  function calendarItems(days, max) {
    if (!state.calendar) return [];
    var today = U.startOfDay(new Date());
    var limit = U.addDays(today, days).getTime();
    var out = [];
    for (var i = 0; i < state.calendar.items.length && out.length < max; i++) {
      if (state.calendar.items[i].day < limit) out.push(state.calendar.items[i]);
    }
    return out;
  }

  function refreshAll() {
    loadWeather();
    loadSl();
    loadCalendar();
  }

  function start() {
    refreshAll();
    setInterval(loadWeather, CONFIG.refreshWeather * 1000);
    setInterval(loadSl, CONFIG.refreshSl * 1000);
    setInterval(loadCalendar, CONFIG.refreshCalendar * 1000);
  }

  return {
    state: state,
    on: on,
    start: start,
    refreshAll: refreshAll,
    loadWeather: loadWeather,
    loadSl: loadSl,
    loadCalendar: loadCalendar,
    nextDepartures: nextDepartures,
    calendarItems: calendarItems,
    // exponerade för test.js
    parseIcs: parseIcs,
    occurrences: occurrences,
    upcoming: upcoming
  };
})();
