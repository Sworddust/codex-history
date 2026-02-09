const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const cli = require("../scripts/history-cli");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function withCapturedStdStreams(run) {
  const originalLog = console.log;
  const originalError = console.error;
  const logs = [];
  const errors = [];
  console.log = (...args) => logs.push(args.join(" "));
  console.error = (...args) => errors.push(args.join(" "));
  try {
    return run({ errors, logs });
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

function createCodexFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-skill-"));
  const sessionsDir = path.join(tempRoot, "sessions", "2026", "02", "09");
  ensureDir(sessionsDir);

  const sessionId = "sess-skill";
  const sessionFile = path.join(sessionsDir, "session.jsonl");
  const fileContent = [
    JSON.stringify({
      type: "session_meta",
      payload: { id: sessionId, timestamp: "2026-02-09T00:00:00Z" },
    }),
    JSON.stringify({
      type: "response_item",
      timestamp: "2026-02-09T00:00:01Z",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "真实提问" }],
      },
    }),
    JSON.stringify({
      type: "response_item",
      timestamp: "2026-02-09T00:00:02Z",
      payload: {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "真实回答" }],
      },
    }),
  ].join("\n");
  fs.writeFileSync(sessionFile, `${fileContent}\n`, "utf8");

  fs.writeFileSync(
    path.join(tempRoot, "history.jsonl"),
    `${JSON.stringify({ session_id: sessionId, ts: 1707436800, text: "历史标题" })}\n`,
    "utf8"
  );

  return { sessionFile, sessionId, tempRoot };
}

function createArchivedFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-skill-archived-"));
  const archivedDir = path.join(tempRoot, "archived_sessions");
  ensureDir(archivedDir);

  const sessionId = "sess-archived";
  const archivedFile = path.join(
    archivedDir,
    "rollout-2026-02-09T00-00-00-sess-archived.jsonl"
  );
  const fileContent = [
    JSON.stringify({
      type: "session_meta",
      payload: { id: sessionId, timestamp: "2026-02-09T00:00:00Z" },
    }),
    JSON.stringify({
      type: "response_item",
      timestamp: "2026-02-09T00:00:01Z",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "归档问题" }],
      },
    }),
  ].join("\n");
  fs.writeFileSync(archivedFile, `${fileContent}\n`, "utf8");

  fs.writeFileSync(
    path.join(tempRoot, "history.jsonl"),
    `${JSON.stringify({ session_id: sessionId, ts: 1707436800, text: "归档历史标题" })}\n`,
    "utf8"
  );

  return { archivedFile, sessionId, tempRoot };
}

function createIdeContextFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-skill-ide-"));
  const sessionsDir = path.join(tempRoot, "sessions", "2026", "02", "09");
  ensureDir(sessionsDir);

  const sessionId = "sess-ide-context";
  const sessionFile = path.join(
    sessionsDir,
    "rollout-2026-02-09T00-00-00-sess-ide-context.jsonl"
  );
  const userMessage = [
    "# Context from my IDE setup:",
    "",
    "## Active file: SKILL.md",
    "",
    "## Open tabs:",
    "- SKILL.md: SKILL.md",
    "- README.md: README.md",
    "",
    "## My request for Codex:",
    "[$codex-history](C:\\\\Users\\\\locas\\\\.codex\\\\skills\\\\codex-history\\\\SKILL.md)列出最近一条对话",
  ].join("\n");
  const fileContent = [
    JSON.stringify({
      type: "session_meta",
      payload: { id: sessionId, timestamp: "2026-02-09T00:00:00Z" },
    }),
    JSON.stringify({
      type: "response_item",
      timestamp: "2026-02-09T00:00:01Z",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: userMessage }],
      },
    }),
  ].join("\n");
  fs.writeFileSync(sessionFile, `${fileContent}\n`, "utf8");

  fs.writeFileSync(
    path.join(tempRoot, "history.jsonl"),
    `${JSON.stringify({ session_id: sessionId, ts: 1707436800, text: userMessage })}\n`,
    "utf8"
  );

  return { sessionFile, sessionId, tempRoot };
}

test("parseListArgs 非法 source 抛参数错误", () => {
  assert.throws(
    () => cli.parseListArgs(["--source", "bad"]),
    (error) => error.exitCode === cli.EXIT_CODES.PARAM_ERROR
  );
});

test("parsePreviewArgs 缺失 session-id 抛参数错误", () => {
  assert.throws(
    () => cli.parsePreviewArgs([]),
    (error) => error.exitCode === cli.EXIT_CODES.PARAM_ERROR
  );
});

test("parseDeleteArgs 对 session-id 去重", () => {
  const parsed = cli.parseDeleteArgs([
    "--session-id",
    "a",
    "--session-id",
    "a",
    "--session-id",
    "b",
  ]);
  assert.deepEqual(parsed.sessionIds, ["a", "b"]);
});

test("parseArchiveArgs 缺失 session-id 抛参数错误", () => {
  assert.throws(
    () => cli.parseArchiveArgs([]),
    (error) => error.exitCode === cli.EXIT_CODES.PARAM_ERROR
  );
});

test("parseRecoverArgs 对 session-id 去重", () => {
  const parsed = cli.parseRecoverArgs([
    "--session-id",
    "a",
    "--session-id",
    "a",
    "--session-id",
    "b",
  ]);
  assert.deepEqual(parsed.sessionIds, ["a", "b"]);
});

test("runCli list --json 输出结构正确", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["list", "--json", "--limit", "5"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.ok(Array.isArray(payload.items));
      assert.equal(payload.total, 1);
      assert.equal(payload.items[0].sessionId, fixture.sessionId);
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli list 人类可读输出包含标题字段", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["list", "--limit", "5"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const text = logs.join("\n");
      assert.ok(text.includes("标题:"));
      assert.ok(text.includes("历史标题"));
      assert.ok(text.includes("sessionId:"));
      assert.ok(text.includes("时间:"));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli list 在 IDE 上下文中提取真实请求作为标题", () => {
  const fixture = createIdeContextFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["list", "--json", "--limit", "5"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.total, 1);
      assert.equal(payload.items[0].sessionId, fixture.sessionId);
      assert.equal(payload.items[0].title, "列出最近一条对话");
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli preview 找不到会话时返回 NOT_FOUND", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ errors }) => {
      const code = cli.runCli(["preview", "--session-id", "missing-id"]);
      assert.equal(code, cli.EXIT_CODES.NOT_FOUND);
      assert.equal(errors.length, 1);
      assert.ok(errors[0].includes("未找到会话"));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli delete --json 成功删除并返回结构", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli([
        "delete",
        "--session-id",
        fixture.sessionId,
        "--force",
        "--json",
      ]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.deletedFiles, 1);
      assert.equal(payload.failedFileCount, 0);
      assert.equal(payload.removedHistoryLines, 1);
      assert.ok(!fs.existsSync(fixture.sessionFile));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli delete 未传 --force 返回参数错误", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ errors }) => {
      const code = cli.runCli(["delete", "--session-id", fixture.sessionId]);
      assert.equal(code, cli.EXIT_CODES.PARAM_ERROR);
      assert.equal(errors.length, 1);
      assert.ok(errors[0].includes("--force"));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli archive --json 成功归档并返回结构", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli([
        "archive",
        "--session-id",
        fixture.sessionId,
        "--json",
      ]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.movedFiles, 1);
      assert.equal(payload.failedFileCount, 0);
      assert.equal(payload.conflictSkippedCount, 0);

      const archivedPath = path.join(
        fixture.tempRoot,
        "archived_sessions",
        path.basename(fixture.sessionFile)
      );
      assert.ok(fs.existsSync(archivedPath));
      assert.ok(!fs.existsSync(fixture.sessionFile));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli archive 找不到会话时返回 NOT_FOUND", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ errors }) => {
      const code = cli.runCli(["archive", "--session-id", "missing-id"]);
      assert.equal(code, cli.EXIT_CODES.NOT_FOUND);
      assert.equal(errors.length, 1);
      assert.ok(errors[0].includes("未找到会话"));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli recover --json 成功恢复到 sessions 年月日目录", () => {
  const fixture = createArchivedFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli([
        "recover",
        "--session-id",
        fixture.sessionId,
        "--json",
      ]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.movedFiles, 1);
      assert.equal(payload.failedFileCount, 0);
      assert.equal(payload.conflictSkippedCount, 0);

      const recoveredPath = path.join(
        fixture.tempRoot,
        "sessions",
        "2026",
        "02",
        "09",
        path.basename(fixture.archivedFile)
      );
      assert.ok(fs.existsSync(recoveredPath));
      assert.ok(!fs.existsSync(fixture.archivedFile));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli recover 找不到会话时返回 NOT_FOUND", () => {
  const fixture = createArchivedFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ errors }) => {
      const code = cli.runCli(["recover", "--session-id", "missing-id"]);
      assert.equal(code, cli.EXIT_CODES.NOT_FOUND);
      assert.equal(errors.length, 1);
      assert.ok(errors[0].includes("未找到会话"));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli archive 目标冲突且未 force 时返回 PARTIAL_FAILURE", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  const archivedDir = path.join(fixture.tempRoot, "archived_sessions");
  ensureDir(archivedDir);
  const conflictPath = path.join(archivedDir, path.basename(fixture.sessionFile));
  fs.writeFileSync(conflictPath, "conflict\n", "utf8");

  try {
    withCapturedStdStreams(({ logs }) => {
      const code = cli.runCli([
        "archive",
        "--session-id",
        fixture.sessionId,
        "--json",
      ]);
      assert.equal(code, cli.EXIT_CODES.PARTIAL_FAILURE);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.movedFiles, 0);
      assert.equal(payload.failedFileCount, 0);
      assert.equal(payload.conflictSkippedCount, 1);
      assert.deepEqual(payload.conflictSkippedSessionIds, [fixture.sessionId]);
      assert.ok(fs.existsSync(fixture.sessionFile));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test("runCli archive 目标冲突且 force 时覆盖并成功", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  const archivedDir = path.join(fixture.tempRoot, "archived_sessions");
  ensureDir(archivedDir);
  const conflictPath = path.join(archivedDir, path.basename(fixture.sessionFile));
  fs.writeFileSync(conflictPath, "old-content\n", "utf8");

  try {
    withCapturedStdStreams(({ logs }) => {
      const code = cli.runCli([
        "archive",
        "--session-id",
        fixture.sessionId,
        "--force",
        "--json",
      ]);
      assert.equal(code, cli.EXIT_CODES.OK);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.movedFiles, 1);
      assert.equal(payload.failedFileCount, 0);
      assert.equal(payload.conflictSkippedCount, 0);
      assert.ok(!fs.existsSync(fixture.sessionFile));

      const movedContent = fs.readFileSync(conflictPath, "utf8");
      assert.ok(movedContent.includes("session_meta"));
    });
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});
