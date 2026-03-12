export function applyDarkMode(enabled) {
  const darkMode = Boolean(enabled);
  document.body.classList.toggle("light", !darkMode);

  const toggleBtn = document.getElementById("toggleDark");
  if (toggleBtn) {
    toggleBtn.textContent = darkMode ? "☀" : "🌙";
    toggleBtn.title = darkMode ? "Switch to light mode" : "Switch to dark mode";
  }
}

export function setContextSummary(el, context, currentServer) {
  if (!el) return;

  if (!context) {
    el.textContent = "No REDCap tab detected.";
    return;
  }

  const lines = [
    `Type: ${context.type || "unknown"}`,
    `PID: ${context.pid || "-"}`,
    `Record: ${context.recordId || "-"}`,
    `Form/Page: ${context.page || context.formLabel || "-"}`,
    `Report: ${context.reportId || context.reportLabel || "-"}`,
    `Detected Server: ${context.serverUrl || "-"}`,
    `Detected Version: ${context.version || "-"}`,
    `Selected Server: ${currentServer?.url || "-"}${currentServer?.version ? ` (v${currentServer.version})` : ""}`,
    `Title: ${context.tabTitle || "-"}`
  ];

  el.innerHTML = lines.map(line => `<div>${escapeHtml(line)}</div>`).join("");
}

export function syncInputsFromContext(ui, context) {
  ui.projectInput.value = context?.pid || "";
  ui.recordInput.value = context?.recordId || "";
  ui.formInput.value = context?.page || "";
   if (ui.armInput) {
    ui.armInput.value = context?.arm || "";
  }
}

export function setServerInfo(el, server) {
  if (!el) return;
  if (!server) {
    el.textContent = "";
    return;
  }

  el.textContent = `${server.url || ""}${server.version ? ` • v${server.version}` : ""}`;
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}