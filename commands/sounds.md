---
description: Control the Claude Soundboard — toggle on/off, set probability, manage sounds, import from YouTube
argument-hint: "[on|off|<trigger> <pct>|add <url> [name] [start-end]|list|rename|remove|test]"
allowed-tools: Bash(node:*)
---

The soundboard control script runs below and applies the change **deterministically**. Do not edit any config file yourself.

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/soundboard.js" $ARGUMENTS`

Show the script's output above to the user verbatim. If the block above produced no output (the inline execution did not run), then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/soundboard.js" $ARGUMENTS` once with the Bash tool and relay that instead. Never hand-edit the JSON config. Add no commentary unless the script reported an error.
