// Kör: node test.js
// Testar iCal-parsning och återkommande händelser i app/js/api.js.
process.env.TZ = 'Europe/Stockholm';
var fs = require('fs'), assert = require('assert');

global.CONFIG = { slTransportModes: [], slLines: [] };
global.document = { addEventListener: function () {} };
global.XMLHttpRequest = function () {};
eval(fs.readFileSync(__dirname + '/app/js/util.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/app/js/api.js', 'utf8'));
var parseIcs = Api.parseIcs, occurrences = Api.occurrences;

function d(y, m, day, h, mi) { return new Date(y, m - 1, day, h || 0, mi || 0); }
function times(list) { return list.map(function (x) { return x.getTime(); }); }
function eq(actual, expected, msg) { assert.deepStrictEqual(times(actual), times(expected), msg || 'occurrences'); }

var ics = [
  'BEGIN:VCALENDAR',
  // Weekly Mon+Wed, 4 times from Mon 2026-10-19, Wed 2026-10-21 removed (still counts toward COUNT)
  'BEGIN:VEVENT', 'UID:a',
  'DTSTART;TZID=Europe/Stockholm:20261019T090000', 'DTEND;TZID=Europe/Stockholm:20261019T100000',
  'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4', 'EXDATE;TZID=Europe/Stockholm:20261021T090000',
  'SUMMARY:Stand', ' up\, team', 'END:VEVENT',
  // All-day Fri 23 to Sat 24 (DTEND exclusive)
  'BEGIN:VEVENT', 'UID:b', 'DTSTART;VALUE=DATE:20261023', 'DTEND;VALUE=DATE:20261025', 'SUMMARY:Trip', 'END:VEVENT',
  // UTC timed event spanning two days
  'BEGIN:VEVENT', 'UID:c', 'DTSTART:20261022T200000Z', 'DTEND:20261024T060000Z', 'SUMMARY:Long', 'END:VEVENT',
  // Every other day since New Year, no COUNT
  'BEGIN:VEVENT', 'UID:e', 'DTSTART:20260101T080000', 'RRULE:FREQ=DAILY;INTERVAL=2', 'SUMMARY:Pills', 'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

var ev = {};
parseIcs(ics).forEach(function (e) { ev[e.uid] = e; });

// Parsing
assert.strictEqual(ev.a.title, 'Standup, team', 'unfold + unescape');
assert.strictEqual(ev.a.exdates.length, 1);
assert.strictEqual(ev.b.start.allDay, true);
assert.strictEqual(ev.c.start.date.getHours(), 22, 'UTC -> local (CEST)');

// Weekly + COUNT + EXDATE
eq(occurrences(ev.a, d(2026, 10, 19), d(2026, 10, 24)), [d(2026, 10, 19, 9)], 'exdated Wed skipped');
eq(occurrences(ev.a, d(2026, 10, 26), d(2026, 10, 30)), [d(2026, 10, 26, 9), d(2026, 10, 28, 9)]);
eq(occurrences(ev.a, d(2026, 11, 2), d(2026, 11, 6)), [], 'COUNT exhausted');

// All-day with exclusive DTEND
eq(occurrences(ev.b, d(2026, 10, 23), d(2026, 10, 25)), [d(2026, 10, 23)]);
eq(occurrences(ev.b, d(2026, 10, 24), d(2026, 10, 26)), [d(2026, 10, 23)], 'ongoing on day 2');
eq(occurrences(ev.b, d(2026, 10, 25), d(2026, 10, 27)), [], 'ended');

// Timed multi-day, ongoing
eq(occurrences(ev.c, d(2026, 10, 23), d(2026, 10, 25)), [d(2026, 10, 22, 22)]);

// DAILY INTERVAL=2 without COUNT, window far from DTSTART
var pills = occurrences(ev.e, d(2026, 10, 23), d(2026, 10, 27));
assert.strictEqual(pills.length, 2);
pills.forEach(function (p) { assert.strictEqual(p.getHours(), 8); });

// upcoming(): sorterad lista med dagsetiketter
var items = Api.upcoming(parseIcs(ics), 7);
assert.ok(Array.isArray(items));

console.log('ok');
