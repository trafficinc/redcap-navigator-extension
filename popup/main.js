import {
  getSettings,
  saveSelectedServerUrl,
  setDarkMode,
  mergeAliasesFromContext,
} from "./storage.js";
import {
  buildProjectUrl,
  buildRecordUrl,
  buildDashboardUrl,
  buildToolUrl,
} from "./urls.js";
import { detectActiveRedcapContext } from "./context.js";
import { renderFavorites, addFavoriteFromContext } from "./favorites.js";
import { renderRecent, saveRecentRecord } from "./recents.js";
import { renderFormsPages, saveFormPage } from "./forms-pages.js";
import { runCommand } from "./commands.js";
import {
  applyDarkMode,
  setContextSummary,
  syncInputsFromContext,
  setServerInfo,
} from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  const ui = {
    serverSelect: document.getElementById("serverSelect"),
    serverInfo: document.getElementById("serverInfo"),
    projectInput: document.getElementById("projectId"),
    recordInput: document.getElementById("recordId"),
    formInput: document.getElementById("formName"),
    favoritesList: document.getElementById("favorites"),
    recentList: document.getElementById("recentRecords"),
    formsPagesList: document.getElementById("savedFormsPages"),
    commandPaletteSection: document.getElementById("commandPaletteSection"),
    toggleCommandPaletteBtn: document.getElementById("toggleCommandPalette"),
    closeCommandPaletteBtn: document.getElementById("closeCommandPalette"),
    commandInput: document.getElementById("commandInput"),
    runCommandBtn: document.getElementById("runCommand"),
    detectedContextSummary: document.getElementById("detectedContextSummary"),
    useDetectedContextBtn: document.getElementById("useDetectedContext"),
    addCurrentProjectBtn: document.getElementById("addCurrentProject"),
    addCurrentRecordBtn: document.getElementById("addCurrentRecord"),
    addCurrentFormPageBtn: document.getElementById("addCurrentFormPage"),
    openRecordBtn: document.getElementById("openRecord"),
    dashboardBtn: document.getElementById("recordDashboard"),
    addFavoriteBtn: document.getElementById("addFavorite"),
    copyProjectUrlBtn: document.getElementById("copyProjectUrl"),
    copyRecordUrlBtn: document.getElementById("copyRecordUrl"),
    toggleDarkBtn: document.getElementById("toggleDark"),
    armInput: document.getElementById("armId"),
  };

  const state = {
    settings: await getSettings(),
    detectedContext: null,
    currentServer: null,
    ui,
  };



  const utilitiesStatus = document.getElementById("utilities-status");
  let utilitiesStatusTimer = null;

  function showUtilitiesStatus(message) {
    if (!utilitiesStatus) return;

    utilitiesStatus.textContent = message;
    utilitiesStatus.classList.add("show");

    if (utilitiesStatusTimer) {
      clearTimeout(utilitiesStatusTimer);
    }

    utilitiesStatusTimer = setTimeout(() => {
      utilitiesStatus.textContent = "";
      utilitiesStatus.classList.remove("show");
    }, 1500);
  }



  async function openUrl(url) {
    if (!url || typeof url !== "string") return;

    const reuseCurrentTab =
      typeof state.settings.reuseCurrentTab === "boolean"
        ? state.settings.reuseCurrentTab
        : false;

    if (reuseCurrentTab) {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab?.id) {
        await chrome.tabs.update(tab.id, { url });
        window.close();
        return;
      }
    }

    await chrome.tabs.create({ url });
  }

  function findSelectedServer() {
    const index = Number.parseInt(ui.serverSelect.value, 10);
    if (!Number.isNaN(index) && state.settings.servers[index]) {
      return state.settings.servers[index];
    }

    const saved = state.settings.servers.find(
      (server) => server.url === state.settings.selectedServerUrl,
    );
    if (saved) return saved;

    return (
      state.settings.servers[0] || {
        url: state.settings.defaultServerUrl,
        version: state.settings.defaultVersion || "",
      }
    );
  }

  function getEffectiveServer() {
    const selected = findSelectedServer();

    if (state.settings.autoDetectVersion && state.detectedContext?.serverUrl) {
      return {
        url:
          state.detectedContext.serverUrl ||
          selected?.url ||
          state.settings.defaultServerUrl,
        version:
          state.detectedContext.version ||
          selected?.version ||
          state.settings.defaultVersion ||
          "",
      };
    }

    if (selected?.url) {
      return {
        url: selected.url,
        version: selected.version || state.settings.defaultVersion || "",
      };
    }

    return {
      url: state.settings.defaultServerUrl,
      version: state.settings.defaultVersion || "",
    };
  }

  function populateServers() {
    ui.serverSelect.innerHTML = "";

    state.settings.servers.forEach((server, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${server.name || `Server ${index + 1}`} (${server.url})${server.version ? ` • v${server.version}` : ""}`;
      ui.serverSelect.appendChild(option);
    });

    const matchIndex = state.settings.servers.findIndex(
      (server) => server.url === state.settings.selectedServerUrl,
    );
    ui.serverSelect.value = String(matchIndex === -1 ? 0 : matchIndex);
  }

  function refreshServerState() {
    state.currentServer = getEffectiveServer();
    setServerInfo(ui.serverInfo, state.currentServer);
    setContextSummary(
      ui.detectedContextSummary,
      state.detectedContext,
      state.currentServer,
    );
  }

  function requireProjectId() {
    const pid = ui.projectInput.value.trim();
    if (!pid) {
      alert("Project ID required.");
      ui.projectInput.focus();
      return null;
    }
    return pid;
  }

  async function detectAndPrefill() {
    state.detectedContext = await detectActiveRedcapContext();
    refreshServerState();

    if (state.detectedContext?.pid) {
      syncInputsFromContext(ui, state.detectedContext);
      await mergeAliasesFromContext(state.detectedContext);
    }
  }

  async function openProjectOrRecord() {
    const pid = requireProjectId();
    if (!pid) return;

    const rid = ui.recordInput.value.trim();
    const page = ui.formInput.value.trim();
    const arm = ui.armInput?.value.trim() || state.detectedContext?.arm || "";

    if (!rid) {
      await openUrl(buildProjectUrl(state.currentServer, pid));
      return;
    }

    await openUrl(buildRecordUrl(state.currentServer, pid, rid, page, arm));

    await saveRecentRecord(state, {
      pid,
      recordId: rid,
      page,
      arm,
      formLabel:
        state.detectedContext?.page === page
          ? state.detectedContext?.formLabel || ""
          : "",
      serverUrl: state.currentServer.url,
      serverVersion: state.currentServer.version || "",
    });

    await renderRecent(ui.recentList, state);
  }

  async function openDashboard() {
    const pid = requireProjectId();
    if (!pid) return;

    const rid = ui.recordInput.value.trim();
    const arm = ui.armInput?.value.trim() || state.detectedContext?.arm || "";

    await openUrl(buildDashboardUrl(state.currentServer, pid, rid, arm));
  }

  async function openTool(tool) {
    const pid = requireProjectId();
    if (!pid) return;

    const url = buildToolUrl(state.currentServer, pid, tool);
    if (!url) return;

    await openUrl(url);
  }

  async function copyProjectUrl() {
    const pid = requireProjectId();
    if (!pid) return;

    await navigator.clipboard.writeText(
      buildProjectUrl(state.currentServer, pid),
    );
    showUtilitiesStatus("Project URL copied");
  }

  async function copyRecordUrl() {
    const pid = requireProjectId();
    if (!pid) return;

    const rid = ui.recordInput.value.trim();
    const page = ui.formInput.value.trim();
    const arm = ui.armInput.value.trim() || "";
 
    const url = rid
      ? buildRecordUrl(state.currentServer, pid, rid, page, arm)
      : buildProjectUrl(state.currentServer, pid);

    await navigator.clipboard.writeText(url);

    if (rid === "") {
      showUtilitiesStatus("Record URL not found");
    } else {
      showUtilitiesStatus("Record URL copied");
    }
  }

  function openCommandPalette() {
    ui.commandPaletteSection?.classList.remove("hidden");
    ui.commandInput?.focus();
    ui.commandInput?.select();
  }

  function closeCommandPalette() {
    ui.commandPaletteSection?.classList.add("hidden");
  }

  function toggleCommandPalette() {
    if (ui.commandPaletteSection?.classList.contains("hidden")) {
      openCommandPalette();
    } else {
      closeCommandPalette();
    }
  }

  async function handleRunCommand() {
    const result = await runCommand(ui.commandInput.value, state);
    if (!result?.url) return;

    if (result.pid) {
      ui.projectInput.value = result.pid;
    }
    if (typeof result.recordId === "string") {
      ui.recordInput.value = result.recordId;
    }
    if (typeof result.page === "string") {
      ui.formInput.value = result.page;
    }

    if (result.recordId) {
      await saveRecentRecord(state, {
        pid: result.pid,
        recordId: result.recordId,
        page: result.page || "",
        arm: result.arm || state.detectedContext?.arm || "",
        formLabel: "",
        serverUrl: state.currentServer.url,
        serverVersion: state.currentServer.version || "",
      });

      await renderRecent(ui.recentList, state);
    }

    await openUrl(result.url);
    closeCommandPalette();
  }

  async function useDetectedContext() {
    if (!state.detectedContext?.pid) {
      alert("No REDCap context detected on the active tab.");
      return;
    }

    syncInputsFromContext(ui, state.detectedContext);
  }

  async function addCurrentProject() {
    if (!state.detectedContext?.pid) {
      alert("No REDCap project detected on the active tab.");
      return;
    }

    syncInputsFromContext(ui, state.detectedContext);
    await addFavoriteFromContext(
      state,
      state.detectedContext.projectLabel || "",
    );
    await renderFavorites(ui.favoritesList, state);
  }

  async function addCurrentRecord() {
    if (!state.detectedContext?.pid || !state.detectedContext?.recordId) {
      alert("No REDCap record detected on the active tab.");
      return;
    }

    syncInputsFromContext(ui, state.detectedContext);

    await saveRecentRecord(state, {
      pid: state.detectedContext.pid,
      recordId: state.detectedContext.recordId,
      projectTitle: state.detectedContext.projectLabel || "",
      page: state.detectedContext.page || "",
      arm: state.detectedContext.arm || "",
      formLabel: state.detectedContext.formLabel || "",
      serverUrl: state.currentServer.url,
      serverVersion: state.currentServer.version || "",
    });

    await renderRecent(ui.recentList, state);
  }

    async function addCurrentFormPage() {
      if (!state.detectedContext?.pid || !state.detectedContext?.page) {
        alert("No REDCap form/page detected on the active tab.");
        return;
      }

      syncInputsFromContext(ui, state.detectedContext);

      await saveFormPage(state, {
        pid: state.detectedContext.pid,
        recordId: state.detectedContext.recordId || "",
        page: state.detectedContext.page || "",
        arm: state.detectedContext.arm || "",
        formLabel: state.detectedContext.formLabel || "",
        serverUrl: state.currentServer.url,
        serverVersion: state.currentServer.version || "",
      });

      await renderFormsPages(ui.formsPagesList, state);
    }

  ui.serverSelect?.addEventListener("change", async () => {
    const selected = findSelectedServer();
    await saveSelectedServerUrl(selected?.url || "");
    state.settings.selectedServerUrl = selected?.url || "";
    refreshServerState();
  });

  ui.useDetectedContextBtn?.addEventListener("click", useDetectedContext);
  ui.addCurrentProjectBtn?.addEventListener("click", addCurrentProject);
  ui.addCurrentRecordBtn?.addEventListener("click", addCurrentRecord);
  ui.addCurrentFormPageBtn?.addEventListener("click", addCurrentFormPage);
  ui.openRecordBtn?.addEventListener("click", openProjectOrRecord);
  ui.dashboardBtn?.addEventListener("click", openDashboard);
  ui.addFavoriteBtn?.addEventListener("click", async () => {
    await addFavoriteFromContext(state, "");
    await renderFavorites(ui.favoritesList, state);
  });
  ui.copyProjectUrlBtn?.addEventListener("click", copyProjectUrl);
  ui.copyRecordUrlBtn?.addEventListener("click", copyRecordUrl);
  ui.toggleDarkBtn?.addEventListener("click", async () => {
    state.settings.darkMode = !state.settings.darkMode;
    await setDarkMode(state.settings.darkMode);
    applyDarkMode(state.settings.darkMode);
  });

  ui.toggleCommandPaletteBtn?.addEventListener("click", toggleCommandPalette);
  ui.closeCommandPaletteBtn?.addEventListener("click", closeCommandPalette);
  ui.runCommandBtn?.addEventListener("click", handleRunCommand);

  ui.commandInput?.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await handleRunCommand();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandPalette();
    }
  });

  document.addEventListener("keydown", async (event) => {
    if (event.ctrlKey && event.shiftKey && event.code === "Space") {
      event.preventDefault();
      openCommandPalette();
      return;
    }

    if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      await handleRunCommand();
      return;
    }

    if (event.key === "Escape" && document.activeElement !== ui.commandInput) {
      closeCommandPalette();
    }
  });

  document.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => openTool(btn.dataset.tool));
  });

  applyDarkMode(state.settings.darkMode);
  populateServers();
  await detectAndPrefill();
  await renderFavorites(ui.favoritesList, state);
  await renderRecent(ui.recentList, state);
  await renderFormsPages(ui.formsPagesList, state);
});
