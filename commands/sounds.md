---
description: Control the Claude Soundboard — toggle on/off, set probability, manage sounds, import from YouTube
argument-hint: "[on|off|status|<trigger> <value>|add <url> [name]|list|remove <name>|test]"
allowed-tools: Bash(node:*)
---

Run the soundboard control script with the user's arguments and show its output to the user **verbatim** — it already prints a friendly, human-readable status. Do not add commentary unless the command failed.

Run exactly this with the Bash tool:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/soundboard.js" $ARGUMENTS
```

Notes:

- If `$ARGUMENTS` is empty, the script prints the current status — that is the intended behaviour, not an error.
- The `add` subcommand downloads audio from YouTube via `yt-dlp`; if it reports a missing dependency, relay the install instructions it printed.
