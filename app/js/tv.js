/*
 * Tunn omslagsmodul runt Samsungs Tizen-API:er: tvwindow, tvchannel, application, tvinputdevice.
 * Allt är inslaget i try/catch så att appen fungerar i Chrome (med test/mock-tizen.js) och
 * på TV:ar som saknar t.ex. programguide. Ren ES5.
 */
var TV = (function () {
  'use strict';

  var available = typeof tizen !== 'undefined' && !!tizen.tvwindow;
  var hasChannel = typeof tizen !== 'undefined' && !!tizen.tvchannel;
  var hasApps = typeof tizen !== 'undefined' && !!tizen.application;

  var KEY_CH_UP = 427, KEY_CH_DOWN = 428;
  var windowShown = false;
  var currentRect = null;
  var zPosition = 'BEHIND';     // bild bakom sidan; sidan är genomskinlig där bilden ska synas
  var tunerSelected = false;
  var channelListeners = [];
  var epgAvailable = null;      // null = okänt, true/false efter första försöket

  // ---------- TV-fönster ----------

  function showWindow(rect, cb) {
    if (!available) { if (cb) cb(false); return; }
    var r = [rect[0] + 'px', rect[1] + 'px', rect[2] + 'px', rect[3] + 'px'];
    var go = function () {
      try {
        tizen.tvwindow.show(function () {
          windowShown = true;
          currentRect = rect;
          if (cb) cb(true);
        }, function (e) {
          // Äldre firmware kan sakna BEHIND: fall tillbaka till FRONT
          if (zPosition === 'BEHIND') {
            zPosition = 'FRONT';
            go();
          } else if (cb) cb(false, e && e.message ? e.message : String(e));
        }, r, 'MAIN', zPosition);
      } catch (e) {
        if (cb) cb(false, e && e.message ? e.message : String(e));
      }
    };
    if (tunerSelected) go();
    else selectTuner(function () { tunerSelected = true; go(); });
  }

  function hideWindow(cb) {
    windowShown = false;
    currentRect = null;
    if (!available) { if (cb) cb(); return; }
    try {
      tizen.tvwindow.hide(function () { if (cb) cb(); }, function () { if (cb) cb(); }, 'MAIN');
    } catch (e) { if (cb) cb(); }
  }

  // Välj TV-tunern (inte HDMI) som källa innan fönstret visas
  function selectTuner(next) {
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (vs) {
        var list = (vs && vs.connected) || [], tuner = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].type === 'TV') { tuner = list[i]; break; }
        }
        if (!tuner) { next(); return; }
        try {
          tizen.tvwindow.setSource(tuner, function () { next(); }, function () { next(); }, 'MAIN');
        } catch (e) { next(); }
      }, function () { next(); });
    } catch (e) { next(); }
  }

  // ---------- Kanaler ----------

  function channelLabel(ch) {
    if (!ch) return '';
    var num = ch.major != null ? String(ch.major) : '';
    if (ch.minor != null && ch.minor > 0) num += '.' + ch.minor;
    return num;
  }

  function sameChannel(a, b) {
    if (!a || !b) return false;
    if (a.programNumber != null && b.programNumber != null && a.sourceID != null && b.sourceID != null) {
      return a.programNumber === b.programNumber && a.sourceID === b.sourceID &&
             a.major === b.major && a.minor === b.minor;
    }
    return a.major === b.major && a.minor === b.minor && a.channelName === b.channelName;
  }

  function getChannels(cb) {
    if (!hasChannel) { cb([]); return; }
    try {
      tizen.tvchannel.getChannelList(function (list) {
        cb(list || []);
      }, function () { cb([]); }, 'ALL', 0, 500);
    } catch (e) { cb([]); }
  }

  function getCurrentChannel() {
    if (!hasChannel) return null;
    try { return tizen.tvchannel.getCurrentChannel('MAIN'); } catch (e) { return null; }
  }

  function tuneCallbacks(cb) {
    return {
      onsuccess: function (ch) { if (cb) cb(true, ch); },
      onnosignal: function () { if (cb) cb(false, null, 'Ingen signal'); },
      onprograminforeceived: function () {}
    };
  }

  function tune(ch, cb) {
    if (!hasChannel) { if (cb) cb(false, null, 'Ingen TV'); return; }
    var opt = {};
    var keys = ['major', 'minor', 'ptc', 'sourceID', 'programNumber', 'transportStreamID', 'originalNetworkID'];
    for (var i = 0; i < keys.length; i++) if (ch[keys[i]] != null) opt[keys[i]] = ch[keys[i]];
    try {
      tizen.tvchannel.tune(opt, tuneCallbacks(cb), function (e) {
        if (cb) cb(false, null, e && e.message ? e.message : 'Kunde inte byta kanal');
      }, 'MAIN');
    } catch (e) {
      if (cb) cb(false, null, 'Kanalbyte stöds inte');
    }
  }

  function tuneStep(up, cb) {
    if (!hasChannel) { if (cb) cb(false, null, 'Ingen TV'); return; }
    var fail = function () { if (cb) cb(false, null, 'Kunde inte byta kanal'); };
    try {
      if (up) tizen.tvchannel.tuneUp(tuneCallbacks(cb), fail, 'ALL', 'MAIN');
      else tizen.tvchannel.tuneDown(tuneCallbacks(cb), fail, 'ALL', 'MAIN');
    } catch (e) { fail(); }
  }

  function onChannelChange(fn) {
    channelListeners.push(fn);
  }

  function fireChannelChange(ch) {
    for (var i = 0; i < channelListeners.length; i++) {
      try { channelListeners[i](ch); } catch (e) {}
    }
  }

  // ---------- Programguide (EPG) ----------

  // tizen.TZDate -> JS Date (fungerar också om det redan är en Date, som i mocken)
  function tzToDate(t) {
    if (!t) return null;
    if (t instanceof Date) return t;
    try {
      var l = typeof t.toLocalTimezone === 'function' ? t.toLocalTimezone() : t;
      return new Date(l.getFullYear(), l.getMonth(), l.getDate(), l.getHours(), l.getMinutes(), l.getSeconds());
    } catch (e) { return null; }
  }

  function normalizeProgram(p) {
    if (!p) return null;
    var start = tzToDate(p.startTime);
    if (!start) return null;
    var dur = p.duration || 0; // sekunder
    return {
      title: p.title || '',
      detail: p.detailedTitle || p.detail || '',
      start: start,
      end: new Date(start.getTime() + dur * 1000),
      duration: dur
    };
  }

  function getCurrentProgram() {
    if (!hasChannel) return null;
    try {
      var p = normalizeProgram(tizen.tvchannel.getCurrentProgram('MAIN'));
      if (p && p.title) { epgAvailable = true; return p; }
      if (epgAvailable === null) epgAvailable = false;
      return null;
    } catch (e) {
      if (epgAvailable === null) epgAvailable = false;
      return null;
    }
  }

  // Kommande program på en kanal (max `n`), via getProgramList
  function getUpcoming(ch, n, cb) {
    if (!hasChannel || !ch) { cb([]); return; }
    try {
      var start = new tizen.TZDate(new Date());
      tizen.tvchannel.getProgramList(ch, start, function (list) {
        var now = new Date(), out = [];
        for (var i = 0; i < (list || []).length; i++) {
          var p = normalizeProgram(list[i]);
          if (p && p.title && p.end > now) out.push(p);
        }
        out.sort(function (a, b) { return a.start - b.start; });
        // Hoppa över det som pågår just nu
        var cur = [];
        for (var j = 0; j < out.length; j++) {
          if (out[j].start > now || cur.length) cur.push(out[j]);
          if (cur.length >= n) break;
        }
        epgAvailable = epgAvailable || out.length > 0;
        cb(cur);
      }, function () { cb([]); }, 6 * 3600, 'MAIN');
    } catch (e) { cb([]); }
  }

  // ---------- Appar ----------

  function getApps(cb) {
    if (!hasApps || typeof tizen.application.getAppsInfo !== 'function') { cb([]); return; }
    try {
      tizen.application.getAppsInfo(function (infos) {
        var out = [];
        for (var i = 0; i < (infos || []).length; i++) {
          out.push({ id: infos[i].id, name: infos[i].name || '', packageId: infos[i].packageId || '' });
        }
        cb(out);
      }, function () { cb([]); });
    } catch (e) { cb([]); }
  }

  function launchApp(id, ok, fail) {
    if (!hasApps) { if (fail) fail('Ingen TV'); return; }
    try {
      tizen.application.launch(id, function () { if (ok) ok(); }, function (e) {
        if (fail) fail(e && e.message ? e.message : 'Kunde inte starta');
      });
    } catch (e) { if (fail) fail(e && e.message ? e.message : 'Kunde inte starta'); }
  }

  function exitApp() {
    try { tizen.application.getCurrentApplication().exit(); } catch (e) {}
  }

  // ---------- Fjärrkontroll ----------

  function registerKeys() {
    try {
      tizen.tvinputdevice.registerKey('ChannelUp');
      tizen.tvinputdevice.registerKey('ChannelDown');
      KEY_CH_UP = tizen.tvinputdevice.getKey('ChannelUp').code;
      KEY_CH_DOWN = tizen.tvinputdevice.getKey('ChannelDown').code;
    } catch (e) {}
    try {
      tizen.tvchannel.addChannelChangeListener(function (ch) { fireChannelChange(ch); }, 'MAIN');
    } catch (e) {}
  }

  function disableScreenSaver() {
    try {
      webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF);
    } catch (e) { /* inte på en TV */ }
  }

  return {
    available: available,
    hasChannel: hasChannel,
    hasApps: hasApps,
    keyChUp: function () { return KEY_CH_UP; },
    keyChDown: function () { return KEY_CH_DOWN; },
    showWindow: showWindow,
    hideWindow: hideWindow,
    isWindowShown: function () { return windowShown; },
    windowRect: function () { return currentRect; },
    zPosition: function () { return zPosition; },
    channelLabel: channelLabel,
    sameChannel: sameChannel,
    getChannels: getChannels,
    getCurrentChannel: getCurrentChannel,
    tune: tune,
    tuneUp: function (cb) { tuneStep(true, cb); },
    tuneDown: function (cb) { tuneStep(false, cb); },
    onChannelChange: onChannelChange,
    getCurrentProgram: getCurrentProgram,
    getUpcoming: getUpcoming,
    epgAvailable: function () { return epgAvailable; },
    getApps: getApps,
    launchApp: launchApp,
    exitApp: exitApp,
    registerKeys: registerKeys,
    disableScreenSaver: disableScreenSaver
  };
})();
