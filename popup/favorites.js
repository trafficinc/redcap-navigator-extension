import { buildProjectUrl } from "./urls.js";
import { getFavorites, saveFavorites, getSettings } from "./storage.js";

async function openUrl(url) {
  if (!url || typeof url !== "string") return;

  const settings = await getSettings();
  const reuseCurrentTab =
    typeof settings.reuseCurrentTab === "boolean"
      ? settings.reuseCurrentTab
      : false;

  if (reuseCurrentTab) {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (tab?.id) {
      await chrome.tabs.update(tab.id, { url });
      window.close();
      return;
    }
  }

  await chrome.tabs.create({ url });
}

export async function renderFavorites(container, state) {
  container.innerHTML = "";

  if (!state.settings.enableFavorites) {
    return;
  }

  const favorites = await getFavorites();

  for (const item of favorites) {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.className = "item-label";
    const label = item.name || item.projectLabel || `Project ${item.pid}`;
    span.textContent = `${item.pid} ${label}`.trim();

    const actions = document.createElement("div");
    actions.className = "item-actions favorite-actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-sm favorite-btn favorite-btn-open";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", async () => {
      const server = {
        url: item.serverUrl,
        version: item.serverVersion || ""
      };

      await openUrl(buildProjectUrl(server, item.pid));
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-sm favorite-btn favorite-btn-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      await deleteFavorite(item.pid, item.serverUrl, item.serverVersion);
      await renderFavorites(container, state);
    });

    actions.appendChild(openBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(span);
    li.appendChild(actions);
    container.appendChild(li);
  }
}

export async function addFavoriteFromContext(state, nameOverride = "") {
  if (!state.settings.enableFavorites) {
    alert("Favorites are disabled in settings.");
    return;
  }

  const context = state.detectedContext;
  const pid = context?.pid || state.ui.projectInput.value.trim();

  if (!pid) {
    alert("Project ID required.");
    return;
  }

  const server = state.currentServer;
  if (!server?.url) {
    alert("No server selected.");
    return;
  }

  const name =
    typeof nameOverride === "string" && nameOverride.length
      ? nameOverride
      : (window.prompt("Project name", context?.projectLabel || "") ?? null);

  if (name === null) return;

  const favorites = await getFavorites();

  const filtered = favorites.filter((item) => {
    return !(
      String(item.pid) === String(pid) &&
      String(item.serverUrl || "") === String(server.url || "") &&
      String(item.serverVersion || "") === String(server.version || "")
    );
  });

  filtered.push({
    pid: String(pid),
    name: String(name || "").trim(),
    projectLabel: context?.projectLabel || "",
    serverUrl: server.url || "",
    serverVersion: server.version || "",
  });

  await saveFavorites(filtered);
}

export async function deleteFavorite(pid, serverUrl = "", serverVersion = "") {
  const favorites = await getFavorites();

  const filtered = favorites.filter((item) => {
    return !(
      String(item.pid) === String(pid) &&
      String(item.serverUrl || "") === String(serverUrl || "") &&
      String(item.serverVersion || "") === String(serverVersion || "")
    );
  });

  await saveFavorites(filtered);
}
