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

  const lines = ["Codex 会话列表："];
  for (const item of items) {
    const timeText = item.timeText || "无时间";
    const sourceText = item.source || "unknown";
    const titleText = formatListTitle(item.title, item.sessionId);
    lines.push(`- [${sourceText}]`);
    lines.push(`  标题: ${titleText}`);
    lines.push(`  sessionId: ${item.sessionId}`);
    lines.push(`  时间: ${timeText}`);
    lines.push(`  文件: ${item.filePath}`);
  }
  lines.push(`总数: ${payload.total}`);
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
  for (const message of messages) {
    const role = message.role === "user" ? "用户" : "助手";
    const time = message.timestamp || "";
    lines.push(`- ${role}${time ? ` (${time})` : ""}`);
    lines.push(`  ${message.text}`);
  }
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
  formatListHuman,
  formatPreviewHuman,
  formatRecoverHuman,
  toJson,
};
