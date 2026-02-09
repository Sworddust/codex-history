# Codex History Skill

中文 | [English](./README.en.md)

## 1. 简单介绍 Skill

`Codex History Skill` 用于管理本机 Codex 对话历史，支持查看、预览、归档、恢复和删除会话记录。

## 2. 功能清单

- 列出会话历史（支持 `sessions` / `archived_sessions`）
- 会话列表输出包含标题（标题为空时回退为 `sessionId`）
- 按 `session-id` 预览会话内容
- 归档指定会话（`sessions` -> `archived_sessions`）
- 恢复误归档会话（`archived_sessions` -> `sessions/YYYY/MM/DD`）
- 删除指定会话并同步清理 `history.jsonl`
- 支持普通文本输出和 `--json` 输出

## 2.1 重要提醒（删除不可恢复）

- `delete` 是**物理删除**，会直接删除会话文件，并从 `history.jsonl` 移除对应记录。
- 删除后默认**不可恢复**，请仅在确认无误时执行。
- 若需要“可撤销”的处理，请优先使用 `archive`，误操作可用 `recover` 恢复。

## 3. 如何使用

1) 从 GitHub Releases 下载 `codex-history-skill.zip`。  
2) 解压到 `~/.codex/skills`（压缩包内已包含 `codex-history/` 目录）。  
3) 重启 Codex。  
4) 在 Codex 对话中直接让 AI 使用该 Skill。

Windows（PowerShell）示例：

```powershell
$skillDir = "$env:USERPROFILE\.codex\skills"
New-Item -ItemType Directory -Force $skillDir | Out-Null
Expand-Archive -Path .\codex-history-skill.zip -DestinationPath $skillDir -Force
```

macOS / Linux 示例：

```bash
mkdir -p ~/.codex/skills
unzip codex-history-skill.zip -d ~/.codex/skills
```

## 3.1 CLI 命令速查

```bash
# 列表（最近 10 条）
node scripts/history-cli.js list --limit 10

# 仅看归档会话
node scripts/history-cli.js list --source archived --limit 10

# 预览会话
node scripts/history-cli.js preview --session-id <id>

# 归档会话
node scripts/history-cli.js archive --session-id <id>

# 恢复归档会话
node scripts/history-cli.js recover --session-id <id>

# 删除会话（物理删除，不可恢复）
node scripts/history-cli.js delete --session-id <id> --force
```

## 3.2 兼容性

- Node.js `>=14.0.0`
- 建议在 Node.js 18 或更高版本运行

## 4. 示例

```text
使用 codex-history skill 列举最近对话

使用 codex-history skill 预览 session-id 为 019c4040-xxxx 的对话

使用 codex-history skill 删除 session-id 为 019c4040-xxxx 的对话

使用 codex-history skill 归档 session-id 为 019c4040-xxxx 的对话

使用 codex-history skill 恢复 session-id 为 019c4040-xxxx 的误归档对话

使用 codex-history skill 以 JSON 格式输出最近 20 条会话
```
