/*
 * Home Screen – settings
 * Edit here, then rebuild and reinstall.
 */
var CONFIG = {
  // ---- Weather location ----
  place: 'Stockholm',
  latitude: 59.3293,
  longitude: 18.0686,

  // ---- SL departures ----
  // Find your stop: open https://transport.integration.sl.se/v1/sites
  // and search (Ctrl+F) for the name. Use the "id" value. 9192 = Slussen.
  slSiteId: 4532,
  slSiteName: 'Kungsängen',
  // Which transport modes to show: METRO, BUS, TRAIN, TRAM, SHIP, FERRY
  slTransportModes: ['METRO', 'BUS', 'TRAIN', 'TRAM'],
  // Only show certain lines, e.g. ['17', '18', '19']. Empty list = all.
  slLines: [],
  slMaxDepartures: 8,
  slForecastMinutes: 60,

  // ---- Calendar (optional) ----
  // Google Calendar: Settings → your calendar → "Secret address in iCal format".
  // Paste the full link (ends with basic.ics). Leave empty to hide the calendar.
  // The link is a secret: anyone who has it can read your calendar. Don't commit it to a public repo.
  calendarIcsUrl: '',
  calendarDays: 2, // today + tomorrow

  // ---- Live TV (bottom-left corner, replaces the calendar panel) ----
  // Set to false to show the calendar instead.
  liveTv: true,

  // ---- Refresh intervals (seconds) ----
  refreshWeather: 600,
  refreshSl: 30,
  refreshCalendar: 900
};
