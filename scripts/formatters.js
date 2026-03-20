function toJson(payload) {
  return JSON.stringify(payload, null, 2);
}

function formatListTitle(title, fallback) {
  const rawTitle = typeof title === "string" ? title : "";
  const normalized = rawTitle.replace(/\s+/g, " ").trim();
  const finalTitle = normalized || fallback || "无标题";
  if (finalTitle.length <= 120) {
    return finalTitle;
  }
  return `${finalTitle.slice(0, 117)}...`;
}

function formatListHuman(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    return "未找到会话记录。";
  }

  const lines = [`Codex 会话列表（共 ${payload.total} 条）：`];
  for (const item of items) {
    const timeText = item.timeText || "无时间";
    const sourceText = item.source || "unknown";
    const titleText = formatListTitle(item.title, item.sessionId);
    lines.push(`- [${sourceText}] 标题: ${titleText}`);
    lines.push(`  sessionId: ${item.sessionId} | 时间: ${timeText}`);
    lines.push(`  文件: ${item.filePath}`);
  }
  return lines.join("\n");
}

function formatPreviewHuman(payload) {
  const lines = [
    `会话: ${payload.title || payload.sessionId}`,
    `sessionId: ${payload.sessionId}`,
  ];

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (messages.length === 0) {
    lines.push("暂无可预览消息。");
    return lines.join("\n");
  }

  lines.push("消息：");
  for (const [index, message] of messages.entries()) {
    const role = formatMessageRole(message.role);
    const time = message.timestamp || "";
    if (index > 0) {
      lines.push("----");
    }
    lines.push(`[${index + 1}] ${role}${time ? ` (${time})` : ""}`);
    lines.push(message.text);
  }
  return lines.join("\n");
}

function formatMessageRole(role) {
  if (role === "user") {
    return "用户";
  }
  if (role === "assistant") {
    return "助手";
  }
  if (role === "system") {
    return "系统";
  }
  return role || "未知角色";
}

function getMarkdownFence(text) {
  const matches = typeof text === "string" ? text.match(/`+/g) : null;
  let longest = 0;
  if (matches) {
    for (const match of matches) {
      if (match.length > longest) {
        longest = match.length;
      }
    }
  }
  return "`".repeat(Math.max(3, longest + 1));
}

function formatMarkdownMessageBody(text) {
  const normalized = typeof text === "string" ? text.replace(/\r\n/g, "\n") : "";
  if (!normalized) {
    return "```text\n（空消息）\n```";
  }

  const fence = getMarkdownFence(normalized);
  return `${fence}text\n${normalized}\n${fence}`;
}

function formatMarkdownInline(text, fallback) {
  const normalized = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  const finalText = normalized || fallback || "";
  return finalText.replace(/([\\`*_{}\[\]()#+\-.!|<>])/g, "\\$1");
}

function formatSessionMarkdown(payload) {
  const headerTitle = formatMarkdownInline(payload.title, payload.sessionId || "未命名会话");
  const lines = [
    `# ${headerTitle}`,
    "",
    `- sessionId: ${payload.sessionId || ""}`,
    `- 来源: ${payload.source || "unknown"}`,
    `- 时间: ${payload.timeText || "无时间"}`,
    "",
    "## 消息记录",
  ];

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (messages.length === 0) {
    lines.push("");
    lines.push("暂无可导出消息。");
    return lines.join("\n");
  }

  for (const [index, message] of messages.entries()) {
    lines.push("");
    lines.push(`### ${index + 1}. ${formatMessageRole(message.role)}`);
    lines.push("");
    lines.push(`- 时间: ${message.timestamp || "无时间"}`);
    lines.push("");
    lines.push(formatMarkdownMessageBody(message.text));
  }

  return lines.join("\n");
}

function formatExportHuman(payload) {
  const lines = [
    "导出结果：",
    `- sessionId: ${payload.sessionId}`,
    `- 格式: ${payload.format}`,
    `- 输出文件: ${payload.outputPath}`,
    `- 消息数: ${payload.messageCount}`,
  ];
  return lines.join("\n");
}

function formatDeleteHuman(payload) {
  const lines = [
    "删除结果：",
    `- deletedFiles: ${payload.deletedFiles}`,
    `- failedFileCount: ${payload.failedFileCount}`,
    `- removedHistoryLines: ${payload.removedHistoryLines}`,
  ];

  const failedFiles = Array.isArray(payload.failedFiles) ? payload.failedFiles : [];
  if (failedFiles.length > 0) {
    lines.push("- failedFiles:");
    for (const filePath of failedFiles) {
      lines.push(`  - ${filePath}`);
    }
  }
  return lines.join("\n");
}

function formatArchiveHuman(payload) {
  const lines = [
    "归档结果：",
    `- movedFiles: ${payload.movedFiles}`,
    `- failedFileCount: ${payload.failedFileCount}`,
    `- conflictSkippedCount: ${payload.conflictSkippedCount}`,
  ];

  const conflictSkippedSessionIds = Array.isArray(payload.conflictSkippedSessionIds)
    ? payload.conflictSkippedSessionIds
    : [];
  if (conflictSkippedSessionIds.length > 0) {
    lines.push("- conflictSkippedSessionIds:");
    for (const sessionId of conflictSkippedSessionIds) {
      lines.push(`  - ${sessionId}`);
    }
  }

  const failedFiles = Array.isArray(payload.failedFiles) ? payload.failedFiles : [];
  if (failedFiles.length > 0) {
    lines.push("- failedFiles:");
    for (const item of failedFiles) {
      if (typeof item === "string") {
        lines.push(`  - ${item}`);
        continue;
      }
      const reason = item.reason || "未知错误";
      const sessionId = item.sessionId || "";
      const sourcePath = item.sourcePath || "";
      const targetPath = item.targetPath || "";
      lines.push(`  - sessionId: ${sessionId}`);
      lines.push(`    reason: ${reason}`);
      lines.push(`    sourcePath: ${sourcePath}`);
      lines.push(`    targetPath: ${targetPath}`);
    }
  }

  return lines.join("\n");
}

function formatRecoverHuman(payload) {
  const lines = [
    "恢复结果：",
    `- movedFiles: ${payload.movedFiles}`,
    `- failedFileCount: ${payload.failedFileCount}`,
    `- conflictSkippedCount: ${payload.conflictSkippedCount}`,
  ];

  const conflictSkippedSessionIds = Array.isArray(payload.conflictSkippedSessionIds)
    ? payload.conflictSkippedSessionIds
    : [];
  if (conflictSkippedSessionIds.length > 0) {
    lines.push("- conflictSkippedSessionIds:");
    for (const sessionId of conflictSkippedSessionIds) {
      lines.push(`  - ${sessionId}`);
    }
  }

  const failedFiles = Array.isArray(payload.failedFiles) ? payload.failedFiles : [];
  if (failedFiles.length > 0) {
    lines.push("- failedFiles:");
    for (const item of failedFiles) {
      if (typeof item === "string") {
        lines.push(`  - ${item}`);
        continue;
      }
      const reason = item.reason || "未知错误";
      const sessionId = item.sessionId || "";
      const sourcePath = item.sourcePath || "";
      const targetPath = item.targetPath || "";
      lines.push(`  - sessionId: ${sessionId}`);
      lines.push(`    reason: ${reason}`);
      lines.push(`    sourcePath: ${sourcePath}`);
      lines.push(`    targetPath: ${targetPath}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  formatArchiveHuman,
  formatDeleteHuman,
  formatExportHuman,
  formatListHuman,
  formatSessionMarkdown,
  formatPreviewHuman,
  formatRecoverHuman,
  toJson,
};
