# Changelog

本项目变更记录遵循 Keep a Changelog 思路，并使用语义化版本（Semantic Versioning）。

## [0.2.0] - 2026-03-20

### Added
- 新增 `export` 命令，支持按 `session-id` 导出会话为 Markdown 内容文件。
- 新增导出结果摘要输出，支持普通文本与 `--json` 两种返回格式。

### Changed
- `list` 默认仅展示未归档的 `sessions`；显式 `--source archived` 仅查看归档，显式 `--source all` 时展示全部会话。
- `export` 收敛为单一导出格式：文件头固定包含 `sessionId`、来源、时间，正文按时间顺序交替输出真实 `user/assistant` 消息。
- `export` 默认不把 `system` 消息重复导出到正文；正文仍过滤角色提示、环境注入与任务包装等无用内容，不再区分 `minimal/full`。
- `export` 仅允许写入当前项目目录内的相对路径，并阻止通过链接跳出项目目录。
- `export` 的 `--max-messages` 仅统计最终实际写入正文的有效消息。
- CLI 帮助、Skill 白名单与中英文 README 同步更新为单一导出格式说明。

## [0.1.0] - 2026-02-09

### Added
- 首次发布 `codex-history-skill`。
- 新增会话列表查询：`list`（支持 `all/sessions/archived` 来源过滤）。
- 新增会话预览：`preview`。
- 新增会话归档与恢复：`archive` / `recover`。
- 新增会话删除：`delete`（按 `session-id` 精确操作，需 `--force`）。

### Changed
- 列表人类可读输出增强：显式展示 `标题` 字段，标题为空时回退为 `sessionId`。
- 打包结构调整：`codex-history-skill.zip` 内包含顶层目录 `codex-history/`。

### Docs
- 完善 `README.md`：补充 CLI 命令速查与兼容性说明。
- 增加删除风险提示：`delete` 为物理删除，默认不可恢复。
- 新增 `LICENSE`（MIT）并同步 `SKILL.md` / `package.json` 许可证信息。
