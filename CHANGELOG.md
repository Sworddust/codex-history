# Changelog

本项目变更记录遵循 Keep a Changelog 思路，并使用语义化版本（Semantic Versioning）。

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
