/*
 * Live TV panel – bottom-left corner of the dashboard.
 * Shows the TV's own tuner (antenna/cable) in a small window via tizen.tvwindow.
 * CH+ / CH- on the remote change channel.
 *
 * Self-contained, pure ES5 (Chromium 47 / Tizen 3.0).
 * Needs these privileges in config.xml:
 *   http://tizen.org/privilege/tv.window
 *   http://tizen.org/privilege/tv.channel
 *   http://tizen.org/privilege/tv.inputdevice
 * Disable by setting  liveTv: false  in config.js.
 */
(function () {
  'use strict';

  if (typeof CONFIG !== 'undefined' && CONFIG.liveTv === false) return;

  var GAP = 24;      // space between weather panel and TV panel
  var PAD = 20;      // inner padding
  var KEY_CH_UP = 427, KEY_CH_DOWN = 428;

  var panel, info, nameEl, statusEl;
  var lastRect = '';
  var isTv = typeof tizen !== 'undefined' && !!tizen.tvwindow;

  function $(id) { return document.getElementById(id); }

  // ---------- Build panel ----------

  function build() {
    var cal = $('calendar-panel');
    if (cal) cal.style.display = 'none'; // the TV panel takes this spot

    panel = document.createElement('div');
    panel.id = 'tv-panel';
    panel.className = 'panel';
    panel.style.position = 'absolute';
    panel.style.boxSizing = 'border-box';
    panel.style.overflow = 'hidden';

    info = document.createElement('div');
    info.style.position = 'absolute';
    info.style.top = PAD + 'px';
    info.style.right = PAD + 'px';
    info.style.overflow = 'hidden';

    info.innerHTML =
      '<div class="panel-title" style="margin-bottom:12px">Live TV</div>' +
      '<div id="tv-channel" style="font-size:40px;font-weight:600;line-height:1.15;' +
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">&nbsp;</div>' +
      '<div id="tv-status" style="font-size:24px;color:#7f8aa3;margin-top:10px">&nbsp;</div>' +
      '<div style="font-size:22px;color:#4d5770;margin-top:16px">CH + / CH − = channel</div>';

    panel.appendChild(info);
    document.body.appendChild(panel);
    nameEl = $('tv-channel');
    statusEl = $('tv-status');
  }

  // ---------- Layout (follows the weather panel's height) ----------

  function computeLayout() {
    var weather = $('weather-panel'), screen = $('screen');
    if (!weather || !screen) return null;
    var w = weather.getBoundingClientRect();
    var s = screen.getBoundingClientRect();

    var top = Math.round(w.bottom + GAP);
    var height = Math.round(s.bottom - top);
    if (height < 120) return null;

    var vh = height - PAD * 2;
    var vw = Math.round(vh * 16 / 9);
    var maxVw = Math.round(w.width * 0.58);
    if (vw > maxVw) { vw = maxVw; vh = Math.round(vw * 9 / 16); }

    return {
      left: Math.round(w.left), top: top, width: Math.round(w.width), height: height,
      vx: Math.round(w.left + PAD), vy: Math.round(top + (height - vh) / 2), vw: vw, vh: vh
    };
  }

  function layout() {
    var L = computeLayout();
    if (!L) return;
    var key = [L.left, L.top, L.width, L.height].join(',');
    if (key === lastRect) return;
    lastRect = key;

    panel.style.left = L.left + 'px';
    panel.style.top = L.top + 'px';
    panel.style.width = L.width + 'px';
    panel.style.height = L.height + 'px';

    info.style.left = (L.vx - L.left + L.vw + PAD + 8) + 'px';

    showWindow(L);
  }

  // ---------- TV window ----------

  function setStatus(t) { statusEl.textContent = t || ' '; }

  function showWindow(L) {
    if (!isTv) {
      nameEl.textContent = '—';
      setStatus('Only available on the TV');
      return;
    }
    var rect = [L.vx + 'px', L.vy + 'px', L.vw + 'px', L.vh + 'px'];
    try {
      tizen.tvwindow.show(function () {
        setStatus('');
        updateChannel();
      }, function (e) {
        setStatus('Could not show TV (' + (e && e.message ? e.message : e) + ')');
      }, rect, 'MAIN', 'FRONT');
    } catch (e) {
      setStatus('TV window not supported');
    }
  }

  function hideWindow() {
    if (!isTv) return;
    try { tizen.tvwindow.hide(function () {}, function () {}, 'MAIN'); } catch (e) {}
  }

  // Switch the main window to the TV tuner (not HDMI) before showing it
  function selectTunerThen(next) {
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (vs) {
        var list = (vs && vs.connected) || [], tuner = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].type === 'TV') { tuner = list[i]; break; }
        }
        if (!tuner) { setStatus('No antenna/cable source found'); next(); return; }
        try {
          tizen.tvwindow.setSource(tuner, function () { next(); }, function () { next(); }, 'MAIN');
        } catch (e) { next(); }
      }, function () { next(); });
    } catch (e) { next(); }
  }

  // ---------- Channels ----------

  function channelLabel(ch) {
    if (!ch) return '—';
    var num = ch.major != null ? String(ch.major) : '';
    if (ch.minor != null && ch.minor > 0) num += '.' + ch.minor;
    var name = ch.channelName || '';
    return (num ? num + '  ' : '') + (name || (num ? '' : '—'));
  }

  function updateChannel(ch) {
    try {
      if (!ch) ch = tizen.tvchannel.getCurrentChannel('MAIN');
      nameEl.textContent = channelLabel(ch);
    } catch (e) {
      nameEl.textContent = 'TV';
    }
  }

  function tune(up) {
    if (!isTv || !tizen.tvchannel) return;
    setStatus('Changing channel…');
    var cb = {
      onsuccess: function (ch) { setStatus(''); updateChannel(ch); },
      onnosignal: function () { setStatus('No signal'); },
      onprograminforeceived: function () {}
    };
    try {
      if (up) tizen.tvchannel.tuneUp(cb, function () { setStatus('Could not change channel'); }, 'ALL', 'MAIN');
      else tizen.tvchannel.tuneDown(cb, function () { setStatus('Could not change channel'); }, 'ALL', 'MAIN');
    } catch (e) {
      setStatus('Channel change not supported');
    }
  }

  function registerKeys() {
    try {
      tizen.tvinputdevice.registerKey('ChannelUp');
      tizen.tvinputdevice.registerKey('ChannelDown');
      KEY_CH_UP = tizen.tvinputdevice.getKey('ChannelUp').code;
      KEY_CH_DOWN = tizen.tvinputdevice.getKey('ChannelDown').code;
    } catch (e) {}

    document.addEventListener('keydown', function (e) {
      if (e.keyCode === KEY_CH_UP) tune(true);
      else if (e.keyCode === KEY_CH_DOWN) tune(false);
    });

    try {
      tizen.tvchannel.addChannelChangeListener(function (ch) { updateChannel(ch); }, 'MAIN');
    } catch (e) {}
  }

  // ---------- Start ----------

  function start() {
    build();
    if (isTv) registerKeys();

    var go = function () {
      layout();
      // Weather panel grows when data arrives – follow it
      setInterval(layout, 2000);
    };
    if (isTv) selectTunerThen(function () { setTimeout(go, 300); });
    else setTimeout(go, 300);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { hideWindow(); }
      else { lastRect = ''; layout(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
