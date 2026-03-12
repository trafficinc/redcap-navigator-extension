import {
  buildProjectUrl,
  buildRecordUrl,
  buildDashboardUrl,
  buildReportUrl,
  buildToolUrl
} from "./urls.js";

export function parseCommand(rawCommand) {
  const command = String(rawCommand || "").trim();
  if (!command) return null;

  const parts = command.split(/\s+/);
  if (!parts.length) return null;

  const pid = parts[0];
  if (!pid) return null;

  if (parts.length === 1) {
    return { type: "project", pid };
  }

  const keyword = String(parts[1] || "").toLowerCase();

  if (keyword === "dashboard") return { type: "dashboard", pid };
  if (keyword === "designer") return { type: "tool", pid, tool: "designer" };
  if (keyword === "codebook") return { type: "tool", pid, tool: "codebook" };
  if (keyword === "setup") return { type: "tool", pid, tool: "setup" };
  if (keyword === "logs") return { type: "tool", pid, tool: "logs" };
  if (keyword === "dq" || keyword === "dataquality" || keyword === "data-quality") {
    return { type: "tool", pid, tool: "dq" };
  }

  if (keyword === "report" && parts[2]) {
    return { type: "report", pid, reportId: parts[2] };
  }

  const recordId = parts[1];
  const page = parts[2] || "";

  return { type: "record", pid, recordId, page };
}

export async function runCommand(commandText, state) {
  const parsed = parseCommand(commandText);

  if (!parsed) {
    alert("Enter a command like: 123 | 123 PT001 baseline | 123 dashboard | 123 report 5");
    return null;
  }

  const server = state.currentServer;

  if (parsed.type === "project") {
    return {
      action: "open",
      url: buildProjectUrl(server, parsed.pid),
      pid: parsed.pid,
      recordId: "",
      page: ""
    };
  }

  if (parsed.type === "dashboard") {
    return {
      action: "open",
      url: buildDashboardUrl(server, parsed.pid),
      pid: parsed.pid,
      recordId: "",
      page: ""
    };
  }

  if (parsed.type === "tool") {
    return {
      action: "open",
      url: buildToolUrl(server, parsed.pid, parsed.tool),
      pid: parsed.pid,
      recordId: "",
      page: ""
    };
  }

  if (parsed.type === "report") {
    return {
      action: "open",
      url: buildReportUrl(server, parsed.pid, parsed.reportId),
      pid: parsed.pid,
      reportId: parsed.reportId,
      recordId: "",
      page: ""
    };
  }

  return {
    action: "open",
    url: buildRecordUrl(server, parsed.pid, parsed.recordId, parsed.page || ""),
    pid: parsed.pid,
    recordId: parsed.recordId,
    page: parsed.page || ""
  };
}