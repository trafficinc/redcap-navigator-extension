export function normalizeServerUrl(url) {
  let value = String(url || "").trim();

  if (!value) return "";

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  return value.replace(/\/+$/, "");
}

export function getServerPaths(server) {
  const root = normalizeServerUrl(server?.url || "");
  const version = String(server?.version || "").trim();

  if (!root) {
    return {
      root: "",
      version,
      base: ""
    };
  }

  if (/\/redcap_v[^/]+$/i.test(root)) {
    return {
      root,
      version,
      base: `${root}/`
    };
  }

  if (/\/redcap$/i.test(root)) {
    return {
      root,
      version,
      base: version ? `${root}/redcap_v${version}/` : `${root}/`
    };
  }

  return {
    root,
    version,
    base: version ? `${root}/redcap/redcap_v${version}/` : `${root}/redcap/`
  };
}

export function buildProjectUrl(server, pid) {
  const { base } = getServerPaths(server);
  return `${base}ProjectSetup/index.php?pid=${encodeURIComponent(pid)}`;
}

export function buildRecordUrl(server, pid, recordId, page = "", arm = "") {
  const { base } = getServerPaths(server);

  const params = [`pid=${encodeURIComponent(pid)}`];

  if (arm) {
    params.push(`arm=${encodeURIComponent(arm)}`);
  }

  if (recordId) {
    params.push(`id=${encodeURIComponent(recordId)}`);
  }

  if (page) {
    params.push(`page=${encodeURIComponent(page)}`);
    return `${base}DataEntry/index.php?${params.join("&")}`;
  }

  return `${base}DataEntry/record_home.php?${params.join("&")}`;
}

export function buildDashboardUrl(server, pid, recordId = "", arm = "") {
  const { base } = getServerPaths(server);

  const params = [`pid=${encodeURIComponent(pid)}`];

  if (arm) {
    params.push(`arm=${encodeURIComponent(arm)}`);
  }

  if (recordId) {
    params.push(`id=${encodeURIComponent(recordId)}`);
  }

  return `${base}DataEntry/record_home.php?${params.join("&")}`;
}

export function buildReportUrl(server, pid, reportId) {
  const { base } = getServerPaths(server);
  return `${base}DataExport/index.php?pid=${encodeURIComponent(pid)}&report_id=${encodeURIComponent(reportId)}`;
}

export function buildToolUrl(server, pid, tool) {
  const { base } = getServerPaths(server);

  const routes = {
    designer: "Design/online_designer.php",
    codebook: "Design/data_dictionary_upload.php",
    setup: "ProjectSetup/index.php",
    logs: "Logging/index.php",
    dq: "DataQuality/index.php"
  };

  const route = routes[tool];
  if (!route) return "";

  return `${base}${route}?pid=${encodeURIComponent(pid)}`;
}
