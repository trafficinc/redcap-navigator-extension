import { buildRecordUrl } from "./urls.js";
import { getRecent, saveRecentList } from "./storage.js";

export async function saveRecentRecord(state, record) {
  if (!state.settings.enableRecentTracking) {
    return;
  }

  const current = await getRecent();

  const deduped = current.filter((item) => {
    return !(
      String(item.pid) === String(record.pid) &&
      String(item.recordId) === String(record.recordId) &&
      String(item.page || "") === String(record.page || "") &&
      String(item.arm || "") === String(record.arm || "")
    );
  });

  deduped.unshift(record);

  await saveRecentList(deduped.slice(0, 12));
}

export async function renderRecent(container, state) {
  container.innerHTML = "";

  const recent = await getRecent();

  for (const item of recent) {
    const li = document.createElement("li");

    const span = document.createElement("span");
    const friendlyPage = item.formLabel || item.page || "";
    span.textContent =
      `${item.pid} / ${item.recordId} / ${friendlyPage}`.trim();

    const actions = document.createElement("div");
    actions.className = "buttons";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", async () => {
      const server = {
        url: item.serverUrl,
        version: item.serverVersion || "",
      };

      const url = buildRecordUrl(
        server,
        item.pid,
        item.recordId,
        item.page || "",
        item.arm || "",
      );

      const reuseCurrentTab =
        typeof state?.settings?.reuseCurrentTab === "boolean"
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
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const current = await getRecent();
      const filtered = current.filter((entry) => {
        return !(
          String(entry.pid) === String(item.pid) &&
          String(entry.recordId) === String(item.recordId) &&
          String(entry.page || "") === String(item.page || "")
        );
      });
      await saveRecentList(filtered);
      await renderRecent(container, state);
    });

    actions.appendChild(openBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(span);
    li.appendChild(actions);
    container.appendChild(li);
  }
}
