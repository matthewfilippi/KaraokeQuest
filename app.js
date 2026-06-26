(function () {
  const STORAGE_KEYS = {
    pins: "karaokequest-fl-pins",
    auth: "karaokequest-fl-auth",
  };

  const LOGIN_CREDENTIALS = {
    username: "Flippers808",
    password: "Weemen",
    authToken: "flippers808-weemen-v2",
  };

  const MAP_BOUNDS = {
    north: 31.15,
    south: 24.35,
    west: -87.75,
    east: -79.65,
  };

  const state = {
    pins: readPins(),
    pendingPin: null,
    revisingPinId: null,
    placing: false,
    map: null,
    markerLayer: null,
    gridLayer: null,
    searchMarker: null,
  };

  const els = {
    loginScreen: document.getElementById("loginScreen"),
    appScreen: document.getElementById("appScreen"),
    loginForm: document.getElementById("loginForm"),
    username: document.getElementById("username"),
    password: document.getElementById("password"),
    loginError: document.getElementById("loginError"),
    logoutButton: document.getElementById("logoutButton"),
    mapBoard: document.getElementById("mapBoard"),
    dropPinButton: document.getElementById("dropPinButton"),
    ledgerDropPinButton: document.getElementById("ledgerDropPinButton"),
    clearPinsButton: document.getElementById("clearPinsButton"),
    locationSearchForm: document.getElementById("locationSearchForm"),
    locationSearch: document.getElementById("locationSearch"),
    locationSearchStatus: document.getElementById("locationSearchStatus"),
    mapView: document.getElementById("mapView"),
    ledgerView: document.getElementById("ledgerView"),
    alcoholView: document.getElementById("alcoholView"),
    ledgerList: document.getElementById("ledgerList"),
    alcoholScaleList: document.getElementById("alcoholScaleList"),
    tabs: Array.from(document.querySelectorAll(".tab-button")),
    pinDialog: document.getElementById("pinDialog"),
    pinForm: document.getElementById("pinForm"),
    locationName: document.getElementById("locationName"),
    locationDescription: document.getElementById("locationDescription"),
    alcoholConfirmed: document.getElementById("alcoholConfirmed"),
    alcoholLow: document.getElementById("alcoholLow"),
    alcoholHigh: document.getElementById("alcoholHigh"),
    pinCoordinates: document.getElementById("pinCoordinates"),
    cancelPinButton: document.getElementById("cancelPinButton"),
    reviseDialog: document.getElementById("reviseDialog"),
    reviseForm: document.getElementById("reviseForm"),
    reviseLocationName: document.getElementById("reviseLocationName"),
    reviseDescription: document.getElementById("reviseDescription"),
    reviseAlcoholConfirmed: document.getElementById("reviseAlcoholConfirmed"),
    reviseAlcoholLow: document.getElementById("reviseAlcoholLow"),
    reviseAlcoholHigh: document.getElementById("reviseAlcoholHigh"),
    reviseCoordinates: document.getElementById("reviseCoordinates"),
    cancelReviseButton: document.getElementById("cancelReviseButton"),
    alcoholDropPinButton: document.getElementById("alcoholDropPinButton"),
  };

  hydrateSession();
  initMap();
  bindEvents();
  render();

  function bindEvents() {
    els.loginForm.addEventListener("submit", handleLogin);
    els.logoutButton.addEventListener("click", handleLogout);
    els.dropPinButton.addEventListener("click", enablePinMode);
    els.ledgerDropPinButton.addEventListener("click", () => {
      switchView("map");
      enablePinMode();
    });
    els.alcoholDropPinButton.addEventListener("click", () => {
      switchView("map");
      enablePinMode();
    });
    els.clearPinsButton.addEventListener("click", clearPins);
    els.locationSearchForm.addEventListener("submit", handleLocationSearch);
    els.pinForm.addEventListener("submit", savePin);
    els.cancelPinButton.addEventListener("click", closePinDialog);
    els.reviseForm.addEventListener("submit", saveRevision);
    els.cancelReviseButton.addEventListener("click", closeReviseDialog);
    els.alcoholConfirmed.addEventListener("change", () => syncAlcoholInputs("pin", true));
    els.reviseAlcoholConfirmed.addEventListener("change", () => syncAlcoholInputs("revise", true));
    syncAlcoholInputs("pin", false);
    syncAlcoholInputs("revise", false);
    els.pinDialog.addEventListener("cancel", () => {
      state.pendingPin = null;
      state.placing = false;
      setSearchStatus("");
      renderMode();
    });
    els.reviseDialog.addEventListener("cancel", () => {
      state.revisingPinId = null;
    });
    els.tabs.forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });
  }

  function hydrateSession() {
    if (hasActiveSession()) {
      els.loginScreen.classList.add("hidden");
      els.appScreen.classList.remove("hidden");
      fitFloridaMap();
    }
  }

  function handleLogin(event) {
    event.preventDefault();

    const username = els.username.value.trim();
    const password = els.password.value.trim();

    if (!username || !password) {
      els.loginError.textContent = "Both fields are required.";
      return;
    }

    if (username !== LOGIN_CREDENTIALS.username || password !== LOGIN_CREDENTIALS.password) {
      els.loginError.textContent = "Incorrect login or password.";
      return;
    }

    localStorage.setItem(STORAGE_KEYS.auth, LOGIN_CREDENTIALS.authToken);
    els.loginError.textContent = "";
    els.loginScreen.classList.add("hidden");
    els.appScreen.classList.remove("hidden");
    fitFloridaMap();
    els.dropPinButton.focus();
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEYS.auth);
    state.placing = false;
    els.appScreen.classList.add("hidden");
    els.loginScreen.classList.remove("hidden");
    els.password.value = "";
    els.username.focus();
    render();
  }

  function enablePinMode() {
    state.placing = true;
    setSearchStatus("Click the map where the karaoke spot belongs.");
    renderMode();
    refreshMapSize();
  }

  function openPinDialog(point, defaults = {}) {
    state.pendingPin = point;
    els.locationName.value = defaults.name || "";
    els.locationDescription.value = defaults.description || "";
    setAlcoholFields("pin", false, null, null);
    els.pinCoordinates.textContent = formatDegrees(point.lat, point.lng);
    els.pinDialog.showModal();
    window.setTimeout(() => els.locationName.focus(), 0);
  }

  function closePinDialog() {
    state.pendingPin = null;
    state.placing = false;
    setSearchStatus("");
    els.pinDialog.close();
    renderMode();
    els.mapBoard.focus();
  }

  function openReviseDialog(pin) {
    const alcohol = getAlcoholInfo(pin);
    state.revisingPinId = pin.id;
    els.reviseLocationName.textContent = pin.name;
    els.reviseDescription.value = pin.description;
    setAlcoholFields("revise", Boolean(alcohol), alcohol?.low ?? null, alcohol?.high ?? null);
    els.reviseCoordinates.textContent = formatDegrees(pin.lat, pin.lng);
    els.reviseDialog.showModal();
    window.setTimeout(() => {
      els.reviseDescription.focus();
      els.reviseDescription.select();
    }, 0);
  }

  function closeReviseDialog() {
    state.revisingPinId = null;
    els.reviseDialog.close();
    els.ledgerList.focus();
  }

  function savePin(event) {
    event.preventDefault();

    if (!state.pendingPin) {
      return;
    }

    const alcohol = readAlcoholFields("pin");
    if (!alcohol.valid) {
      return;
    }

    const pin = {
      id: String(Date.now()),
      name: els.locationName.value.trim(),
      description: els.locationDescription.value.trim(),
      lat: state.pendingPin.lat,
      lng: state.pendingPin.lng,
      createdAt: new Date().toISOString(),
      alcoholConfirmed: alcohol.confirmed,
      alcoholLow: alcohol.low,
      alcoholHigh: alcohol.high,
    };

    if (!pin.name || !pin.description) {
      return;
    }

    state.pins.push(pin);
    state.pendingPin = null;
    state.placing = false;
    setSearchStatus("");
    persistPins();
    els.pinDialog.close();
    render();
  }

  function saveRevision(event) {
    event.preventDefault();

    const pin = state.pins.find((entry) => entry.id === state.revisingPinId);
    const description = els.reviseDescription.value.trim();
    const alcohol = readAlcoholFields("revise");
    if (!pin || !description) {
      return;
    }

    if (!alcohol.valid) {
      return;
    }

    pin.description = description;
    pin.alcoholConfirmed = alcohol.confirmed;
    pin.alcoholLow = alcohol.low;
    pin.alcoholHigh = alcohol.high;
    pin.updatedAt = new Date().toISOString();
    state.revisingPinId = null;
    persistPins();
    els.reviseDialog.close();
    render();
  }

  function clearPins() {
    if (!state.pins.length) {
      return;
    }

    const confirmed = window.confirm("Clear every pin from the KaraokeQuest ledger?");
    if (!confirmed) {
      return;
    }

    state.pins = [];
    persistPins();
    render();
  }

  function switchView(viewName) {
    const isMap = viewName === "map";
    els.mapView.classList.toggle("hidden", !isMap);
    els.ledgerView.classList.toggle("hidden", viewName !== "ledger");
    els.alcoholView.classList.toggle("hidden", viewName !== "alcohol");
    els.tabs.forEach((tab) => {
      const active = tab.dataset.view === viewName;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-current", active ? "page" : "false");
    });
    if (isMap) {
      refreshMapSize();
    }
    render();
  }

  function render() {
    renderMode();
    renderPins();
    renderLedger();
    renderAlcoholScale();
  }

  function renderMode() {
    els.mapBoard.classList.toggle("placing", state.placing);
    els.dropPinButton.textContent = state.placing ? "Click Map" : "Drop Pin";
  }

  function renderPins() {
    if (!state.markerLayer) {
      return;
    }

    state.markerLayer.clearLayers();

    state.pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], { icon: createPinIcon() })
        .bindPopup(`<strong>${escapeHtml(pin.name)}</strong><br>${escapeHtml(pin.description)}<br>${formatDegrees(pin.lat, pin.lng)}`);

      marker.on("click", () => {
        switchView("ledger");
        const row = document.querySelector(`[data-pin-id="${pin.id}"]`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });

      state.markerLayer.addLayer(marker);
    });
  }

  function renderLedger() {
    els.ledgerList.innerHTML = "";

    if (!state.pins.length) {
      const empty = document.createElement("p");
      empty.className = "empty-ledger";
      empty.textContent = "No pinned locations yet.";
      els.ledgerList.appendChild(empty);
      return;
    }

    state.pins
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((pin) => {
        const alcohol = getAlcoholInfo(pin);
        const card = document.createElement("article");
        card.className = "ledger-card";
        card.dataset.pinId = pin.id;

        const details = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = pin.name;
        const description = document.createElement("p");
        description.textContent = pin.description;
        details.append(title, description);
        if (alcohol) {
          const alcoholLine = document.createElement("p");
          alcoholLine.className = "ledger-meta";
          alcoholLine.textContent = `Alcohol confirmed: ${formatPriceRange(alcohol.low, alcohol.high)}`;
          details.appendChild(alcoholLine);
        }

        const coordinates = document.createElement("p");
        coordinates.className = "ledger-coords";
        coordinates.textContent = formatDegrees(pin.lat, pin.lng);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "revise-button";
        button.setAttribute("aria-label", `Revise entry for ${pin.name}`);
        button.textContent = "Revise";
        button.addEventListener("click", () => openReviseDialog(pin));

        card.append(details, coordinates, button);
        els.ledgerList.appendChild(card);
      });
  }

  function renderAlcoholScale() {
    els.alcoholScaleList.innerHTML = "";

    const confirmedPins = state.pins
      .map((pin) => ({ pin, alcohol: getAlcoholInfo(pin) }))
      .filter((entry) => Boolean(entry.alcohol))
      .sort((a, b) => {
        const priceDifference = getAveragePrice(a.alcohol) - getAveragePrice(b.alcohol);
        return priceDifference || a.pin.name.localeCompare(b.pin.name);
      });

    if (!confirmedPins.length) {
      const empty = document.createElement("p");
      empty.className = "empty-ledger";
      empty.textContent = "No confirmed alcohol prices yet.";
      els.alcoholScaleList.appendChild(empty);
      return;
    }

    const maxPrice = Math.max(20, ...confirmedPins.map((entry) => entry.alcohol.high));

    confirmedPins.forEach(({ pin, alcohol }) => {
      const card = document.createElement("article");
      card.className = "alcohol-card";

      const details = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = pin.name;
      const price = document.createElement("p");
      price.className = "alcohol-price";
      price.textContent = formatPriceRange(alcohol.low, alcohol.high);
      const description = document.createElement("p");
      description.textContent = pin.description;
      details.append(title, price, description);

      const scale = document.createElement("div");
      scale.className = "price-track";
      scale.setAttribute("aria-label", `${pin.name} alcohol price range ${formatPriceRange(alcohol.low, alcohol.high)}`);

      const range = document.createElement("span");
      range.className = "price-range-fill";
      range.style.left = `${getScalePercent(alcohol.low, maxPrice)}%`;
      range.style.width = `${Math.max(2, getScalePercent(alcohol.high, maxPrice) - getScalePercent(alcohol.low, maxPrice))}%`;

      const marker = document.createElement("span");
      marker.className = "price-marker";
      marker.style.left = `${getScalePercent(getAveragePrice(alcohol), maxPrice)}%`;

      scale.append(range, marker);
      card.append(details, scale);
      els.alcoholScaleList.appendChild(card);
    });
  }

  function setAlcoholFields(scope, confirmed, low, high) {
    const controls = getAlcoholControls(scope);
    controls.confirmed.checked = confirmed;
    controls.low.value = Number.isFinite(low) ? String(low) : "";
    controls.high.value = Number.isFinite(high) ? String(high) : "";
    syncAlcoholInputs(scope, false);
  }

  function syncAlcoholInputs(scope, clearValues) {
    const controls = getAlcoholControls(scope);
    const enabled = controls.confirmed.checked;
    [controls.low, controls.high].forEach((input) => {
      input.disabled = !enabled;
      input.required = enabled;
      input.setCustomValidity("");
      if (!enabled && clearValues) {
        input.value = "";
      }
    });
  }

  function readAlcoholFields(scope) {
    const controls = getAlcoholControls(scope);
    if (!controls.confirmed.checked) {
      return {
        valid: true,
        confirmed: false,
        low: null,
        high: null,
      };
    }

    const low = parsePrice(controls.low.value);
    const high = parsePrice(controls.high.value);

    if (low === null || high === null) {
      controls.high.setCustomValidity("Enter a low and high alcohol price.");
      controls.high.reportValidity();
      controls.high.setCustomValidity("");
      return { valid: false };
    }

    if (high < low) {
      controls.high.setCustomValidity("High price must be at least the low price.");
      controls.high.reportValidity();
      controls.high.setCustomValidity("");
      return { valid: false };
    }

    return {
      valid: true,
      confirmed: true,
      low,
      high,
    };
  }

  function getAlcoholControls(scope) {
    if (scope === "revise") {
      return {
        confirmed: els.reviseAlcoholConfirmed,
        low: els.reviseAlcoholLow,
        high: els.reviseAlcoholHigh,
      };
    }

    return {
      confirmed: els.alcoholConfirmed,
      low: els.alcoholLow,
      high: els.alcoholHigh,
    };
  }

  function getAlcoholInfo(pin) {
    const low = parsePrice(pin.alcoholLow);
    const high = parsePrice(pin.alcoholHigh);
    if (!pin.alcoholConfirmed || low === null || high === null || high < low) {
      return null;
    }

    return { low, high };
  }

  function parsePrice(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
      return null;
    }

    return Math.round(price * 100) / 100;
  }

  function getAveragePrice(alcohol) {
    return (alcohol.low + alcohol.high) / 2;
  }

  function getScalePercent(price, maxPrice) {
    return clamp((price / maxPrice) * 100, 0, 100);
  }

  function formatPriceRange(low, high) {
    return `$${formatPrice(low)} - $${formatPrice(high)}`;
  }

  function formatPrice(price) {
    return Number(price).toFixed(Number.isInteger(price) ? 0 : 2);
  }

  function initMap() {
    if (!window.L) {
      setSearchStatus("Map tools are loading. Refresh if the map does not appear.");
      return;
    }

    const bounds = getFloridaBounds();

    state.map = L.map(els.mapBoard, {
      zoomControl: false,
      maxBounds: bounds,
      maxBoundsViscosity: 0.92,
      minZoom: 6,
      maxZoom: 18,
    });

    L.control.zoom({ position: "bottomright" }).addTo(state.map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(state.map);

    drawMapGrid();
    state.markerLayer = L.layerGroup().addTo(state.map);
    state.map.fitBounds(bounds, { padding: [18, 18] });

    state.map.on("click", (event) => {
      if (!state.placing) {
        return;
      }

      openPinDialog({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    });

    refreshMapSize();
  }

  async function handleLocationSearch(event) {
    event.preventDefault();

    const query = els.locationSearch.value.trim();
    if (!query) {
      setSearchStatus("Enter a venue, road, or address.");
      return;
    }

    setSearchStatus("Searching the map...");

    try {
      const result = await findLocation(query);
      if (!result) {
        setSearchStatus("No result found in Florida.");
        return;
      }

      const [resultLng, resultLat] = result.geometry.coordinates;
      const point = {
        lat: Number(resultLat),
        lng: Number(resultLng),
      };
      const name = getResultName(result);

      if (state.searchMarker) {
        state.map.removeLayer(state.searchMarker);
      }

      state.searchMarker = L.marker([point.lat, point.lng], { icon: createSearchIcon() })
        .addTo(state.map)
        .bindPopup(`<strong>${escapeHtml(name)}</strong><br>${escapeHtml(getResultDescription(result))}`)
        .openPopup();

      state.map.flyTo([point.lat, point.lng], Math.max(state.map.getZoom(), 14), { duration: 0.8 });
      state.placing = false;
      setSearchStatus("Result found. Add details to save the pin.");
      renderMode();
      openPinDialog(point, {
        name,
        description: getResultDescription(result),
      });
    } catch {
      setSearchStatus("Location search could not connect. Try clicking the map instead.");
    }
  }

  async function findLocation(query) {
    const params = new URLSearchParams({
      q: `${query}, Florida`,
      lat: "28.45",
      lon: "-82.20",
      limit: "8",
    });

    const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Search failed");
    }

    const data = await response.json();
    return (data.features || []).find((result) => {
      const [lng, lat] = result.geometry.coordinates;
      return lat <= MAP_BOUNDS.north && lat >= MAP_BOUNDS.south && lng >= MAP_BOUNDS.west && lng <= MAP_BOUNDS.east;
    });
  }

  function getResultName(result) {
    const properties = result.properties || {};
    return (properties.name || properties.street || properties.city || "Karaoke Location").trim();
  }

  function getResultDescription(result) {
    const properties = result.properties || {};
    const description = [
      properties.name,
      properties.street,
      properties.city,
      properties.state,
      properties.country,
    ].filter(Boolean).join(", ");

    return description || "Found on the live map.";
  }

  function createPinIcon() {
    return L.divIcon({
      className: "quest-pin-icon",
      html: "<span></span>",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -20],
    });
  }

  function createSearchIcon() {
    return L.divIcon({
      className: "quest-search-icon",
      html: "<span></span>",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -16],
    });
  }

  function drawMapGrid() {
    const gridPane = state.map.createPane("questGridPane");
    gridPane.style.zIndex = 425;
    gridPane.style.pointerEvents = "none";

    state.gridLayer = L.layerGroup([], { pane: "questGridPane" }).addTo(state.map);

    for (let lat = 25; lat <= 31; lat += 1) {
      L.polyline(
        [
          [lat, MAP_BOUNDS.west],
          [lat, MAP_BOUNDS.east],
        ],
        getGridLineOptions(lat % 2 === 0)
      ).addTo(state.gridLayer);
    }

    for (let lng = -87; lng <= -80; lng += 1) {
      L.polyline(
        [
          [MAP_BOUNDS.south, lng],
          [MAP_BOUNDS.north, lng],
        ],
        getGridLineOptions(lng % 2 === 0)
      ).addTo(state.gridLayer);
    }
  }

  function getGridLineOptions(isMajorLine) {
    return {
      pane: "questGridPane",
      interactive: false,
      bubblingMouseEvents: false,
      className: "quest-map-grid-line",
      color: isMajorLine ? "rgba(92, 43, 18, 0.44)" : "rgba(92, 43, 18, 0.26)",
      dashArray: isMajorLine ? "10 12" : "5 14",
      lineCap: "round",
      lineJoin: "round",
      opacity: 0.92,
      weight: isMajorLine ? 1.4 : 1,
    };
  }

  function refreshMapSize() {
    if (!state.map) {
      return;
    }

    window.setTimeout(() => state.map.invalidateSize(), 0);
  }

  function fitFloridaMap() {
    if (!state.map) {
      return;
    }

    window.setTimeout(() => {
      state.map.invalidateSize();
      state.map.fitBounds(getFloridaBounds(), { padding: [18, 18] });
    }, 0);
  }

  function getFloridaBounds() {
    return [
      [MAP_BOUNDS.south, MAP_BOUNDS.west],
      [MAP_BOUNDS.north, MAP_BOUNDS.east],
    ];
  }

  function setSearchStatus(message) {
    if (els.locationSearchStatus) {
      els.locationSearchStatus.textContent = message;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  }

  function readPins() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.pins) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persistPins() {
    localStorage.setItem(STORAGE_KEYS.pins, JSON.stringify(state.pins));
  }

  function hasActiveSession() {
    return localStorage.getItem(STORAGE_KEYS.auth) === LOGIN_CREDENTIALS.authToken;
  }

  function formatDegrees(lat, lng) {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(4)}\u00B0 ${latDir}, ${Math.abs(lng).toFixed(4)}\u00B0 ${lngDir}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
