import { normalizeServerUrl } from "./urls.js";

function parseSearchParams(urlString) {
  const url = new URL(urlString);
  return {
    pid: url.searchParams.get("pid") || "",
    recordId: url.searchParams.get("id") || "",
    page: url.searchParams.get("page") || "",
    reportId: url.searchParams.get("report_id") || "",
  };
}

function detectServerFromPath(urlObj) {
  const pathname = urlObj.pathname;

  const versionMatch = pathname.match(/^(.*\/redcap)\/redcap_v([^/]+)\//i);
  if (versionMatch) {
    return {
      serverUrl: normalizeServerUrl(urlObj.origin + versionMatch[1]),
      version: versionMatch[2],
    };
  }

  const redcapMatch = pathname.match(/^(.*)\/redcap\//i);
  if (redcapMatch) {
    return {
      serverUrl: normalizeServerUrl(urlObj.origin + redcapMatch[1]),
      version: "",
    };
  }

  return {
    serverUrl: normalizeServerUrl(urlObj.origin),
    version: "",
  };
}

function detectPageType(pathname) {
  const lower = pathname.toLowerCase();

  if (lower.includes("/dataentry/index.php")) return "record";
  if (lower.includes("/dataentry/record_home.php")) return "dashboard";
  if (lower.includes("/design/online_designer.php")) return "designer";
  if (lower.includes("/design/data_dictionary.php")) return "codebook";
  if (lower.includes("/projectsetup/index.php")) return "project";
  if (lower.includes("/logging/index.php")) return "logs";
  if (lower.includes("/dataquality/index.php")) return "dq";
  if (lower.includes("/dataexport/index.php")) return "report";
  if (lower.endsWith("/index.php")) return "project";

  return "unknown";
}

function cleanLabel(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseRedcapUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname || "";
    const params = u.searchParams;

    const pid = params.get("pid") || "";
    const recordId = params.get("id") || "";
    const page = params.get("page") || "";
    const reportId = params.get("report_id") || "";
    const arm = params.get("arm") || "";

    const isRedcap =
      /\/redcap(\/|$)/i.test(path) ||
      /\/redcap_v[\d.]+(\/|$)/i.test(path);

    if (!isRedcap) {
      return { isRedcap: false };
    }

    let type = "project";

    if (/\/DataEntry\/index\.php$/i.test(path)) {
      type = "record";
    } else if (/\/DataEntry\/record_home\.php$/i.test(path)) {
      type = "recordHome";
    } else if (/\/DataExport\/index\.php$/i.test(path) && reportId) {
      type = "report";
    }

    return {
      isRedcap: true,
      type,
      pid,
      recordId,
      page,
      reportId,
      arm,
      url
    };
  } catch {
    return null;
  }
}

export async function detectActiveRedcapContext() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  const tab = tabs[0];
  if (!tab?.url) {
    return null;
  }

  const parsed = parseRedcapUrl(tab.url);
  if (!parsed?.isRedcap) {
    return null;
  }

  // Ensure arm is always present
  parsed.arm = parsed.arm || "";

  parsed.tabTitle = cleanLabel(tab.title || "");

  try {
    const execResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const text = (selector) => {
          const el = document.querySelector(selector);
          return el ? (el.textContent || "").trim() : "";
        };

        return {
          title: document.title || "",
          h1: text("h1"),
          h2: text("h2"),
          h3: text("h3"),
          activeNav:
            text(".jqbuttonmed.ui-state-active") ||
            text(".active") ||
            text(".dataEntryLabel") ||
            text(".subheader") ||
            text(".projtitle")
        };
      }
    });

    const meta = execResults?.[0]?.result || {};
    const title = cleanLabel(meta.title || parsed.tabTitle);
    const activeNav = cleanLabel(
      meta.activeNav || meta.h1 || meta.h2 || meta.h3 || ""
    );

    parsed.tabTitle = title;

    if (parsed.type === "record" && parsed.page) {
      parsed.formLabel = activeNav || title;
    }

    if (parsed.type === "report" && parsed.reportId) {
      parsed.reportLabel = activeNav || title;
    }

    parsed.projectLabel = cleanLabel(meta.h1 || meta.h2 || title);
  } catch {
    // ignore and keep URL-only context
  }

  return parsed;
}
