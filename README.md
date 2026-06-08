<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>KaraokeQuest: CFL</title>
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body>
    <main id="loginScreen" class="login-screen" aria-label="KaraokeQuest login">
      <div class="login-curtain" aria-hidden="true"></div>
      <section class="login-panel" aria-labelledby="loginTitle">
        <p class="brand-mark" aria-hidden="true">X</p>
        <h1 id="loginTitle">KaraokeQuest: CFL</h1>
        <form id="loginForm" class="login-form" autocomplete="on">
          <label for="username">Login</label>
          <input id="username" name="username" type="text" autocomplete="username" required>
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
          <button type="submit">Enter Quest</button>
          <p id="loginError" class="form-error" role="alert"></p>
        </form>
      </section>
    </main>

    <main id="appScreen" class="app-shell hidden" aria-label="KaraokeQuest application">
      <header class="top-bar">
        <div class="app-title">
          <span class="title-symbol" aria-hidden="true">X</span>
          <span>KaraokeQuest: CFL</span>
        </div>
        <nav class="view-tabs" aria-label="Primary">
          <button id="mapTab" class="tab-button active" type="button" data-view="map">Map</button>
          <button id="ledgerTab" class="tab-button" type="button" data-view="ledger">Ledger</button>
        </nav>
        <button id="logoutButton" class="ghost-button" type="button">Logout</button>
      </header>

      <section id="mapView" class="view map-view" aria-label="Central Florida treasure map">
        <aside class="map-tools" aria-label="Map controls">
          <div>
            <p class="kicker">Central Florida</p>
            <h2>Karaoke Map</h2>
          </div>
          <div class="stats-row" aria-label="Map statistics">
            <span><strong id="pinCount">0</strong> pins</span>
            <span id="activeModeText">Browse</span>
          </div>
          <button id="dropPinButton" class="primary-button" type="button">Drop Pin</button>
          <button id="clearPinsButton" class="secondary-button" type="button">Clear Pins</button>
        </aside>

        <div id="mapBoard" class="map-board" tabindex="0" aria-label="Treasure map pin board">
          <div id="pinLayer" class="pin-layer" aria-live="polite"></div>
        </div>
      </section>

      <section id="ledgerView" class="view ledger-view hidden" aria-labelledby="ledgerTitle">
        <div class="ledger-heading">
          <div>
            <p class="kicker">Quest Records</p>
            <h2 id="ledgerTitle">Ledger</h2>
          </div>
          <button id="ledgerDropPinButton" class="primary-button" type="button">Drop Pin</button>
        </div>
        <div id="ledgerList" class="ledger-list" aria-live="polite"></div>
      </section>
    </main>

    <dialog id="pinDialog" class="pin-dialog">
      <form id="pinForm" method="dialog">
        <div class="dialog-heading">
          <p class="kicker">New Location</p>
          <h2>Ledger Entry</h2>
        </div>
        <label for="locationName">Location name</label>
        <input id="locationName" name="locationName" type="text" maxlength="80" required>
        <label for="locationDescription">Description</label>
        <textarea id="locationDescription" name="locationDescription" rows="4" maxlength="260" required></textarea>
        <p id="pinCoordinates" class="coordinate-preview"></p>
        <menu class="dialog-actions">
          <button id="cancelPinButton" class="secondary-button" type="button">Cancel</button>
          <button class="primary-button" type="submit">Save Pin</button>
        </menu>
      </form>
    </dialog>

    <script src="./app.js"></script>
  </body>
</html>
