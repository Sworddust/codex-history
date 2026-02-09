#!/usr/bin/env node
const history = require("./history-core");
const {
  formatArchiveHuman,
  formatDeleteHuman,
  formatListHuman,
  formatPreviewHuman,
  formatRecoverHuman,
  toJson,
} = require("./formatters");

const EXIT_CODES = {
  OK: 0,
  PARAM_ERROR: 2,
  NOT_FOUND: 3,
  PARTIAL_FAILURE: 4,
  UNHANDLED: 5,
};

class CliError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

function printHelp() {
  const lines = [
    "Codex History Skill CLI",
    "",
    "用法:",
    "  history-cli list [--source all|sessions|archived] [--limit N] [--json]",
    "  history-cli preview --session-id <id> [--max-messages N] [--json]",
    "  history-cli delete --session-id <id> [--session-id <id> ...] [--force] [--json]",
    "  history-cli archive --session-id <id> [--session-id <id> ...] [--force] [--json]",
    "  history-cli recover --session-id <id> [--session-id <id> ...] [--force] [--json]",
  ];
  console.log(lines.join("\n"));
}

function requireValue(args, index, optionName) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new CliError(`参数 ${optionName} 需要值`, EXIT_CODES.PARAM_ERROR);
  }
  return value;
}

function parsePositiveInt(value, optionName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new CliError(`参数 ${optionName} 必须为正整数`, EXIT_CODES.PARAM_ERROR);
  }
  return parsed;
}

function parseListArgs(args) {
  const options = {
    source: "all",
    limit: null,
    json: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--source") {
      const value = requireValue(args, index, token);
      if (!["all", "sessions", "archived"].includes(value)) {
        throw new CliError("参数 --source 仅支持 all|sessions|archived", EXIT_CODES.PARAM_ERROR);
      }
      options.source = value;
      index += 1;
      continue;
    }
    if (token === "--limit") {
      const value = requireValue(args, index, token);
      options.limit = parsePositiveInt(value, token);
      index += 1;
      continue;
    }
    throw new CliError(`未知参数: ${token}`, EXIT_CODES.PARAM_ERROR);
  }

  return options;
}

function parsePreviewArgs(args) {
  const options = {
    sessionId: "",
    maxMessages: null,
    json: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--session-id") {
      const value = requireValue(args, index, token);
      options.sessionId = value;
      index += 1;
      continue;
    }
    if (token === "--max-messages") {
      const value = requireValue(args, index, token);
      options.maxMessages = parsePositiveInt(value, token);
      index += 1;
      continue;
    }
    throw new CliError(`未知参数: ${token}`, EXIT_CODES.PARAM_ERROR);
  }

  if (!options.sessionId) {
    throw new CliError("preview 命令缺少 --session-id", EXIT_CODES.PARAM_ERROR);
  }

  return options;
}

function parseDeleteArgs(args) {
  const options = {
    sessionIds: [],
    force: false,
    json: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--force") {
      options.force = true;
      continue;
    }
    if (token === "--session-id") {
      const value = requireValue(args, index, token);
      options.sessionIds.push(value);
      index += 1;
      continue;
    }
    throw new CliError(`未知参数: ${token}`, EXIT_CODES.PARAM_ERROR);
  }

  if (options.sessionIds.length === 0) {
    throw new CliError("delete 命令至少需要一个 --session-id", EXIT_CODES.PARAM_ERROR);
  }

  options.sessionIds = Array.from(new Set(options.sessionIds));
  return options;
}

function parseArchiveArgs(args) {
  const options = {
    force: false,
    json: false,
    sessionIds: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--force") {
      options.force = true;
      continue;
    }
    if (token === "--session-id") {
      const value = requireValue(args, index, token);
      options.sessionIds.push(value);
      index += 1;
      continue;
    }
    throw new CliError(`未知参数: ${token}`, EXIT_CODES.PARAM_ERROR);
  }

  if (options.sessionIds.length === 0) {
    throw new CliError("archive 命令至少需要一个 --session-id", EXIT_CODES.PARAM_ERROR);
  }

  options.sessionIds = Array.from(new Set(options.sessionIds));
  return options;
}

function parseRecoverArgs(args) {
  const options = {
    force: false,
    json: false,
    sessionIds: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--force") {
      options.force = true;
      continue;
    }
    if (token === "--session-id") {
      const value = requireValue(args, index, token);
      options.sessionIds.push(value);
      index += 1;
      continue;
    }
    throw new CliError(`未知参数: ${token}`, EXIT_CODES.PARAM_ERROR);
  }

  if (options.sessionIds.length === 0) {
    throw new CliError("recover 命令至少需要一个 --session-id", EXIT_CODES.PARAM_ERROR);
  }

  options.sessionIds = Array.from(new Set(options.sessionIds));
  return options;
}

function outputPayload(payload, asJson, humanFormatter) {
  if (asJson) {
    console.log(toJson(payload));
    return;
  }
  console.log(humanFormatter(payload));
}

function runList(options) {
  const codexHome = history.getCodexHome();
  let items = history.loadSessionIndex(codexHome);
  if (options.source !== "all") {
    items = items.filter((item) => item.source === options.source);
  }
  const total = items.length;
  if (options.limit) {
    items = items.slice(0, options.limit);
  }

  const payload = {
    items: items.map((item) => ({
      filePath: item.filePath,
      sessionId: item.sessionId,
      source: item.source,
      timeText: item.timeText,
      title: item.title,
    })),
    total,
  };
  outputPayload(payload, options.json, formatListHuman);
  return EXIT_CODES.OK;
}

function runPreview(options) {
  const codexHome = history.getCodexHome();
  const entries = history.loadSessionIndex(codexHome);
  const target = entries.find((entry) => entry.sessionId === options.sessionId);
  if (!target) {
    throw new CliError(`未找到会话: ${options.sessionId}`, EXIT_CODES.NOT_FOUND);
  }

  let messages = history.readSessionMessages(target.filePath);
  if (options.maxMessages) {
    messages = messages.slice(0, options.maxMessages);
  }

  const payload = {
    messages,
    sessionId: target.sessionId,
    title: target.title || target.sessionId,
  };
  outputPayload(payload, options.json, formatPreviewHuman);
  return EXIT_CODES.OK;
}

function runDelete(options) {
  if (!options.force) {
    throw new CliError("delete 命令需要显式传入 --force", EXIT_CODES.PARAM_ERROR);
  }

  const codexHome = history.getCodexHome();
  const entries = history.loadSessionIndex(codexHome);
  const entryMap = new Map(entries.map((entry) => [entry.sessionId, entry]));
  const missingSessionIds = options.sessionIds.filter((sessionId) => !entryMap.has(sessionId));
  if (missingSessionIds.length > 0) {
    throw new CliError(`未找到会话: ${missingSessionIds.join(", ")}`, EXIT_CODES.NOT_FOUND);
  }

  const sessionFiles = options.sessionIds.map((sessionId) => entryMap.get(sessionId).filePath);
  const result = history.deleteSessions({
    codexHome,
    sessionFiles,
    sessionIds: options.sessionIds,
  });

  const payload = {
    deletedFiles: result.deletedFiles,
    failedFileCount: result.failedFileCount,
    failedFiles: result.failedFiles,
    removedHistoryLines: result.removedHistoryLines,
  };
  outputPayload(payload, options.json, formatDeleteHuman);

  if (result.failedFileCount > 0) {
    return EXIT_CODES.PARTIAL_FAILURE;
  }
  return EXIT_CODES.OK;
}

function runArchive(options) {
  const codexHome = history.getCodexHome();
  const entries = history
    .loadSessionIndex(codexHome)
    .filter((entry) => entry.source === "sessions");
  const entryMap = new Map(entries.map((entry) => [entry.sessionId, entry]));
  const missingSessionIds = options.sessionIds.filter((sessionId) => !entryMap.has(sessionId));
  if (missingSessionIds.length > 0) {
    throw new CliError(`未找到会话: ${missingSessionIds.join(", ")}`, EXIT_CODES.NOT_FOUND);
  }

  const selectedEntries = options.sessionIds.map((sessionId) => entryMap.get(sessionId));
  const result = history.archiveSessions({
    codexHome,
    entries: selectedEntries,
    force: options.force,
  });

  const payload = {
    conflictSkippedCount: result.conflictSkippedCount,
    conflictSkippedSessionIds: result.conflictSkippedSessionIds,
    failedFileCount: result.failedFileCount,
    failedFiles: result.failedFiles,
    movedFiles: result.movedFiles,
  };
  outputPayload(payload, options.json, formatArchiveHuman);

  if (result.failedFileCount > 0 || result.conflictSkippedCount > 0) {
    return EXIT_CODES.PARTIAL_FAILURE;
  }
  return EXIT_CODES.OK;
}

function runRecover(options) {
  const codexHome = history.getCodexHome();
  const entries = history
    .loadSessionIndex(codexHome)
    .filter((entry) => entry.source === "archived");
  const entryMap = new Map(entries.map((entry) => [entry.sessionId, entry]));
  const missingSessionIds = options.sessionIds.filter((sessionId) => !entryMap.has(sessionId));
  if (missingSessionIds.length > 0) {
    throw new CliError(`未找到会话: ${missingSessionIds.join(", ")}`, EXIT_CODES.NOT_FOUND);
  }

  const selectedEntries = options.sessionIds.map((sessionId) => entryMap.get(sessionId));
  const result = history.recoverSessions({
    codexHome,
    entries: selectedEntries,
    force: options.force,
  });

  const payload = {
    conflictSkippedCount: result.conflictSkippedCount,
    conflictSkippedSessionIds: result.conflictSkippedSessionIds,
    failedFileCount: result.failedFileCount,
    failedFiles: result.failedFiles,
    movedFiles: result.movedFiles,
  };
  outputPayload(payload, options.json, formatRecoverHuman);

  if (result.failedFileCount > 0 || result.conflictSkippedCount > 0) {
    return EXIT_CODES.PARTIAL_FAILURE;
  }
  return EXIT_CODES.OK;
}

function parseCommand(command, args) {
  if (command === "list") {
    return {
      options: parseListArgs(args),
      run: runList,
    };
  }
  if (command === "preview") {
    return {
      options: parsePreviewArgs(args),
      run: runPreview,
    };
  }
  if (command === "delete") {
    return {
      options: parseDeleteArgs(args),
      run: runDelete,
    };
  }
  if (command === "archive") {
    return {
      options: parseArchiveArgs(args),
      run: runArchive,
    };
  }
  if (command === "recover") {
    return {
      options: parseRecoverArgs(args),
      run: runRecover,
    };
  }
  throw new CliError(`未知命令: ${command}`, EXIT_CODES.PARAM_ERROR);
}

function runCli(argv) {
  try {
    if (!Array.isArray(argv) || argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
      printHelp();
      return EXIT_CODES.OK;
    }

    const [command, ...args] = argv;
    const action = parseCommand(command, args);
    return action.run(action.options);
  } catch (error) {
    if (error instanceof CliError) {
      console.error(error.message);
      return error.exitCode;
    }
    console.error(error && error.message ? error.message : "未知异常");
    return EXIT_CODES.UNHANDLED;
  }
}

if (require.main === module) {
  const exitCode = runCli(process.argv.slice(2));
  process.exit(exitCode);
}

module.exports = {
  CliError,
  EXIT_CODES,
  parseArchiveArgs,
  parseDeleteArgs,
  parseListArgs,
  parsePreviewArgs,
  parseRecoverArgs,
  runCli,
};
