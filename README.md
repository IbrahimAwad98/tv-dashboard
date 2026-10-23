# Hemskärm – dashboard för Samsung UE49M5515 (Tizen 3.0)

Klocka, väder (Open-Meteo), SL-avgångar i realtid (Trafiklab) och dagens kalender. Allt är byggt för TV:ns gamla webbmotor (Chromium 47): ren ES5, inga ramverk och inget byggsteg.

```
tv-dashboard/
├── app/                 ← det här blir TV-appen
│   ├── config.xml       Tizen-manifest
│   ├── index.html
│   ├── icon.png
│   ├── css/style.css
│   └── js/
│       ├── config.js    ← DINA INSTÄLLNINGAR
│       └── app.js
└── install.ps1          bygger + installerar + startar med ett kommando
```

## 1. Ställ in din hållplats och kalender

Öppna `app/js/config.js`:

- **Hållplats:** Öppna <https://transport.integration.sl.se/v1/sites> i webbläsaren, tryck Ctrl+F och sök på din hållplats. Kopiera `id`-värdet till `slSiteId` och skriv namnet i `slSiteName`.
- **Filtrera:** Med `slTransportModes` väljer du vilka trafikslag som visas, till exempel bara `['METRO']`. Med `slLines` väljer du enskilda linjer, till exempel `['17','18','19']`.
- **Kalender:** Gå till Google Kalender → Inställningar → välj din kalender → *Hemlig adress i iCal-format*. Klistra in länken i `calendarIcsUrl`. Om fältet är tomt döljs kalendern.
- **Väder:** Ändra `latitude`/`longitude` om du inte bor i centrala Stockholm.

Inga API-nycklar behövs.

## 2. Förbered datorn (en gång)

1. Installera **Tizen Studio** (standardsökväg `C:\tizen-studio`).
2. Öppna **Package Manager → Extension SDK** och installera **TV Extensions-3.0** (eller senare) och **Samsung Certificate Extension**.

## 3. Aktivera Developer Mode på TV:n (en gång)

1. Öppna **Apps** på TV:n och tryck **1 2 3 4 5** på fjärrkontrollen.
2. Slå på **Developer mode** och skriv in **datorns IP-adress**. Du hittar den genom att köra `ipconfig` och läsa av IPv4.
3. Stäng av TV:n och dra ur strömsladden i 30 sekunder, så att den startar om ordentligt.
4. Läs av TV:ns IP-adress under *Inställningar → Allmänt → Nätverk → Nätverksstatus → IP-inställningar*.

## 4. Skapa Samsung-certifikat (en gång)

1. Anslut till TV:n: `C:\tizen-studio\tools\sdb.exe connect <TV-IP>`
2. I Tizen Studio: **Tools → Certificate Manager → +**.
3. Välj **Samsung**, sedan **TV**, och ge profilen ett namn, till exempel `MinTV`.
4. Skapa ett nytt author-certifikat och logga in med ditt **Samsungkonto**.
5. Välj distributor-certifikat med privilege **Public** och se till att TV:ns **DUID** finns med i listan. Den läggs till automatiskt när TV:n är ansluten.

## 5. Installera

Kör i PowerShell, i projektmappen:

```powershell
.\install.ps1 -TvIp 192.168.1.50 -CertProfile MinTV
```

Om PowerShell blockerar skriptet, kör först:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Appen heter **Hemskarm** under Apps på TV:n.

## Fjärrkontrollen

| Knapp     | Funktion          |
|-----------|-------------------|
| OK        | Uppdatera allt    |
| Tillbaka  | Avsluta appen     |

## Testa i Chrome innan du installerar

Öppna `app/index.html` direkt i Chrome. Vädret fungerar som det är. SL och Google-kalendern kan blockeras av CORS i en vanlig webbläsare. På TV:n är det inget problem, eftersom packade Tizen-appar inte begränsas av CORS. Vill du testa allt lokalt kan du starta en separat Chrome-profil utan CORS:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="$env:TEMP\chrome-tv-test" --window-size=1920,1080
```

## Bra att veta

- **Skärmsläckaren** stängs av medan appen är öppen. TV:ns *Automatisk avstängning* (Allmänt → Eco) kan ändå stänga av den efter några timmar. Slå av den funktionen om skärmen ska vara på hela dagen.
- **Kalendern** hanterar heldagshändelser, flerdagars-event och vanliga återkommande möten (dagligen, veckovis, månadsvis, årligen, med `COUNT`/`UNTIL`, undantag och flyttade tillfällen). Ovanliga regler, som "andra tisdagen i månaden", visas inte.
- **Developer Mode** kan stängas av efter firmwareuppdateringar. Upprepa då steg 3. Certifikatet kan återanvändas.
- **Lägga till mer:** Skriv ny kod i `app.js`. Håll dig till ES5: inga `let`/`const`, arrow functions, `fetch`, `Promise` eller CSS-variabler.
