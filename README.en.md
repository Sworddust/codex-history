# Codex History Skill

[中文](./README.md) | English

## 1. Overview

`Codex History Skill` helps you manage local Codex conversation history, including listing, previewing, archiving, recovering, and deleting sessions.

## 2. Features

- List session history (supports `sessions` and `archived_sessions`)
- Show session title in list output (falls back to `sessionId` when title is empty)
- Preview session content by `session-id`
- Archive specific sessions (`sessions` -> `archived_sessions`)
- Recover archived sessions (`archived_sessions` -> `sessions/YYYY/MM/DD`)
- Delete specific sessions and remove corresponding entries in `history.jsonl`
- Support both human-readable output and `--json` output

## 2.1 Important Notice (Delete is irreversible)

- `delete` performs a **physical deletion**: it removes session files directly and deletes related lines from `history.jsonl`.
- Deletion is **irreversible by default**. Please use it only when you are sure.
- If you need a reversible workflow, use `archive` first and `recover` for rollback.

## 3. Installation

1) Download `codex-history-skill.zip` from GitHub Releases.  
2) Extract it to `~/.codex/skills` (the zip already contains the `codex-history/` top-level folder).  
3) Restart Codex.  
4) Ask Codex to use this skill in conversation.

Windows (PowerShell):

```powershell
$skillDir = "$env:USERPROFILE\.codex\skills"
New-Item -ItemType Directory -Force $skillDir | Out-Null
Expand-Archive -Path .\codex-history-skill.zip -DestinationPath $skillDir -Force
```

macOS / Linux:

```bash
mkdir -p ~/.codex/skills
unzip codex-history-skill.zip -d ~/.codex/skills
```

## 3.1 CLI Quick Reference

```bash
# List recent sessions (top 10)
node scripts/history-cli.js list --limit 10

# List archived sessions only
node scripts/history-cli.js list --source archived --limit 10

# Preview a session
node scripts/history-cli.js preview --session-id <id>

# Archive a session
node scripts/history-cli.js archive --session-id <id>

# Recover an archived session
node scripts/history-cli.js recover --session-id <id>

# Delete a session (physical deletion, irreversible)
node scripts/history-cli.js delete --session-id <id> --force
```

## 3.2 Compatibility

- Node.js `>=14.0.0`
- Node.js 18+ is recommended

## 4. Examples

```text
Use codex-history skill to list recent conversations

Use codex-history skill to preview session-id 019c4040-xxxx

Use codex-history skill to delete session-id 019c4040-xxxx

Use codex-history skill to archive session-id 019c4040-xxxx

Use codex-history skill to recover mistakenly archived session-id 019c4040-xxxx

Use codex-history skill to output the latest 20 sessions in JSON format
```
