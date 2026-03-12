chrome.runtime.onInstalled.addListener(async () => {
  const syncData = await chrome.storage.sync.get([
    "servers",
    "defaultServerUrl",
    "defaultVersion",
    "enableRecentTracking",
    "enableFavorites",
    "autoDetectVersion",
  ]);

  const servers = Array.isArray(syncData.servers) ? syncData.servers : [];

  if (!servers.length) {
    await chrome.storage.sync.set({
      servers: [
        {
          name: "Default",
          url: "https://redcap.myinstitution.edu",
          version: "",
        },
      ],
    });
  }

  if (typeof syncData.reuseCurrentTab !== "boolean") {
    await chrome.storage.sync.set({ reuseCurrentTab: false });
  }

  if (typeof syncData.enableRecentTracking !== "boolean") {
    await chrome.storage.sync.set({ enableRecentTracking: true });
  }

  if (typeof syncData.enableFavorites !== "boolean") {
    await chrome.storage.sync.set({ enableFavorites: true });
  }

  if (typeof syncData.autoDetectVersion !== "boolean") {
    await chrome.storage.sync.set({ autoDetectVersion: true });
  }

  if (!syncData.defaultServerUrl) {
    await chrome.storage.sync.set({
      defaultServerUrl: "https://redcap.myinstitution.edu",
    });
  }

  if (typeof syncData.defaultVersion !== "string") {
    await chrome.storage.sync.set({ defaultVersion: "" });
  }
});
