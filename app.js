(function () {
  const STORAGE_KEYS = {
    pins: "karaokequest-cfl-pins",
    auth: "karaokequest-cfl-auth",
  };

  const CENTRAL_FLORIDA_BOUNDS = {
    north: 29.45,
    south: 27.15,
    west: -82.95,
    east: -80.35,
  };

  const state = {
    pins: readPins(),
    pendingPin: null,
    placing: false,
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
    pinLayer: document.getElementById("pinLayer"),
    pinCount: document.getElementById("pinCount"),
    activeModeText: document.getElementById("activeModeText"),
    dropPinButton: document.getElementById("dropPinButton"),
    ledgerDropPinButton: document.getElementById("ledgerDropPinButton"),
    clearPinsButton: document.getElementById("clearPinsButton"),
    mapView: document.getElementById("mapView"),
    ledgerView: document.getElementById("ledgerView"),
    ledgerList: document.getElementById("ledgerList"),
    tabs: Array.from(document.querySelectorAll(".tab-button")),
    pinDialog: document.getElementById("pinDialog"),
    pinForm: document.getElementById("pinForm"),
    locationName: document.getElementById("locationName"),
    locationDescription: document.getElementById("locationDescription"),
    pinCoordinates: document.getElementById("pinCoordinates"),
    cancelPinButton: document.getElementById("cancelPinButton"),
  };

  hydrateSession();
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
    els.clearPinsButton.addEventListener("click", clearPins);
    els.mapBoard.addEventListener("click", handleMapClick);
    els.mapBoard.addEventListener("keydown", handleMapKeydown);
    els.pinForm.addEventListener("submit", savePin);
    els.cancelPinButton.addEventListener("click", closePinDialog);
    els.pinDialog.addEventListener("cancel", () => {
      state.pendingPin = null;
    });
    els.tabs.forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });
  }

  function hydrateSession() {
    if (localStorage.getItem(STORAGE_KEYS.auth) === "true") {
      els.loginScreen.classList.add("hidden");
      els.appScreen.classList.remove("hidden");
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

    localStorage.setItem(STORAGE_KEYS.auth, "true");
    els.loginError.textContent = "";
    els.loginScreen.classList.add("hidden");
    els.appScreen.classList.remove("hidden");
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
    renderMode();
    els.mapBoard.focus();
  }

  function handleMapClick(event) {
    if (!state.placing || event.target.closest(".pin-marker")) {
      return;
    }

    const point = getMapPoint(event.clientX, event.clientY);
    openPinDialog(point);
  }

  function handleMapKeydown(event) {
    if (!state.placing || event.key !== "Enter") {
      return;
    }

    openPinDialog({
      xPercent: 50,
      yPercent: 50,
      lat: (CENTRAL_FLORIDA_BOUNDS.north + CENTRAL_FLORIDA_BOUNDS.south) / 2,
      lng: (CENTRAL_FLORIDA_BOUNDS.west + CENTRAL_FLORIDA_BOUNDS.east) / 2,
    });
  }

  function openPinDialog(point) {
    state.pendingPin = point;
    els.locationName.value = "";
    els.locationDescription.value = "";
    els.pinCoordinates.textContent = formatDegrees(point.lat, point.lng);
    els.pinDialog.showModal();
    window.setTimeout(() => els.locationName.focus(), 0);
  }

  function closePinDialog() {
    state.pendingPin = null;
    els.pinDialog.close();
    els.mapBoard.focus();
  }

  function savePin(event) {
    event.preventDefault();

    if (!state.pendingPin) {
      return;
    }

    const pin = {
      id: String(Date.now()),
      name: els.locationName.value.trim(),
      description: els.locationDescription.value.trim(),
      lat: state.pendingPin.lat,
      lng: state.pendingPin.lng,
      xPercent: state.pendingPin.xPercent,
      yPercent: state.pendingPin.yPercent,
      createdAt: new Date().toISOString(),
    };

    if (!pin.name || !pin.description) {
      return;
    }

    state.pins.push(pin);
    state.pendingPin = null;
    state.placing = false;
    persistPins();
    els.pinDialog.close();
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

  function deletePin(pinId) {
    state.pins = state.pins.filter((pin) => pin.id !== pinId);
    persistPins();
    render();
  }

  function getMapPoint(clientX, clientY) {
    const rect = els.mapBoard.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    const lat = CENTRAL_FLORIDA_BOUNDS.north - y * (CENTRAL_FLORIDA_BOUNDS.north - CENTRAL_FLORIDA_BOUNDS.south);
    const lng = CENTRAL_FLORIDA_BOUNDS.west + x * (CENTRAL_FLORIDA_BOUNDS.east - CENTRAL_FLORIDA_BOUNDS.west);

    return {
      xPercent: x * 100,
      yPercent: y * 100,
      lat,
      lng,
    };
  }

  function switchView(viewName) {
    const isLedger = viewName === "ledger";
    els.mapView.classList.toggle("hidden", isLedger);
    els.ledgerView.classList.toggle("hidden", !isLedger);
    els.tabs.forEach((tab) => {
      const active = tab.dataset.view === viewName;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-current", active ? "page" : "false");
    });
    render();
  }

  function render() {
    renderMode();
    renderPins();
    renderLedger();
  }

  function renderMode() {
    els.mapBoard.classList.toggle("placing", state.placing);
    els.dropPinButton.textContent = state.placing ? "Place Pin" : "Drop Pin";
    els.activeModeText.textContent = state.placing ? "Placing" : "Browse";
  }

  function renderPins() {
    els.pinCount.textContent = String(state.pins.length);
    els.pinLayer.innerHTML = "";

    state.pins.forEach((pin) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "pin-marker";
      marker.style.left = `${pin.xPercent}%`;
      marker.style.top = `${pin.yPercent}%`;
      marker.setAttribute("aria-label", `${pin.name}, ${formatDegrees(pin.lat, pin.lng)}`);

      const tooltip = document.createElement("span");
      tooltip.textContent = pin.name;
      marker.appendChild(tooltip);
      marker.addEventListener("click", () => {
        switchView("ledger");
        const row = document.querySelector(`[data-pin-id="${pin.id}"]`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });

      els.pinLayer.appendChild(marker);
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
        const card = document.createElement("article");
        card.className = "ledger-card";
        card.dataset.pinId = pin.id;

        const details = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = pin.name;
        const description = document.createElement("p");
        description.textContent = pin.description;
        details.append(title, description);

        const coordinates = document.createElement("p");
        coordinates.className = "ledger-coords";
        coordinates.textContent = formatDegrees(pin.lat, pin.lng);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "delete-button";
        button.setAttribute("aria-label", `Delete ${pin.name}`);
        button.textContent = "X";
        button.addEventListener("click", () => deletePin(pin.id));

        card.append(details, coordinates, button);
        els.ledgerList.appendChild(card);
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

  function formatDegrees(lat, lng) {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(4)}\u00B0 ${latDir}, ${Math.abs(lng).toFixed(4)}\u00B0 ${lngDir}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
