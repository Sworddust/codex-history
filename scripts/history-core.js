const fs = require("fs");
const os = require("os");
const path = require("path");

const INSTRUCTION_MARKERS = [
  "<user_instructions>",
  "</user_instructions>",
  "<environment_context>",
  "</environment_context>",
  "AGENTS.md",
  "Codex 工作操作手册",
];

const IDE_REQUEST_MARKERS = [
  /(?:^|\n)##\s*My request for Codex\s*:?\s*(?:\n|$)/i,
  /(?:^|\n)My request for Codex\s*:?\s*(?:\n|$)/i,
  /(?:^|\n)##\s*My request\s*:?\s*(?:\n|$)/i,
];

const EXPORT_WRAPPER_MARKERS = [
  "# Codex Role:",
  "## CRITICAL CONSTRAINTS",
  "## Core Expertise",
  "## Analysis Framework",
  "## Response Structure",
  "<TASK>",
  "</TASK>",
  "OUTPUT:",
  "For: /ccg:",
];

function getCodexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

function parseJsonLines(content) {
  if (!content) {
    return [];
  }
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function buildHistoryMap(historyContent) {
  const map = new Map();
  const items = parseJsonLines(historyContent);
  for (const item of items) {
    if (!item || !item.session_id) {
      continue;
    }
    map.set(item.session_id, {
      text: item.text || "",
      ts: item.ts,
    });
  }
  return map;
}

function readHistoryMap(codexHome) {
  const historyPath = path.join(codexHome, "history.jsonl");
  const content = readFileIfExists(historyPath);
  return {
    historyPath,
    map: buildHistoryMap(content),
  };
}

function listJsonlFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const results = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listJsonlFilesRecursive(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      results.push(fullPath);
    }
  }
  return results;
}

function listJsonlFilesFlat(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const results = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      results.push(path.join(dirPath, entry.name));
    }
  }
  return results;
}

function listSessionFiles(codexHome) {
  const sessionsDir = path.join(codexHome, "sessions");
  const archivedDir = path.join(codexHome, "archived_sessions");
  return {
    archived: listJsonlFilesFlat(archivedDir),
    sessions: listJsonlFilesRecursive(sessionsDir),
  };
}

function extractSessionMetaFromItems(items) {
  for (const item of items) {
    if (item && item.type === "session_meta" && item.payload && item.payload.id) {
      return {
        id: item.payload.id,
        timestamp: item.payload.timestamp || "",
      };
    }
  }
  return null;
}

function toMillis(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (Math.abs(value) >= 1e11) {
      return Math.trunc(value);
    }
    return Math.trunc(value * 1000);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return toMillis(Number(trimmed));
    }
    const parsedFromString = Date.parse(trimmed);
    return Number.isNaN(parsedFromString) ? 0 : parsedFromString;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatTimestamp(value) {
  const millis = toMillis(value);
  if (millis <= 0) {
    return "";
  }
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}

function extractMessageText(payload) {
  const parts = Array.isArray(payload.content) ? payload.content : [];
  const textParts = parts
    .map((part) => part && part.text)
    .filter((text) => typeof text === "string" && text.length > 0);
  return textParts.join("");
}

function isInstructionLike(text) {
  if (!text) {
    return false;
  }
  return INSTRUCTION_MARKERS.some((marker) => text.includes(marker));
}

function isExportWrapperLike(text) {
  if (!text) {
    return false;
  }
  return EXPORT_WRAPPER_MARKERS.some((marker) => text.includes(marker));
}

function isExportControlLike(text) {
  if (!text) {
    return false;
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return false;
  }

  if (/^<skill>[\s\S]*<\/skill>$/i.test(normalized)) {
    return true;
  }
  if (/^<turn_aborted>[\s\S]*<\/turn_aborted>$/i.test(normalized)) {
    return true;
  }
  if (/^\$codex-history\b/i.test(normalized)) {
    return true;
  }

  return false;
}

function extractTaskSection(text) {
  if (!text) {
    return "";
  }

  const startMatched = text.match(/<TASK>\s*/i);
  if (!startMatched || startMatched.index == null) {
    return "";
  }

  const taskStartIndex = startMatched.index + startMatched[0].length;
  const remainder = text.slice(taskStartIndex);
  const endMatched = remainder.match(/\s*<\/TASK>/i);
  const taskBody = endMatched ? remainder.slice(0, endMatched.index) : remainder;
  const normalized = taskBody.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return "";
  }

  const demandMatched = normalized.match(/(?:^|\n)需求：\s*([\s\S]*?)(?=\n(?:上下文：|OUTPUT:)|$)/);
  if (demandMatched && demandMatched[1]) {
    return demandMatched[1].trim();
  }

  return normalized;
}

function normalizeExportPrompt(text) {
  const normalized = normalizeUserMessageForTitle(text);
  if (!normalized) {
    return "";
  }

  if (isExportControlLike(normalized)) {
    return "";
  }

  if (isInstructionLike(normalized)) {
    return "";
  }

  const taskSection = extractTaskSection(normalized);
  if (taskSection) {
    return taskSection;
  }

  if (isExportWrapperLike(normalized)) {
    return "";
  }

  return normalized;
}

function extractRequestSectionFromIdeContext(text) {
  if (!text || !text.includes("Context from my IDE setup")) {
    return "";
  }

  for (const marker of IDE_REQUEST_MARKERS) {
    const matched = marker.exec(text);
    if (!matched) {
      continue;
    }
    const section = text.slice(matched.index + matched[0].length).trim();
    if (section) {
      return section;
    }
  }

  return "";
}

function stripLeadingSkillReference(text) {
  if (!text) {
    return "";
  }

  const stripped = text.replace(/^\s*\[[^\]]+\]\([^)]+\)\s*/u, "").trim();
  return stripped || text.trim();
}

function normalizeUserMessageForTitle(text) {
  if (!text) {
    return "";
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return "";
  }

  const requestSection = extractRequestSectionFromIdeContext(normalized);
  const candidate = requestSection || normalized;
  return stripLeadingSkillReference(candidate);
}

function extractFirstRealUserMessageFromItems(items) {
  for (const item of items) {
    if (!item || item.type !== "response_item") {
      continue;
    }
    const payload = item.payload || {};
    if (payload.type !== "message" || payload.role !== "user") {
      continue;
    }
    const text = normalizeExportPrompt(extractMessageText(payload));
    if (!text) {
      continue;
    }
    return text;
  }
  return "";
}

function normalizeTitleCandidate(text) {
  return normalizeExportPrompt(text);
}

function getSourcePriority(source) {
  if (source === "sessions") {
    return 2;
  }
  if (source === "archived") {
    return 1;
  }
  return 0;
}

function buildSessionEntry({ filePath, historyMap, items, source }) {
  const meta = extractSessionMetaFromItems(items);
  if (!meta || !meta.id) {
    return null;
  }

  const historyItem = historyMap.get(meta.id);
  const historyTitle = normalizeTitleCandidate(historyItem && historyItem.text ? historyItem.text : "");
  const firstUserText = extractFirstRealUserMessageFromItems(items);
  const title = historyTitle || firstUserText || meta.id;
  const timestamp = historyItem && historyItem.ts ? historyItem.ts : meta.timestamp;

  return {
    filePath,
    sessionId: meta.id,
    source,
    timeText: formatTimestamp(timestamp),
    timestamp,
    title,
  };
}

function collectMessagesFromItems(items, options = {}) {
  const includeSystem = Boolean(options.includeSystem);
  const allowFallbackWithoutRealUser = options.allowFallbackWithoutRealUser !== false;
  const allowInstructionOnlySystemFallback = options.allowInstructionOnlySystemFallback !== false;
  const messages = [];
  const systemMessages = [];
  const assistantMessagesBeforeRealUser = [];
  const fallbackMessages = [];
  let hasAnyUser = false;
  let hasRealUser = false;

  for (const item of items) {
    if (!item || item.type !== "response_item") {
      continue;
    }
    const payload = item.payload || {};
    if (payload.type !== "message" || !payload.role) {
      continue;
    }
    if (payload.role !== "user" && payload.role !== "assistant" && payload.role !== "system") {
      continue;
    }
    const text = extractMessageText(payload);
    if (!text) {
      continue;
    }

    const message = {
      role: payload.role,
      text,
      timestamp: item.timestamp || "",
    };

    if (!hasRealUser && (payload.role === "system" || payload.role === "assistant")) {
      fallbackMessages.push(message);
    }

    if (payload.role === "system") {
      systemMessages.push(message);
      if (includeSystem && hasRealUser) {
        messages.push(message);
      }
      continue;
    }
    if (payload.role === "user") {
      hasAnyUser = true;
      if (isInstructionLike(text)) {
        continue;
      }
      hasRealUser = true;
      if (includeSystem && systemMessages.length > 0 && messages.length === 0) {
        messages.push(...systemMessages);
      }
      messages.push(message);
      continue;
    }

    if (!hasRealUser) {
      assistantMessagesBeforeRealUser.push(message);
      continue;
    }
    messages.push(message);
  }

  if (hasRealUser) {
    return messages;
  }
  if (hasAnyUser) {
    if (!allowInstructionOnlySystemFallback) {
      return [];
    }
    return includeSystem ? systemMessages : [];
  }
  if (!allowFallbackWithoutRealUser) {
    return [];
  }
  return includeSystem ? fallbackMessages : assistantMessagesBeforeRealUser;
}

function collectExportMessagesFromItems(items) {
  const messages = [];
  let hasRealUser = false;

  for (const item of items) {
    if (!item || item.type !== "response_item") {
      continue;
    }
    const payload = item.payload || {};
    if (payload.type !== "message" || !payload.role) {
      continue;
    }
    if (payload.role !== "user" && payload.role !== "assistant") {
      continue;
    }

    const text = extractMessageText(payload);
    if (!text) {
      continue;
    }

    if (payload.role === "user") {
      const normalized = normalizeExportPrompt(text);
      if (!normalized) {
        continue;
      }
      hasRealUser = true;
      messages.push({
        role: "user",
        text: normalized,
        timestamp: item.timestamp || "",
      });
      continue;
    }

    if (!hasRealUser) {
      continue;
    }

    messages.push({
      role: "assistant",
      text,
      timestamp: item.timestamp || "",
    });
  }

  return messages;
}

function readSessionExportData(filePath) {
  const content = readFileIfExists(filePath);
  const items = parseJsonLines(content);
  const messages = collectExportMessagesFromItems(items);
  return {
    messages,
  };
}

function loadSessionIndex(codexHome) {
  const { map } = readHistoryMap(codexHome);
  const { sessions, archived } = listSessionFiles(codexHome);
  const entriesBySessionId = new Map();

  const upsertEntry = (entry) => {
    const existing = entriesBySessionId.get(entry.sessionId);
    if (!existing) {
      entriesBySessionId.set(entry.sessionId, entry);
      return;
    }

    const existingTime = toMillis(existing.timestamp);
    const nextTime = toMillis(entry.timestamp);
    if (nextTime > existingTime) {
      entriesBySessionId.set(entry.sessionId, entry);
      return;
    }

    if (nextTime === existingTime) {
      const existingPriority = getSourcePriority(existing.source);
      const nextPriority = getSourcePriority(entry.source);
      if (nextPriority > existingPriority) {
        entriesBySessionId.set(entry.sessionId, entry);
      }
    }
  };

  const addEntries = (filePaths, source) => {
    for (const filePath of filePaths) {
      const content = readFileIfExists(filePath);
      if (!content) {
        continue;
      }
      const items = parseJsonLines(content);
      const entry = buildSessionEntry({
        filePath,
        historyMap: map,
        items,
        source,
      });
      if (!entry) {
        continue;
      }
      upsertEntry(entry);
    }
  };

  addEntries(sessions, "sessions");
  addEntries(archived, "archived");

  const all = Array.from(entriesBySessionId.values());
  all.sort((a, b) => {
    const timeDiff = toMillis(b.timestamp) - toMillis(a.timestamp);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return getSourcePriority(b.source) - getSourcePriority(a.source);
  });
  return all;
}

function readSessionMessages(filePath, options = {}) {
  const content = readFileIfExists(filePath);
  const items = parseJsonLines(content);
  return collectMessagesFromItems(items, options);
}

function deleteSessions({ sessionIds, sessionFiles, codexHome }) {
  const ids = new Set(sessionIds || []);
  let deletedFiles = 0;
  let failedFileCount = 0;
  const failedFiles = [];

  for (const filePath of sessionFiles || []) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    try {
      fs.unlinkSync(filePath);
      deletedFiles += 1;
    } catch (error) {
      failedFileCount += 1;
      failedFiles.push(filePath);
    }
  }

  const historyPath = path.join(codexHome, "history.jsonl");
  let removedHistoryLines = 0;
  if (fs.existsSync(historyPath) && ids.size > 0) {
    const content = readFileIfExists(historyPath);
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    const kept = [];
    for (const line of lines) {
      let obj;
      try {
        obj = JSON.parse(line);
      } catch (error) {
        kept.push(line);
        continue;
      }
      if (obj && ids.has(obj.session_id)) {
        removedHistoryLines += 1;
        continue;
      }
      kept.push(line);
    }
    const output = kept.length ? `${kept.join(os.EOL)}${os.EOL}` : "";
    fs.writeFileSync(historyPath, output, "utf8");
  }

  return {
    deletedFiles,
    failedFileCount,
    failedFiles,
    removedHistoryLines,
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function extractDatePartsFromRolloutFilename(fileName) {
  const match = fileName.match(/rollout-(\d{4})-(\d{2})-(\d{2})T/i);
  if (!match) {
    return null;
  }
  return {
    day: match[3],
    month: match[2],
    year: match[1],
  };
}

function extractDatePartsFromTimestamp(timestamp) {
  const millis = toMillis(timestamp);
  if (millis <= 0) {
    return null;
  }

  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    year: String(date.getUTCFullYear()),
  };
}

function readSessionMetaTimestamp(filePath) {
  const content = readFileIfExists(filePath);
  if (!content) {
    return "";
  }

  const items = parseJsonLines(content);
  const meta = extractSessionMetaFromItems(items);
  if (!meta) {
    return "";
  }
  return meta.timestamp || "";
}

function buildArchiveTargetPath({ codexHome, sourcePath }) {
  const baseName = path.basename(sourcePath);
  return {
    targetPath: path.join(codexHome, "archived_sessions", baseName),
  };
}

function buildRecoverTargetPath({ codexHome, sourcePath }) {
  const baseName = path.basename(sourcePath);
  let dateParts = extractDatePartsFromRolloutFilename(baseName);

  if (!dateParts) {
    const metaTimestamp = readSessionMetaTimestamp(sourcePath);
    dateParts = extractDatePartsFromTimestamp(metaTimestamp);
  }

  if (!dateParts) {
    return {
      error: "无法从文件名或 session_meta.timestamp 推断恢复目录日期",
      targetPath: "",
    };
  }

  return {
    targetPath: path.join(
      codexHome,
      "sessions",
      dateParts.year,
      dateParts.month,
      dateParts.day,
      baseName
    ),
  };
}

function moveSessions({ entries, codexHome, force, targetPathBuilder }) {
  let movedFiles = 0;
  let failedFileCount = 0;
  let conflictSkippedCount = 0;
  const failedFiles = [];
  const conflictSkippedSessionIds = [];

  for (const entry of entries || []) {
    const sourcePath = entry.filePath;
    const sessionId = entry.sessionId;

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      failedFileCount += 1;
      failedFiles.push({
        reason: "源文件不存在",
        sessionId,
        sourcePath,
        targetPath: "",
      });
      continue;
    }

    const targetInfo = targetPathBuilder({ codexHome, sourcePath });
    if (targetInfo.error) {
      failedFileCount += 1;
      failedFiles.push({
        reason: targetInfo.error,
        sessionId,
        sourcePath,
        targetPath: "",
      });
      continue;
    }

    const targetPath = targetInfo.targetPath;
    if (!targetPath) {
      failedFileCount += 1;
      failedFiles.push({
        reason: "目标路径为空",
        sessionId,
        sourcePath,
        targetPath,
      });
      continue;
    }

    if (fs.existsSync(targetPath)) {
      if (!force) {
        conflictSkippedCount += 1;
        conflictSkippedSessionIds.push(sessionId);
        continue;
      }
      try {
        fs.unlinkSync(targetPath);
      } catch (error) {
        failedFileCount += 1;
        failedFiles.push({
          reason: `覆盖目标失败: ${error.message}`,
          sessionId,
          sourcePath,
          targetPath,
        });
        continue;
      }
    }

    try {
      ensureDir(path.dirname(targetPath));
      fs.renameSync(sourcePath, targetPath);
      movedFiles += 1;
    } catch (error) {
      failedFileCount += 1;
      failedFiles.push({
        reason: `移动失败: ${error.message}`,
        sessionId,
        sourcePath,
        targetPath,
      });
    }
  }

  return {
    conflictSkippedCount,
    conflictSkippedSessionIds,
    failedFileCount,
    failedFiles,
    movedFiles,
  };
}

function archiveSessions({ entries, codexHome, force }) {
  return moveSessions({
    codexHome,
    entries,
    force: Boolean(force),
    targetPathBuilder: buildArchiveTargetPath,
  });
}

function recoverSessions({ entries, codexHome, force }) {
  return moveSessions({
    codexHome,
    entries,
    force: Boolean(force),
    targetPathBuilder: buildRecoverTargetPath,
  });
}

module.exports = {
  archiveSessions,
  deleteSessions,
  getCodexHome,
  loadSessionIndex,
  readSessionExportData,
  recoverSessions,
  readSessionMessages,
};
