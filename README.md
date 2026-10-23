# Home Screen – dashboard for Samsung UE49M5515 (Tizen 3.0)

Clock, weather (Open-Meteo), real-time SL departures (Trafiklab) and today's calendar. Everything is built for the TV's old web engine (Chromium 47): plain ES5, no frameworks and no build step.

```
tv-dashboard/
├── app/                 ← this becomes the TV app
│   ├── config.xml       Tizen manifest
│   ├── index.html
│   ├── icon.png
│   ├── css/style.css
│   └── js/
│       ├── config.js    ← YOUR SETTINGS
│       └── app.js
└── install.ps1          builds + installs + launches with one command
```

## 1. Set your stop and calendar

Open `app/js/config.js`:

- **Stop:** Open <https://transport.integration.sl.se/v1/sites> in your browser, press Ctrl+F and search for your stop. Copy the `id` value into `slSiteId` and put the name in `slSiteName`.
- **Filter:** `slTransportModes` picks which modes of transport are shown, for example only `['METRO']`. `slLines` picks individual lines, for example `['17','18','19']`.
- **Calendar:** Go to Google Calendar → Settings → select your calendar → *Secret address in iCal format*. Paste the link into `calendarIcsUrl`. If the field is empty the calendar is hidden.
- **Weather:** Change `latitude`/`longitude` if you don't live in central Stockholm.

No API keys are needed.

## 2. Prepare your computer (once)

1. Install **Tizen Studio** (default path `C:\tizen-studio`).
2. Open **Package Manager → Extension SDK** and install **TV Extensions-3.0** (or later) and **Samsung Certificate Extension**.

## 3. Enable Developer Mode on the TV (once)

1. Open **Apps** on the TV and press **1 2 3 4 5** on the remote.
2. Turn on **Developer mode** and enter **your computer's IP address**. Find it by running `ipconfig` and reading the IPv4 value.
3. Turn off the TV and unplug the power cord for 30 seconds so it restarts properly.
4. Read the TV's IP address under *Settings → General → Network → Network Status → IP Settings*.

## 4. Create a Samsung certificate (once)

1. Connect to the TV: `C:\tizen-studio\tools\sdb.exe connect <TV-IP>`
2. In Tizen Studio: **Tools → Certificate Manager → +**.
3. Choose **Samsung**, then **TV**, and give the profile a name, for example `MyTV`.
4. Create a new author certificate and sign in with your **Samsung account**.
5. Choose a distributor certificate with privilege **Public** and make sure the TV's **DUID** is in the list. It is added automatically while the TV is connected.

## 5. Install

Run in PowerShell, in the project folder:

```powershell
.\install.ps1 -TvIp 192.168.1.50 -CertProfile MyTV
```

If PowerShell blocks the script, first run:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

The app is called **Hemskarm** under Apps on the TV.

## Remote control

| Button | Function        |
|--------|-----------------|
| OK     | Refresh all     |
| Back   | Exit the app    |

## Test in Chrome before installing

Open `app/index.html` directly in Chrome. Weather works as is. SL and Google Calendar may be blocked by CORS in a regular browser. On the TV this is not a problem, since packaged Tizen apps are not restricted by CORS. To test everything locally, start a separate Chrome profile without CORS:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="$env:TEMP\chrome-tv-test" --window-size=1920,1080
```

## Good to know

- **The screensaver** is disabled while the app is open. The TV's *Auto Power Off* (General → Eco) can still turn it off after a few hours. Disable that feature if the screen should stay on all day.
- **The calendar** handles all-day events, multi-day events and common recurring meetings (daily, weekly, monthly, yearly, with `COUNT`/`UNTIL`, exceptions and moved occurrences). Unusual rules, such as "second Tuesday of the month", are not shown.
- **Developer Mode** may be turned off after firmware updates. Repeat step 3 if so. The certificate can be reused.
- **Adding more:** Write new code in `app.js`. Stick to ES5: no `let`/`const`, arrow functions, `fetch`, `Promise` or CSS variables.
