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

function createMixedSourceFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-skill-mixed-"));
  const sessionsDir = path.join(tempRoot, "sessions", "2026", "02", "09");
  const archivedDir = path.join(tempRoot, "archived_sessions");
  ensureDir(sessionsDir);
  ensureDir(archivedDir);

  const activeSessionId = "sess-active";
  const archivedSessionId = "sess-archived-only";
  const activeFile = path.join(sessionsDir, "active.jsonl");
  const archivedFile = path.join(archivedDir, "rollout-2026-02-09T00-00-00-sess-archived-only.jsonl");

  fs.writeFileSync(
    activeFile,
    [
      JSON.stringify({
        type: "session_meta",
        payload: { id: activeSessionId, timestamp: "2026-02-09T00:00:00Z" },
      }),
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-02-09T00:00:01Z",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "活动会话" }],
        },
      }),
    ].join("\n") + "\n",
    "utf8"
  );
  fs.writeFileSync(
    archivedFile,
    [
      JSON.stringify({
        type: "session_meta",
        payload: { id: archivedSessionId, timestamp: "2026-02-09T00:00:00Z" },
      }),
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-02-09T00:00:01Z",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "归档会话" }],
        },
      }),
    ].join("\n") + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(tempRoot, "history.jsonl"),
    [
      JSON.stringify({ session_id: activeSessionId, ts: 1707436800, text: "活动标题" }),
      JSON.stringify({ session_id: archivedSessionId, ts: 1707436800, text: "归档标题" }),
    ].join("\n") + "\n",
    "utf8"
  );

  return { activeSessionId, archivedSessionId, tempRoot };
}

function createConflictSourceFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-skill-conflict-"));
  const sessionsDir = path.join(tempRoot, "sessions", "2026", "02", "09");
  const archivedDir = path.join(tempRoot, "archived_sessions");
  ensureDir(sessionsDir);
  ensureDir(archivedDir);

  const sessionId = "sess-conflict";
  const sessionFile = path.join(sessionsDir, "active-conflict.jsonl");
  const archivedFile = path.join(archivedDir, "rollout-2026-02-09T00-00-00-sess-conflict.jsonl");
  const items = [
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
        content: [{ type: "input_text", text: "冲突会话" }],
      },
    }),
  ].join("\n");

  fs.writeFileSync(sessionFile, `${items}\n`, "utf8");
  fs.writeFileSync(archivedFile, `${items}\n`, "utf8");
  fs.writeFileSync(
    path.join(tempRoot, "history.jsonl"),
    `${JSON.stringify({ session_id: sessionId, ts: 1707436800, text: "冲突标题" })}\n`,
    "utf8"
  );

  return { archivedFile, sessionFile, sessionId, tempRoot };
}

function createTitleFallbackFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-skill-title-fallback-"));
  const sessionsDir = path.join(tempRoot, "sessions", "2026", "02", "09");
  ensureDir(sessionsDir);

  const sessionId = "sess-title-fallback";
  const sessionFile = path.join(sessionsDir, "title-fallback.jsonl");
  fs.writeFileSync(
    sessionFile,
    [
      JSON.stringify({
        type: "session_meta",
        payload: { id: sessionId, timestamp: "2026-02-09T00:00:00Z" },
      }),
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-02-09T00:00:02Z",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "只有回答，没有真实提问" }],
        },
      }),
    ].join("\n") + "\n",
    "utf8"
  );

  return { sessionFile, sessionId, tempRoot };
}

function createArchivedTimestampFallbackFixture(metaTimestamp) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-skill-ts-fallback-"));
  const archivedDir = path.join(tempRoot, "archived_sessions");
  ensureDir(archivedDir);

  const sessionId = "sess-ts-fallback";
  const archivedFile = path.join(archivedDir, "archived-no-rollout-date.jsonl");
  fs.writeFileSync(
    archivedFile,
    [
      JSON.stringify({
        type: "session_meta",
        payload: { id: sessionId, timestamp: metaTimestamp },
      }),
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-02-10T00:00:01Z",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "需要通过 timestamp 恢复" }],
        },
      }),
    ].join("\n") + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(tempRoot, "history.jsonl"),
    `${JSON.stringify({ session_id: sessionId, ts: 1707523200, text: "时间回退标题" })}\n`,
    "utf8"
  );

  return { archivedFile, sessionId, tempRoot };
}

function createIdeOnlyPreviewFilteredFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-skill-ide-preview-"));
  const sessionsDir = path.join(tempRoot, "sessions", "2026", "02", "09");
  ensureDir(sessionsDir);

  const sessionId = "sess-ide-preview-filtered";
  const sessionFile = path.join(sessionsDir, "ide-preview-filtered.jsonl");
  const userMessage = [
    "<user_instructions>",
    "这是注入的指令上下文，不应作为真实用户消息展示。",
    "</user_instructions>",
  ].join("\n");

  fs.writeFileSync(
    sessionFile,
    [
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
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-02-09T00:00:02Z",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "这条回复不应被当作仅 assistant 会话展示" }],
        },
      }),
    ].join("\n") + "\n",
    "utf8"
  );

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

test("runCli list --source archived 只返回归档来源", () => {
  const fixture = createMixedSourceFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["list", "--source", "archived", "--json"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.total, 1);
      assert.equal(payload.items.length, 1);
      assert.equal(payload.items[0].source, "archived");
      assert.equal(payload.items[0].sessionId, fixture.archivedSessionId);
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

test("runCli list 同 sessionId 冲突时优先选择 sessions", () => {
  const fixture = createConflictSourceFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["list", "--json"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.total, 1);
      assert.equal(payload.items[0].sessionId, fixture.sessionId);
      assert.equal(payload.items[0].source, "sessions");
      assert.equal(payload.items[0].filePath, fixture.sessionFile);
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

test("runCli list 缺少真实提问时标题回退到 sessionId", () => {
  const fixture = createTitleFallbackFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["list", "--json"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.total, 1);
      assert.equal(payload.items[0].sessionId, fixture.sessionId);
      assert.equal(payload.items[0].title, fixture.sessionId);
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

test("runCli --help --json 输出结构化帮助对象", () => {
  withCapturedStdStreams(({ logs, errors }) => {
    const code = cli.runCli(["--help", "--json"]);
    assert.equal(code, cli.EXIT_CODES.OK);
    assert.equal(errors.length, 0);

    const payload = JSON.parse(logs.join("\n"));
    assert.equal(payload.title, "Codex History Skill CLI");
    assert.ok(Array.isArray(payload.commands));
    assert.ok(payload.commands.length >= 5);
    assert.equal(payload.commands[0].name, "list");
    assert.ok(payload.commands.some((command) => command.name === "preview"));
  });
});

test("runCli preview 对仅 assistant 会话返回消息", () => {
  const fixture = createTitleFallbackFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["preview", "--session-id", fixture.sessionId, "--json"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.sessionId, fixture.sessionId);
      assert.equal(payload.title, fixture.sessionId);
      assert.equal(payload.messages.length, 1);
      assert.equal(payload.messages[0].role, "assistant");
      assert.equal(payload.messages[0].text, "只有回答，没有真实提问");
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

test("runCli preview 对仅 instruction-like user 的会话不回显 assistant 消息", () => {
  const fixture = createIdeOnlyPreviewFilteredFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["preview", "--session-id", fixture.sessionId, "--json"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.sessionId, fixture.sessionId);
      assert.equal(payload.title, fixture.sessionId);
      assert.deepEqual(payload.messages, []);
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

test("runCli preview --max-messages 限制返回消息数量", () => {
  const fixture = createCodexFixture();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli([
        "preview",
        "--session-id",
        fixture.sessionId,
        "--max-messages",
        "1",
        "--json",
      ]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.messages.length, 1);
      assert.equal(payload.messages[0].role, "user");
      assert.equal(payload.messages[0].text, "真实提问");
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

test("runCli recover 在无 rollout 日期时回退 session_meta.timestamp", () => {
  const fixture = createArchivedTimestampFallbackFixture("2026-02-10T00:00:00Z");
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["recover", "--session-id", fixture.sessionId, "--json"]);
      assert.equal(code, cli.EXIT_CODES.OK);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.movedFiles, 1);
      assert.equal(payload.failedFileCount, 0);

      const recoveredPath = path.join(
        fixture.tempRoot,
        "sessions",
        "2026",
        "02",
        "10",
        path.basename(fixture.archivedFile)
      );
      assert.ok(fs.existsSync(recoveredPath));
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

test("runCli recover 无法推断日期时返回 PARTIAL_FAILURE", () => {
  const fixture = createArchivedTimestampFallbackFixture("");
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = fixture.tempRoot;

  try {
    withCapturedStdStreams(({ logs, errors }) => {
      const code = cli.runCli(["recover", "--session-id", fixture.sessionId, "--json"]);
      assert.equal(code, cli.EXIT_CODES.PARTIAL_FAILURE);
      assert.equal(errors.length, 0);

      const payload = JSON.parse(logs.join("\n"));
      assert.equal(payload.movedFiles, 0);
      assert.equal(payload.failedFileCount, 1);
      assert.ok(payload.failedFiles[0].reason.includes("无法从文件名或 session_meta.timestamp 推断恢复目录日期"));
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

test("runCli 参数错误时 --json 输出结构化错误对象", () => {
  withCapturedStdStreams(({ logs, errors }) => {
    const code = cli.runCli(["preview", "--json"]);
    assert.equal(code, cli.EXIT_CODES.PARAM_ERROR);
    assert.equal(errors.length, 0);

    const payload = JSON.parse(logs.join("\n"));
    assert.equal(payload.error.exitCode, cli.EXIT_CODES.PARAM_ERROR);
    assert.equal(payload.error.type, "cli_error");
    assert.ok(payload.error.message.includes("--session-id"));
  });
});

test("runCli 未知命令时 --json 输出结构化错误对象", () => {
  withCapturedStdStreams(({ logs, errors }) => {
    const code = cli.runCli(["unknown-command", "--json"]);
    assert.equal(code, cli.EXIT_CODES.PARAM_ERROR);
    assert.equal(errors.length, 0);

    const payload = JSON.parse(logs.join("\n"));
    assert.equal(payload.error.exitCode, cli.EXIT_CODES.PARAM_ERROR);
    assert.equal(payload.error.type, "cli_error");
    assert.ok(payload.error.message.includes("未知命令"));
  });
});
