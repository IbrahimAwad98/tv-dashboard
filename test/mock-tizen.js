/*
 * Mock av Samsungs Tizen-API:er så att appen går att köra i Chrome (test.html).
 * Mockar tizen.tvwindow, tizen.tvchannel, tizen.application, tizen.tvinputdevice,
 * tizen.systeminfo och tizen.TZDate, samt en fejkad kalender (ICS) och tangentbord:
 *   Piltangenter = pilar, Enter = OK, Backspace/Esc = Tillbaka, PageUp/PageDown = CH+/CH−.
 * Ren ES5 (så att även detta kan köras på TV:n om man vill).
 */
(function () {
  'use strict';

  var CHANNELS = [
    [1, 'SVT1 HD'], [2, 'SVT2 HD'], [3, 'TV3'], [4, 'TV4 HD'], [5, 'Kanal 5'], [6, 'TV6'],
    [7, 'Sjuan'], [8, 'TV8'], [9, 'Kanal 9'], [10, 'TV10'], [11, 'TV12'], [12, 'SVT Barn'],
    [13, 'Kunskapskanalen'], [14, 'TV4 Fakta'], [15, 'Discovery']
  ];
  var PROGRAMS = ['Rapport', 'Sportnytt', 'Lokala nyheter', 'På spåret', 'Antikrundan', 'Nyheterna',
    'Idol', 'Bonde söker fru', 'Vem vet mest?', 'Aktuellt', 'Uppdrag granskning', 'Film: Fjällbackamorden',
    'Dokument utifrån', 'Gokväll', 'Hemmahos'];

  function makeChannel(i) {
    return {
      major: CHANNELS[i][0], minor: 0, channelName: CHANNELS[i][1], ptc: 100 + i,
      sourceID: 1, programNumber: 1000 + i, transportStreamID: 1, originalNetworkID: 1,
      lcn: CHANNELS[i][0], serviceName: CHANNELS[i][1], channelType: 'TV'
    };
  }
  var channels = [];
  for (var c = 0; c < CHANNELS.length; c++) channels.push(makeChannel(c));
  var currentIndex = 0;
  var changeListeners = [];

  // Program: 30-minutersblock med start på hel/halv timme, titel beror på kanal + block
  function programAt(chIdx, t) {
    var block = Math.floor(t / (30 * 60000));
    var start = new Date(block * 30 * 60000);
    return {
      title: PROGRAMS[(chIdx * 7 + block) % PROGRAMS.length],
      detailedTitle: '',
      startTime: start,
      duration: 30 * 60
    };
  }

  var mockVideo = null;
  function ensureVideo() {
    if (mockVideo) return mockVideo;
    mockVideo = document.createElement('div');
    mockVideo.id = 'mock-video';
    mockVideo.style.cssText = 'position:absolute;z-index:0;display:none;background:#000 ' +
      'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#1a2a3a"/>' +
        '<circle cx="11" cy="3" r="1.4" fill="#f5b544"/><path d="M0 9L4 5l3 2 4-4 5 6z" fill="#2f4858"/></svg>') +
      '") center/cover no-repeat;color:#fff;font:600 40px Inter,sans-serif';
    document.body.insertBefore(mockVideo, document.body.firstChild);
    return mockVideo;
  }
  function labelVideo() {
    if (mockVideo) mockVideo.innerHTML = '<div style="position:absolute;left:24px;top:24px;opacity:.7">MOCK TV · ' +
      channels[currentIndex].channelName + '</div>';
  }

  function tuneIndex(i, cbs) {
    currentIndex = (i + channels.length) % channels.length;
    labelVideo();
    var ch = channels[currentIndex];
    setTimeout(function () {
      if (cbs && cbs.onsuccess) cbs.onsuccess(ch);
      for (var k = 0; k < changeListeners.length; k++) changeListeners[k](ch, 'MAIN');
    }, 120);
  }

  function TZDate(d) { this._d = d instanceof Date ? d : new Date(); }
  TZDate.prototype.toLocalTimezone = function () { return this._d; };

  var apps = [
    { id: 'org.tizen.browser', name: 'Internet' },
    { id: '111299001912.YouTube', name: 'YouTube' },
    { id: '3201611010983.SVTPlay', name: 'SVT Play' },
    { id: '11101200001.Netflix', name: 'Netflix' },
    { id: '3201606009684.Spotify', name: 'Spotify' }
    // TV4 Play saknas med flit: ska inte visas på startskärmen
  ];

  window.tizen = {
    TZDate: TZDate,
    tvwindow: {
      show: function (ok, err, rect, type, z) {
        var v = ensureVideo();
        v.style.left = rect[0]; v.style.top = rect[1]; v.style.width = rect[2]; v.style.height = rect[3];
        v.style.display = 'block';
        labelVideo();
        console.log('[mock] tvwindow.show', rect.join(','), type, z);
        setTimeout(function () { ok(rect); }, 50);
      },
      hide: function (ok) { if (mockVideo) mockVideo.style.display = 'none'; console.log('[mock] tvwindow.hide'); setTimeout(ok, 20); },
      setSource: function (src, ok) { setTimeout(ok, 20); }
    },
    tvchannel: {
      getChannelList: function (ok, err, mode, start, n) { setTimeout(function () { ok(channels.slice(start || 0, (start || 0) + (n || 100))); }, 80); },
      getCurrentChannel: function () { return channels[currentIndex]; },
      tune: function (opt, cbs) {
        for (var i = 0; i < channels.length; i++) {
          if (channels[i].major === opt.major && channels[i].programNumber === opt.programNumber) { tuneIndex(i, cbs); return; }
        }
        tuneIndex(0, cbs);
      },
      tuneUp: function (cbs) { tuneIndex(currentIndex + 1, cbs); },
      tuneDown: function (cbs) { tuneIndex(currentIndex - 1, cbs); },
      getCurrentProgram: function () { return programAt(currentIndex, Date.now()); },
      getProgramList: function (ch, start, ok, err, duration) {
        var idx = 0;
        for (var i = 0; i < channels.length; i++) if (channels[i].major === ch.major) idx = i;
        var t = Date.now(), list = [];
        for (var k = 0; k < 6; k++) list.push(programAt(idx, t + k * 30 * 60000));
        setTimeout(function () { ok(list); }, 60);
      },
      addChannelChangeListener: function (fn) { changeListeners.push(fn); return 1; }
    },
    application: {
      getAppsInfo: function (ok) { setTimeout(function () { ok(apps.slice()); }, 100); },
      launch: function (id, ok, err) {
        console.log('[mock] application.launch ' + id);
        var found = false;
        for (var i = 0; i < apps.length; i++) if (apps[i].id === id) found = true;
        setTimeout(function () { if (found) ok(); else err({ message: 'NotFoundError' }); }, 100);
      },
      getCurrentApplication: function () { return { exit: function () { console.log('[mock] exit()'); document.title = 'Appen avslutades'; } }; }
    },
    tvinputdevice: {
      registerKey: function () {},
      getKey: function (name) { return { code: name === 'ChannelUp' ? 427 : 428 }; }
    },
    systeminfo: {
      getPropertyValue: function (prop, ok) { setTimeout(function () { ok({ connected: [{ type: 'TV', number: 0 }] }); }, 10); }
    }
  };
  window.webapis = { appcommon: { setScreenSaver: function () {}, AppCommonScreenSaverState: { SCREEN_SAVER_OFF: 0 } } };

  // ---- Fejkad kalender: svarar på URL:er som börjar med "mock://" ----
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ics(d, h) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + (h == null ? '' : 'T' + pad(h) + '0000'); }
  var today = new Date(), tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  var day3 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
  var soon = Math.min(22, today.getHours() + 1);
  var MOCK_ICS = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'UID:1', 'DTSTART:' + ics(today, soon), 'DTEND:' + ics(today, Math.min(23, soon + 1)), 'SUMMARY:Kvällspromenad', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:2', 'DTSTART;VALUE=DATE:' + ics(tomorrow), 'DTEND;VALUE=DATE:' + ics(day3), 'SUMMARY:Semester', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:3', 'DTSTART:' + ics(tomorrow, 9), 'DTEND:' + ics(tomorrow, 10), 'SUMMARY:Tandläkare', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:4', 'DTSTART:' + ics(day3, 18), 'DTEND:' + ics(day3, 19), 'RRULE:FREQ=WEEKLY', 'SUMMARY:Fotboll', 'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  var RealXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    var x = new RealXHR(), self = this, mock = false;
    this.timeout = 0;
    this.open = function (m, url, async) {
      if (url.indexOf('mock://') === 0) { mock = true; return; }
      x.open(m, url, async);
    };
    this.send = function () {
      if (mock) {
        setTimeout(function () {
          self.status = 200; self.responseText = MOCK_ICS;
          if (self.onload) self.onload();
        }, 150);
        return;
      }
      x.timeout = self.timeout;
      x.onload = function () { self.status = x.status; self.responseText = x.responseText; if (self.onload) self.onload(); };
      x.onerror = function () { if (self.onerror) self.onerror(); };
      x.ontimeout = function () { if (self.ontimeout) self.ontimeout(); };
      x.send();
    };
  };

  // ---- Tangentbord: Backspace/Esc = Tillbaka (10009), PageUp/PageDown = CH+/CH− ----
  var MAP = { 8: 10009, 27: 10009, 33: 427, 34: 428 };
  document.addEventListener('keydown', function (e) {
    var code = MAP[e.keyCode];
    if (code && window.App) {
      e.preventDefault();
      e.stopImmediatePropagation(); // annars ser appens egen lyssnare samma tryck igen
      App.handleKey(code);
    }
  });

  window.MOCK = { channels: channels, apps: apps };
})();
