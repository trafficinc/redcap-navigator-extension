import { buildRecordUrl } from "./urls.js";
import { getFormsPages, saveFormsPagesList } from "./storage.js";

export async function saveFormPage(state, formPage) {
  const current = await getFormsPages();

  const deduped = current.filter((item) => {
    return !(
      String(item.pid) === String(formPage.pid) &&
      String(item.page || "") === String(formPage.page || "") &&
      String(item.serverUrl || "") === String(formPage.serverUrl || "") &&
      String(item.serverVersion || "") === String(formPage.serverVersion || "")
    );
  });

  deduped.unshift(formPage);

  await saveFormsPagesList(deduped.slice(0, 20));
}

export async function renderFormsPages(container, state) {
  container.innerHTML = "";

  const formsPages = await getFormsPages();

  if (!formsPages.length) {
    container.innerHTML = `<li class="empty-state">No forms/pages saved</li>`;
    return;
  }

  for (const item of formsPages) {
    const li = document.createElement("li");

    const span = document.createElement("span");
    const label = item.formLabel || item.page || "";
    span.textContent = `${item.pid} / ${label}`.trim();

    const actions = document.createElement("div");
    actions.className = "item-actions favorite-actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-sm favorite-btn favorite-btn-open";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", async () => {
      const server = {
        url: item.serverUrl,
        version: item.serverVersion || "",
      };

      const url = buildRecordUrl(
        server,
        item.pid,
        item.recordId || "",
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
    deleteBtn.className = "btn btn-sm favorite-btn favorite-btn-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const current = await getFormsPages();
      const filtered = current.filter((entry) => {
        return !(
          String(entry.pid) === String(item.pid) &&
          String(entry.page || "") === String(item.page || "") &&
          String(entry.serverUrl || "") === String(item.serverUrl || "") &&
          String(entry.serverVersion || "") === String(item.serverVersion || "")
        );
      });

      await saveFormsPagesList(filtered);
      await renderFormsPages(container, state);
    });

    actions.appendChild(openBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(span);
    li.appendChild(actions);
    container.appendChild(li);
  }
}