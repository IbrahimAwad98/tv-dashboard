/*
 * Hemskärm – inställningar
 * Ändra här, bygg om och installera igen.
 */
var CONFIG = {
  // Namnet i hälsningen ("God morgon, Ibbe")
  userName: 'Ibbe',

  // ---- Väder (Open-Meteo, ingen nyckel) ----
  place: 'Kungsängen',
  latitude: 59.4782,
  longitude: 17.7497,

  // ---- SL-avgångar (Trafiklab, ingen nyckel) ----
  // Hitta hållplats: öppna https://transport.integration.sl.se/v1/sites och sök på namnet.
  // 9700 = "Kungsängens station" (pendeltåg 43). 4532 = "Kungsängen" (hållplatsområde utan avgångar).
  slSiteId: 9700,
  slSiteName: 'Kungsängen',
  // Trafikslag som visas: METRO, BUS, TRAIN, TRAM, SHIP, FERRY. Tom lista = alla.
  slTransportModes: ['TRAIN'],
  // Bara vissa linjer, t.ex. ['43']. Tom lista = alla.
  slLines: [],
  slForecastMinutes: 120,

  // ---- Kalender (valfritt, iCal/ICS) ----
  // Google Kalender: Inställningar → din kalender → "Hemlig adress i iCal-format".
  // Länken är hemlig: den som har den kan läsa din kalender. Committa den inte i ett publikt repo.
  calendarIcsUrl: '',
  calendarDays: 2, // idag + imorgon på startskärmen (viloläget visar 7 dagar)

  // ---- Appar på startskärmen ----
  // "match" jämförs (skiftlägesokänsligt) mot namnet från tizen.application.getAppsInfo.
  // "id" = app-ID på TV:n (hämtade från UE49M5515 2026-11-06). Tomt id fylls i av appen om den hittas.
  // Appar som inte finns installerade visas inte.
  apps: [
    { key: 'live',    name: 'Live-TV',  screen: 'live' },
    { key: 'youtube', name: 'YouTube',  match: ['youtube'],   id: '9Ur5IzDKqV.TizenYouTube' },
    { key: 'svtplay', name: 'SVT Play', match: ['svt play', 'svtplay', 'svt'], id: '5exPmCT0nz.svtplay' },
    { key: 'tv4play', name: 'TV4 Play', match: ['tv4 play', 'tv4play', 'tv4'], id: 'wYESlsUoe4.TV4' },
    { key: 'netflix', name: 'Netflix',  match: ['netflix'],   id: 'org.tizen.netflix-app' },
    { key: 'spotify', name: 'Spotify',  match: ['spotify'],   id: 'rJeHak5zRg.Spotify' },
    { key: 'idle',    name: 'Viloläge', screen: 'idle' }
  ],

  // ---- Beteende ----
  idleAfterSeconds: 600,      // startskärm → viloläge efter 10 min utan knapptryck
  livePanelHideSeconds: 5,    // live-TV: panelen göms efter 5 s
  liveChannelsVisible: 7,     // antal kanaler i kanalremsan

  // ---- Uppdateringsintervall (sekunder) ----
  refreshWeather: 600,
  refreshSl: 30,
  refreshCalendar: 900,
  refreshProgram: 60
};
