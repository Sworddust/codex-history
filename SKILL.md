---
name: codex-history
description: 在 Codex 对话中管理本机历史会话，支持 list、preview、archive、recover、delete，并同步清理 history.jsonl。
license: MIT
---

# Codex History Skill

## 适用场景
- 在 Codex CLI 对话中查看本机会话历史
- 预览指定会话消息内容
- 归档指定会话到 `archived_sessions`
- 将误归档会话恢复到 `sessions/YYYY/MM/DD`
- 按明确 `session-id` 删除会话，并同步清理 `history.jsonl`

## 触发条件（必须同时满足）
- 用户请求属于 `list`、`preview`、`archive`、`recover`、`delete` 五类之一
- 目标是 Codex 本地历史（`CODEX_HOME` 或 `~/.codex`）
- 可通过 `node scripts/history-cli.js` 完成，不需要其他脚本

## 禁止触发（命中任一即拒绝）
- 模糊删除或批量清空请求（如“全删”“删最近几条”但未提供 `session-id`）
- 任何 `.codex` 目录之外的文件系统操作
- 任何非白名单命令（如 `rm`、`del`、`git`、`python`、自定义脚本）
- 修改、覆盖或重命名 Skill 源码与配置文件

## 能力边界
- Skill 为自包含实现，安装到 `$CODEX_HOME/skills/codex-history` 后可独立运行
- 默认读取 `CODEX_HOME`，未设置时回退到 `~/.codex`
- 只处理会话相关数据：`sessions`、`archived_sessions`、`history.jsonl`
- `archive` 仅允许把 `sessions` 中会话归档到 `archived_sessions`
- `recover` 仅允许把 `archived_sessions` 中会话恢复到 `sessions/YYYY/MM/DD`
- `delete` 为物理删除：会删除会话文件并清理 `history.jsonl` 对应行，执行后不可恢复（除非用户有外部备份）
- 不负责系统维护、权限变更、环境清理、备份恢复等操作

## 操作白名单（严格）

### list
```bash
node scripts/history-cli.js list [--source all|sessions|archived] [--limit N] [--json]
```

### preview
```bash
node scripts/history-cli.js preview --session-id <id> [--max-messages N] [--json]
```

### archive
```bash
node scripts/history-cli.js archive --session-id <id> [--session-id <id> ...] [--force] [--json]
```

### recover
```bash
node scripts/history-cli.js recover --session-id <id> [--session-id <id> ...] [--force] [--json]
```

### delete
```bash
node scripts/history-cli.js delete --session-id <id> [--session-id <id> ...] [--force] [--json]
```

除上述命令外，一律拒绝执行。

## 删除护栏（强制）
1. 必须先校验 `session-id` 明确且非空
2. 必须先执行 `preview`，确认目标会话存在且匹配
3. 执行删除时必须包含 `--force`
4. 删除前必须明确提醒用户：`delete` 为物理删除且不可恢复
5. 删除后必须返回删除摘要：`deletedFiles`、`failedFiles`、`removedHistoryLines`

## 执行流程（建议）
1. 识别用户意图并匹配 `list/preview/archive/recover/delete`
2. 检查是否命中禁止触发项
3. 仅使用白名单命令执行操作
4. 按统一输出格式返回结果

## 统一输出格式
- `command`：实际执行命令
- `sessionIds`：目标会话 ID 列表（`list` 可为空）
- `result`：成功/失败与核心结果摘要
- `exitCode`：CLI 退出码
- 失败时额外输出：`reason`、`nextAction`

### list 输出约定（强制）
- 人类可读输出必须包含 `标题`、`sessionId`、`时间`、`文件`
- 标题为空时回退 `sessionId` 作为标题，禁止省略标题字段
- 标题过长时可摘要显示，但必须保留标题字段标签

## 越界拒绝模板
```text
该请求超出 codex-history 的能力边界。
本 Skill 仅支持 list / preview / archive / recover / delete（按 session-id 精确操作），
不会执行白名单之外命令，也不会操作 .codex 之外路径。
```

## 退出码
- `0`：成功
- `2`：参数错误
- `3`：目标会话不存在
- `4`：部分失败（存在文件操作失败或冲突跳过，如 `archive/recover/delete`）
- `5`：未处理异常

## 示例
```bash
node scripts/history-cli.js list --limit 5
node scripts/history-cli.js preview --session-id sess-123 --json
node scripts/history-cli.js archive --session-id sess-123
node scripts/history-cli.js recover --session-id sess-123
node scripts/history-cli.js delete --session-id sess-123 --session-id sess-456 --force
```
