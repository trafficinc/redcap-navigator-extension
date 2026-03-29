document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("serverTable");
  const addServerBtn = document.getElementById("addServer");
  const saveBtn = document.getElementById("saveSettings");
  const clearRecentBtn = document.getElementById("clearRecentRecords");
  const resetSettingsBtn = document.getElementById("resetSettings");

  const defaultServerUrlInput = document.getElementById("defaultServerUrl");
  const defaultVersionInput = document.getElementById("defaultVersion");

  const enableRecentTrackingInput = document.getElementById(
    "enableRecentTracking",
  );
  const enableFavoritesInput = document.getElementById("enableFavorites");
  const enableDarkModeInput = document.getElementById("enableDarkMode");
  const autoDetectVersionInput = document.getElementById("autoDetectVersion");
  const reuseCurrentTabInput = document.getElementById("reuseCurrentTab");

  const exportBackupBtn = document.getElementById("exportBackup");
  const importBackupBtn = document.getElementById("importBackup");
  const importBackupFileInput = document.getElementById("importBackupFile");

  const DEFAULT_SERVER = {
    name: "Default",
    url: "https://redcap.myinstitution.edu",
    version: "",
  };

  let servers = [];

  function normalizeServer(record = {}) {
    return {
      name: String(record.name || "").trim(),
      url: String(record.url || "").trim(),
      version: String(record.version || "").trim(),
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function downloadTextFile(filename, content, mimeType = "application/json") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function normalizeFavorites(list) {
    if (!Array.isArray(list)) return [];

    return list
      .map((item) => ({
        pid: String(item?.pid || "").trim(),
        name: String(item?.name || "").trim(),
        projectLabel: String(item?.projectLabel || "").trim(),
        serverUrl: String(item?.serverUrl || "").trim(),
        serverVersion: String(item?.serverVersion || "").trim(),
      }))
      .filter((item) => item.pid && item.serverUrl);
  }

  function normalizeImportedSettings(data) {
    const cleanedServers = Array.isArray(data?.servers)
      ? data.servers.map(normalizeServer).filter((s) => s.url)
      : [];

    return {
      servers: cleanedServers.length ? cleanedServers : [DEFAULT_SERVER],
      defaultServerUrl: String(data?.defaultServerUrl || "").trim(),
      defaultVersion: String(data?.defaultVersion || "").trim(),
      enableRecentTracking:
        typeof data?.enableRecentTracking === "boolean"
          ? data.enableRecentTracking
          : true,
      enableFavorites:
        typeof data?.enableFavorites === "boolean"
          ? data.enableFavorites
          : true,
      autoDetectVersion:
        typeof data?.autoDetectVersion === "boolean"
          ? data.autoDetectVersion
          : true,
      reuseCurrentTab:
        typeof data?.reuseCurrentTab === "boolean"
          ? data.reuseCurrentTab
          : false,
      darkMode: typeof data?.darkMode === "boolean" ? data.darkMode : false,
      favorites: normalizeFavorites(data?.favorites),
    };
  }

  async function loadSettings() {
    const syncData = await chrome.storage.sync.get([
      "servers",
      "defaultServerUrl",
      "defaultVersion",
      "enableRecentTracking",
      "enableFavorites",
      "autoDetectVersion",
      "reuseCurrentTab",
    ]);

    reuseCurrentTabInput.checked =
      typeof syncData.reuseCurrentTab === "boolean"
        ? syncData.reuseCurrentTab
        : false;

    const localData = await chrome.storage.local.get(["darkMode"]);

    servers = Array.isArray(syncData.servers)
      ? syncData.servers.map(normalizeServer)
      : [];

    if (!servers.length) {
      servers = [DEFAULT_SERVER];
      await chrome.storage.sync.set({ servers });
    }

    defaultServerUrlInput.value =
      syncData.defaultServerUrl || servers[0].url || DEFAULT_SERVER.url;
    defaultVersionInput.value = syncData.defaultVersion || "";

    enableRecentTrackingInput.checked =
      typeof syncData.enableRecentTracking === "boolean"
        ? syncData.enableRecentTracking
        : true;

    enableFavoritesInput.checked =
      typeof syncData.enableFavorites === "boolean"
        ? syncData.enableFavorites
        : true;

    autoDetectVersionInput.checked =
      typeof syncData.autoDetectVersion === "boolean"
        ? syncData.autoDetectVersion
        : true;

    enableDarkModeInput.checked = Boolean(localData.darkMode);

    renderServers();
  }

  function renderServers() {
    table.innerHTML = "";

    servers.forEach((server, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><input type="text" data-field="name" data-index="${index}" value="${escapeHtml(server.name)}"></td>
        <td><input type="text" data-field="url" data-index="${index}" value="${escapeHtml(server.url)}"></td>
        <td><input type="text" data-field="version" data-index="${index}" value="${escapeHtml(server.version)}"></td>
        <td><button type="button" data-delete="${index}">Delete</button></td>
      `;

      table.appendChild(tr);
    });

    table.querySelectorAll("input[data-field]").forEach((input) => {
      input.addEventListener("input", (event) => {
        const el = event.currentTarget;
        const index = Number.parseInt(el.dataset.index, 10);
        const field = el.dataset.field;
        if (!servers[index] || !field) return;
        servers[index][field] = el.value;
      });
    });

    table.querySelectorAll("button[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number.parseInt(btn.dataset.delete, 10);
        servers.splice(index, 1);
        if (!servers.length) {
          servers = [DEFAULT_SERVER];
        }
        renderServers();
      });
    });
  }

  function addServer() {
    servers.push({
      name: "",
      url: "https://",
      version: "",
    });
    renderServers();
  }

  async function saveSettings() {
    const cleanedServers = servers
      .map(normalizeServer)
      .filter((server) => server.url);

    if (!cleanedServers.length) {
      alert("At least one server URL is required.");
      return;
    }

    await chrome.storage.sync.set({
      servers: cleanedServers,
      defaultServerUrl:
        defaultServerUrlInput.value.trim() || cleanedServers[0].url,
      defaultVersion: defaultVersionInput.value.trim(),
      enableRecentTracking: enableRecentTrackingInput.checked,
      enableFavorites: enableFavoritesInput.checked,
      autoDetectVersion: autoDetectVersionInput.checked,
      reuseCurrentTab: reuseCurrentTabInput.checked,
    });

    await chrome.storage.local.set({
      darkMode: enableDarkModeInput.checked,
    });

    alert("Settings saved");
  }

  async function clearRecentRecords() {
    await chrome.storage.local.remove(["recent"]);
    alert("Recent records cleared");
  }

  async function resetSettings() {
    if (!confirm("Reset all REDCap Navigator settings?")) return;

    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();

    await chrome.storage.sync.set({
      servers: [DEFAULT_SERVER],
      defaultServerUrl: DEFAULT_SERVER.url,
      defaultVersion: "",
      enableRecentTracking: true,
      enableFavorites: true,
      autoDetectVersion: true,
      reuseCurrentTab: false,
    });

    await chrome.storage.local.set({
      darkMode: false,
    });

    await loadSettings();
    alert("Settings reset");
  }

  async function exportBackup() {
    const syncData = await chrome.storage.sync.get([
      "servers",
      "defaultServerUrl",
      "defaultVersion",
      "enableRecentTracking",
      "enableFavorites",
      "autoDetectVersion",
      "reuseCurrentTab",
      "favorites",
    ]);

    const localData = await chrome.storage.local.get(["darkMode"]);

    const backup = {
      app: "REDCap Navigator",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        servers:
          Array.isArray(syncData.servers) && syncData.servers.length
            ? syncData.servers.map(normalizeServer)
            : [DEFAULT_SERVER],
        defaultServerUrl: syncData.defaultServerUrl || DEFAULT_SERVER.url,
        defaultVersion: syncData.defaultVersion || "",
        enableRecentTracking:
          typeof syncData.enableRecentTracking === "boolean"
            ? syncData.enableRecentTracking
            : true,
        enableFavorites:
          typeof syncData.enableFavorites === "boolean"
            ? syncData.enableFavorites
            : true,
        autoDetectVersion:
          typeof syncData.autoDetectVersion === "boolean"
            ? syncData.autoDetectVersion
            : true,
        reuseCurrentTab:
          typeof syncData.reuseCurrentTab === "boolean"
            ? syncData.reuseCurrentTab
            : false,
        darkMode: Boolean(localData.darkMode),
        favorites: normalizeFavorites(syncData.favorites),
      },
    };

    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `redcap-navigator-backup-${stamp}.json`,
      JSON.stringify(backup, null, 2),
    );
  }

  async function importBackupFile(file) {
    if (!file) return;

    const text = await file.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      alert("Import failed. The selected file is not valid JSON.");
      return;
    }

    if (
      !parsed ||
      parsed.app !== "REDCap Navigator" ||
      !parsed.settings ||
      typeof parsed.settings !== "object"
    ) {
      alert(
        "Import failed. This does not look like a REDCap Navigator backup file.",
      );
      return;
    }

    const imported = normalizeImportedSettings(parsed.settings);

    await chrome.storage.sync.set({
      servers: imported.servers,
      defaultServerUrl:
        imported.defaultServerUrl ||
        imported.servers[0].url ||
        DEFAULT_SERVER.url,
      defaultVersion: imported.defaultVersion,
      enableRecentTracking: imported.enableRecentTracking,
      enableFavorites: imported.enableFavorites,
      autoDetectVersion: imported.autoDetectVersion,
      reuseCurrentTab: imported.reuseCurrentTab,
      favorites: imported.favorites,
    });

    await chrome.storage.local.set({
      darkMode: imported.darkMode,
    });

    await loadSettings();
    alert("Backup imported successfully.");
  }

  addServerBtn?.addEventListener("click", addServer);
  saveBtn?.addEventListener("click", saveSettings);
  clearRecentBtn?.addEventListener("click", clearRecentRecords);
  resetSettingsBtn?.addEventListener("click", resetSettings);

  exportBackupBtn?.addEventListener("click", exportBackup);

  importBackupBtn?.addEventListener("click", () => {
    importBackupFileInput?.click();
  });

  importBackupFileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    await importBackupFile(file);

    event.target.value = "";
  });

  loadSettings().catch((err) => {
    console.error("Failed to load settings", err);
  });
});
