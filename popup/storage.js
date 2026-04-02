export const DEFAULT_SERVER = {
  name: "Default",
  url: "https://redcap.myinstitution.edu",
  version: ""
};

export async function getSettings() {
  const syncData = await chrome.storage.sync.get([
    "servers",
    "defaultServerUrl",
    "defaultVersion",
    "enableRecentTracking",
    "enableFavorites",
    "autoDetectVersion",
    "aliases",
    "reuseCurrentTab"
  ]);

  const localData = await chrome.storage.local.get([
    "selectedServerUrl",
    "darkMode",
    "recent",
    "formsPages"
  ]);

  const servers = Array.isArray(syncData.servers) && syncData.servers.length
    ? syncData.servers
    : [DEFAULT_SERVER];

  return {
    servers,
    defaultServerUrl: syncData.defaultServerUrl || servers[0].url || DEFAULT_SERVER.url,
    defaultVersion: typeof syncData.defaultVersion === "string" ? syncData.defaultVersion : "",
    enableRecentTracking: typeof syncData.enableRecentTracking === "boolean" ? syncData.enableRecentTracking : true,
    enableFavorites: typeof syncData.enableFavorites === "boolean" ? syncData.enableFavorites : true,
    autoDetectVersion: typeof syncData.autoDetectVersion === "boolean" ? syncData.autoDetectVersion : true,
    reuseCurrentTab:
      typeof syncData.reuseCurrentTab === "boolean"
        ? syncData.reuseCurrentTab
        : false,
    selectedServerUrl: localData.selectedServerUrl || "",
    darkMode: Boolean(localData.darkMode),
    aliases: syncData.aliases || {},
    recent: Array.isArray(localData.recent) ? localData.recent : [],
    formsPages: Array.isArray(localData.formsPages) ? localData.formsPages : []
  };
}

export async function saveSelectedServerUrl(url) {
  await chrome.storage.local.set({ selectedServerUrl: url || "" });
}

export async function getFavorites() {
  const data = await chrome.storage.sync.get(["favorites"]);
  return Array.isArray(data.favorites) ? data.favorites : [];
}

export async function saveFavorites(favorites) {
  await chrome.storage.sync.set({ favorites });
}

export async function getRecent() {
  const data = await chrome.storage.local.get(["recent"]);
  return Array.isArray(data.recent) ? data.recent : [];
}

export async function saveRecentList(recent) {
  await chrome.storage.local.set({ recent });
}

export async function getFormsPages() {
  const data = await chrome.storage.local.get(["formsPages"]);
  return Array.isArray(data.formsPages) ? data.formsPages : [];
}

export async function saveFormsPagesList(formsPages) {
  await chrome.storage.local.set({ formsPages });
}

export async function setDarkMode(darkMode) {
  await chrome.storage.local.set({ darkMode: Boolean(darkMode) });
}

export async function mergeAliasesFromContext(context) {
  if (!context?.pid) return;

  const data = await chrome.storage.sync.get(["aliases"]);
  const aliases = data.aliases || {};
  const pid = String(context.pid);

  if (!aliases[pid]) {
    aliases[pid] = {
      forms: {},
      reports: {}
    };
  }

  if (context.page && context.formLabel) {
    aliases[pid].forms[context.page] = context.formLabel;
  }

  if (context.reportId && context.reportLabel) {
    aliases[pid].reports[context.reportId] = context.reportLabel;
  }

  await chrome.storage.sync.set({ aliases });
}