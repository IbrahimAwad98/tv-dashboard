/*
 * Hemskärm – inställningar
 * Ändra här, bygg om och installera på nytt.
 */
var CONFIG = {
  // ---- Plats för väder ----
  place: 'Stockholm',
  latitude: 59.3293,
  longitude: 18.0686,

  // ---- SL-avgångar ----
  // Hitta din hållplats: öppna https://transport.integration.sl.se/v1/sites
  // och sök (Ctrl+F) på namnet. Använd "id"-värdet. 9192 = Slussen.
  slSiteId: 9192,
  slSiteName: 'Slussen',
  // Vilka trafikslag som visas: METRO, BUS, TRAIN, TRAM, SHIP, FERRY
  slTransportModes: ['METRO', 'BUS', 'TRAIN', 'TRAM'],
  // Visa bara vissa linjer, t.ex. ['17', '18', '19']. Tom lista = alla.
  slLines: [],
  slMaxDepartures: 8,
  slForecastMinutes: 60,

  // ---- Kalender (valfritt) ----
  // Google Kalender: Inställningar → din kalender → "Hemlig adress i iCal-format".
  // Klistra in hela länken (slutar på basic.ics). Lämna tom för att dölja kalendern.
  calendarIcsUrl: '',
  calendarDays: 2, // idag + imorgon

  // ---- Uppdateringsintervall (sekunder) ----
  refreshWeather: 600,
  refreshSl: 30,
  refreshCalendar: 900
};
