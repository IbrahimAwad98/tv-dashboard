/*
 * Enkel fokusmotor för fjärrkontroll – ES5.
 *
 * Fokuserbara element markeras med attributet data-focus. Zoner markeras med data-zone
 * på en förälder (t.ex. "menu", "hero", "apps", "widgets"). Pilarna navigerar geometriskt
 * (närmaste element i riktningen), i första hand inom samma zon, annars i hela skärmen.
 * Klassen "focused" sätts på det fokuserade elementet.
 */
var Focus = (function () {
  'use strict';

  var root = null;      // aktiv skärm (DOM-element)
  var current = null;   // fokuserat element
  var memory = {};      // senast fokuserade element per zon (för att hitta tillbaka)

  function isVisible(el) {
    if (!el.offsetParent && el !== document.body) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function focusables() {
    if (!root) return [];
    var all = root.querySelectorAll('[data-focus]');
    var out = [];
    for (var i = 0; i < all.length; i++) {
      if (!all[i].getAttribute('data-disabled') && isVisible(all[i])) out.push(all[i]);
    }
    return out;
  }

  function zoneOf(el) {
    var n = el;
    while (n && n !== root) {
      if (n.getAttribute && n.getAttribute('data-zone')) return n.getAttribute('data-zone');
      n = n.parentNode;
    }
    return '';
  }

  function rect(el) {
    var r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 };
  }

  function set(el) {
    if (current === el) return;
    if (current) current.classList.remove('focused');
    current = el || null;
    if (current) {
      current.classList.add('focused');
      var z = zoneOf(current);
      if (z) memory[z] = current;
      // Rulla in i synfältet om zonen är rullbar (kanalremsa etc.)
      var p = current.parentNode;
      while (p && p !== root) {
        if (p.getAttribute && p.getAttribute('data-scroll')) { scrollInto(p, current); break; }
        p = p.parentNode;
      }
    }
  }

  function scrollInto(container, el) {
    var c = container.getBoundingClientRect(), e = el.getBoundingClientRect();
    if (e.left < c.left) container.scrollLeft -= (c.left - e.left) + 24;
    else if (e.right > c.right) container.scrollLeft += (e.right - c.right) + 24;
    if (e.top < c.top) container.scrollTop -= (c.top - e.top) + 24;
    else if (e.bottom > c.bottom) container.scrollTop += (e.bottom - c.bottom) + 24;
  }

  // Poäng för kandidat k sett från a i riktning dir; lägre = bättre, null = inte i riktningen
  function score(a, k, dir, requireOverlap) {
    var primary, perp, overlap;
    if (dir === 'left' || dir === 'right') {
      primary = dir === 'right' ? k.l - a.r : a.l - k.r;
      if (dir === 'right' ? k.cx <= a.cx : k.cx >= a.cx) return null;
      overlap = Math.min(a.b, k.b) - Math.max(a.t, k.t);
      perp = overlap > 0 ? 0 : -overlap;
    } else {
      primary = dir === 'down' ? k.t - a.b : a.t - k.b;
      if (dir === 'down' ? k.cy <= a.cy : k.cy >= a.cy) return null;
      overlap = Math.min(a.r, k.r) - Math.max(a.l, k.l);
      perp = overlap > 0 ? 0 : -overlap;
    }
    if (requireOverlap && perp > 0) return null;
    if (primary < -8) primary = 0; // överlappande element räknas som nära
    var centerOff = dir === 'left' || dir === 'right' ? Math.abs(k.cy - a.cy) : Math.abs(k.cx - a.cx);
    return Math.max(primary, 0) + perp * 3 + centerOff * 0.25;
  }

  function best(from, candidates, dir, requireOverlap) {
    var a = rect(from), bestEl = null, bestScore = Infinity;
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el === from) continue;
      var s = score(a, rect(el), dir, requireOverlap);
      if (s !== null && s < bestScore) { bestScore = s; bestEl = el; }
    }
    return bestEl;
  }

  function move(dir) {
    var list = focusables();
    if (!list.length) return false;
    if (!current || list.indexOf(current) === -1) { set(list[0]); return true; }

    var zone = zoneOf(current);
    var same = [], other = [];
    for (var i = 0; i < list.length; i++) {
      (zoneOf(list[i]) === zone ? same : other).push(list[i]);
    }
    var target = best(current, same, dir);
    if (!target) {
      // Till en annan zon: i sidled bara om elementen ligger på samma höjd
      target = best(current, other, dir, dir === 'left' || dir === 'right');
      // Föredra zonens senast fokuserade element om det ligger i rätt riktning
      if (target) {
        var z = zoneOf(target), remembered = memory[z];
        if (remembered && remembered !== target && other.indexOf(remembered) !== -1 &&
            score(rect(current), rect(remembered), dir) !== null) {
          target = remembered;
        }
      }
    }
    if (target) { set(target); return true; }
    return false;
  }

  function setRoot(el, initial) {
    root = el;
    var list = focusables();
    var pick = null;
    if (initial && list.indexOf(initial) !== -1) pick = initial;
    else if (current && list.indexOf(current) !== -1) pick = current;
    else pick = list[0] || null;
    if (current && current !== pick) current.classList.remove('focused');
    current = null;
    set(pick);
  }

  function focusFirst(zone) {
    var list = focusables();
    for (var i = 0; i < list.length; i++) {
      if (zoneOf(list[i]) === zone) { set(list[i]); return true; }
    }
    return false;
  }

  function refresh() {
    // Anropas när DOM byggts om: behåll fokus om elementet finns kvar, annars välj första
    var list = focusables();
    if (current && list.indexOf(current) !== -1) return;
    if (current && current.id && document.getElementById(current.id) && list.indexOf(document.getElementById(current.id)) !== -1) {
      set(document.getElementById(current.id));
      return;
    }
    set(list[0] || null);
  }

  function clear() {
    if (current) current.classList.remove('focused');
    current = null;
  }

  return {
    setRoot: setRoot,
    move: move,
    set: set,
    get: function () { return current; },
    focusFirst: focusFirst,
    refresh: refresh,
    clear: clear,
    zoneOf: zoneOf
  };
})();
