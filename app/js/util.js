/*
 * Gemensamma hjälpfunktioner – ES5 (Chromium 47 / Tizen 3.0).
 */
var Util = (function () {
  'use strict';

  // Veckan börjar på måndag; indexera med weekday(), inte getDay()
  var DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
  var DAYS_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
  var MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli',
                'augusti', 'september', 'oktober', 'november', 'december'];

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
    // Antal hela dagar från a till b (DST-säkert via UTC)
    var ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((ub - ua) / 86400000);
  }

  // "Fredag 6 november"
  function longDate(d) {
    return DAYS[weekday(d)] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  // "Idag" / "Imorgon" / veckodag
  function relativeDay(d, today) {
    var diff = dayDiff(today, d);
    if (diff === 0) return 'Idag';
    if (diff === 1) return 'Imorgon';
    return DAYS[weekday(d)];
  }

  function greeting(d) {
    var h = d.getHours();
    if (h >= 5 && h < 10) return 'God morgon';
    if (h >= 10 && h < 17) return 'God dag';
    return 'God kväll';
  }

  // ---- Väderikoner (inline SVG) ----
  var CLOUD = '<path d="M30 70h44a16 16 0 0 0 0-32 22 22 0 0 0-42-6 18 18 0 0 0-2 38z" fill="#C9D2E3"/>';
  var SUN = '#F5B544';

  function weatherIcon(kind, isDay) {
    var s = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">';
    if (kind === 'clear') {
      if (isDay === 0) {
        s += '<path d="M62 18a32 32 0 1 0 20 52A28 28 0 0 1 62 18z" fill="' + SUN + '"/>';
      } else {
        s += '<circle cx="50" cy="50" r="20" fill="' + SUN + '"/>';
        for (var i = 0; i < 8; i++) {
          var a = i * Math.PI / 4;
          s += '<line x1="' + (50 + Math.cos(a) * 28) + '" y1="' + (50 + Math.sin(a) * 28) +
               '" x2="' + (50 + Math.cos(a) * 40) + '" y2="' + (50 + Math.sin(a) * 40) +
               '" stroke="' + SUN + '" stroke-width="6" stroke-linecap="round"/>';
        }
      }
    } else if (kind === 'partly') {
      s += isDay === 0
        ? '<path d="M56 10a22 22 0 1 0 14 36 19 19 0 0 1-14-36z" fill="' + SUN + '"/>'
        : '<circle cx="62" cy="34" r="18" fill="' + SUN + '"/>';
      s += CLOUD;
    } else if (kind === 'cloud') {
      s += CLOUD;
    } else if (kind === 'fog') {
      s += '<g stroke="#9AA6BD" stroke-width="7" stroke-linecap="round">' +
           '<line x1="18" y1="36" x2="82" y2="36"/><line x1="26" y1="52" x2="74" y2="52"/>' +
           '<line x1="18" y1="68" x2="82" y2="68"/></g>';
    } else if (kind === 'rain') {
      s += '<g transform="translate(0,-10)">' + CLOUD + '</g>' +
           '<g stroke="#5B9CFF" stroke-width="6" stroke-linecap="round">' +
           '<line x1="36" y1="72" x2="32" y2="86"/><line x1="52" y1="72" x2="48" y2="86"/>' +
           '<line x1="68" y1="72" x2="64" y2="86"/></g>';
    } else if (kind === 'snow') {
      s += '<g transform="translate(0,-10)">' + CLOUD + '</g>' +
           '<g fill="#FFFFFF"><circle cx="34" cy="78" r="5"/><circle cx="50" cy="86" r="5"/>' +
           '<circle cx="66" cy="78" r="5"/></g>';
    } else if (kind === 'thunder') {
      s += '<g transform="translate(0,-10)">' + CLOUD + '</g>' +
           '<path d="M52 62 40 82h12l-6 16 18-24H52l6-12z" fill="' + SUN + '"/>';
    }
    return s + '</svg>';
  }

  // ---- Små UI-ikoner (inline SVG, 24x24, stroke = currentColor) ----
  var ICONS = {
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    apps: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/>' +
          '<rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l-2-4M15 21l2-4"/>' +
           '<circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 18z"/>',
    play: '<path d="M7 4l12 8-12 8z"/>',
    youtube: '<path d="M22 8.5a3 3 0 0 0-2-2C18 6 12 6 12 6s-6 0-8 .5a3 3 0 0 0-2 2A31 31 0 0 0 1.7 12 31 31 0 0 0 2 15.5a3 3 0 0 0 2 2c2 .5 8 .5 8 .5s6 0 8-.5a3 3 0 0 0 2-2 31 31 0 0 0 .3-3.5 31 31 0 0 0-.3-3.5z"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    film: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    up: '<path d="M5 15l7-7 7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    back: '<path d="M10 6L4 12l6 6M4 12h16"/>',
    channel: '<path d="M7 4v16M17 4v16M4 8h6M14 8h6M4 16h6M14 16h6"/>'
  };

  function icon(name, size) {
    size = size || 24;
    return '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[name] || '') + '</svg>';
  }

  // ---- Toast ----
  var toastTimer = null;
  function toast(msg, ms) {
    var el = $('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = ''; }, ms || 2500);
  }

  // Byt ut delar av en flaggad lista till plain-text (för kanalnummer etc.)
  function text(id, value) {
    var el = $(id);
    if (el) el.textContent = value == null ? '' : String(value);
  }
  function html(id, value) {
    var el = $(id);
    if (el) el.innerHTML = value == null ? '' : String(value);
  }

  return {
    DAYS: DAYS, DAYS_SHORT: DAYS_SHORT, MONTHS: MONTHS,
    $: $, weekday: weekday, pad: pad, hhmm: hhmm, esc: esc,
    startOfDay: startOfDay, addDays: addDays, dayDiff: dayDiff,
    longDate: longDate, relativeDay: relativeDay, greeting: greeting,
    weatherIcon: weatherIcon, icon: icon, toast: toast, text: text, html: html
  };
})();
