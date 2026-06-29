# 🔊 Claude Soundboard

A tiny, fun Claude Code plugin that **plays a sound when Claude replies** — but only as often as you want it to.

Set it to fire on every answer, or 20% of the time for a random little dopamine hit. Build a library of sounds, assign different ones to different moments, or **add any sound by pasting a YouTube link**.

```
You ──prompt──▶ Claude ──reply──▶ 🔔  (plays ~25% of the time, your call)
```

- 🎲 **Probability per event** — `100%` for always, `20%` for occasional, `0%` for never.
- 🎚️ **Four triggers** — a sound when Claude _answers_, _needs you_, when _you_ hit send, or at _session start_.
- 📺 **Paste a YouTube link** — `/soundboard:sounds add <url> fahh` rips the audio into your library.
- 🎵 **Sound library** — name sounds, assign them, or set a trigger to `random`.
- 🪶 **Zero dependencies** — runs on the Node that already ships with Claude Code. Cross-platform.
- 🤫 **Never blocks** — playback is fire-and-forget; it can't slow Claude down.

---

## Install

```bash
# 1. Add this repo as a plugin marketplace
/plugin marketplace add fndrstudio/claude-soundboard

# 2. Install the plugin
/plugin install soundboard@claude-soundboard
```

Restart Claude Code (or reload the window) so the hooks register. That's it — the next time Claude finishes a reply, you'll hear the built-in chime.

> Prefer to try it locally first? Clone the repo and run `/plugin marketplace add /path/to/claude-soundboard`.

**The command is `/soundboard:sounds`.** Plugin commands are always namespaced `/<plugin>:<command>`, so there is no bare `/sounds` — type `/sound` and let it autocomplete.

---

## Quick start

```bash
/soundboard:sounds                   # see what's on
/soundboard:sounds reply 25%         # chime after ~1 in 4 answers
/soundboard:sounds add https://youtu.be/VIDEO_ID fahh 0:03-0:08   # import a clip
/soundboard:sounds reply fahh        # use it for replies
/soundboard:sounds test              # hear the current reply sound
/soundboard:sounds off               # mute everything
```

---

## The `/soundboard:sounds` command

Every subcommand below is typed after `/soundboard:sounds`:

| Subcommand                     | What it does                            |
| ------------------------------ | --------------------------------------- |
| _(nothing)_                    | Show current status                     |
| `on` · `off`                   | Master mute toggle                      |
| `25%`                          | Set the **reply** sound to a 25% chance |
| `reply 50`                     | Set a trigger's probability             |
| `reply on` · `waiting off`     | Enable/disable a trigger                |
| `reply fahh`                   | Assign a library sound to a trigger     |
| `reply random`                 | Pick a random library sound each time   |
| `add <url> [name] [start-end]` | Import audio from YouTube               |
| `rename <old> <new>`           | Rename a custom sound                   |
| `remove <name>`                | Delete a custom sound                   |
| `list`                         | Show your sound library                 |
| `test [trigger\|name]`         | Play a sound right now                  |

> **It runs the script, it doesn't ask Claude to improvise.** The command executes `soundboard.js` directly and applies your change deterministically — Claude only relays the result, it never hand-edits your config.

---

## The four triggers

| Trigger   | Fires when…                        | Hook               | Default      |
| --------- | ---------------------------------- | ------------------ | ------------ |
| `reply`   | Claude finishes an answer          | `Stop`             | **on, 100%** |
| `waiting` | Claude needs you / asks permission | `Notification`     | off          |
| `prompt`  | You submit a message               | `UserPromptSubmit` | off          |
| `session` | A session starts                   | `SessionStart`     | off          |

Each has its own on/off switch, its own probability, and its own sound. Want a soft chime when an answer lands but a FAHHH when Claude needs your attention? Easy:

```bash
/soundboard:sounds reply chime
/soundboard:sounds waiting on
/soundboard:sounds waiting fahh
```

---

## Adding sounds from YouTube

```bash
/soundboard:sounds add https://youtu.be/VIDEO_ID
/soundboard:sounds add https://youtu.be/VIDEO_ID fahh
/soundboard:sounds add https://youtu.be/VIDEO_ID drumroll 0:02-0:05   # grab ONLY 0:02–0:05
```

**Most YouTube sounds are too long** — just append a `start-end` range and only that snippet is downloaded (handy for long intros, and yt-dlp pulls the raw stream so there are no ads either way). Times accept `SS`, `M:SS`, or `H:MM:SS`, e.g. `0:03-0:08`, `90-95`, `1:02:00-1:02:04`. The range is detected automatically, so the `clip` keyword is optional.

> If your link contains an `&` (e.g. a playlist URL), wrap it in quotes: `add "https://…&list=…" fahh`. The short `youtu.be/ID` form never needs quoting.

This feature shells out to [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) + `ffmpeg`. They're **only** needed for `add` — everything else works without them. If they're missing, the command tells you how to install them:

```bash
# macOS
brew install yt-dlp ffmpeg
# Linux
sudo apt install ffmpeg && pipx install yt-dlp
# Windows
winget install yt-dlp.yt-dlp Gyan.FFmpeg
```

> Only add audio you have the right to use. Downloaded clips are stored locally and never uploaded anywhere.

---

## Configuration

Everything the command changes is stored in a plain JSON file you can also edit by hand:

| Platform      | Path                                      |
| ------------- | ----------------------------------------- |
| macOS / Linux | `~/.config/claude-soundboard/config.json` |
| Windows       | `%APPDATA%\claude-soundboard\config.json` |

```json
{
  "enabled": true,
  "triggers": {
    "reply": { "enabled": true, "probability": 25, "sound": "fahh" },
    "waiting": { "enabled": false, "probability": 100, "sound": "default" },
    "prompt": { "enabled": false, "probability": 100, "sound": "default" },
    "session": { "enabled": false, "probability": 100, "sound": "default" }
  },
  "library": {
    "fahh": "/Users/you/.config/claude-soundboard/sounds/fahh.mp3"
  }
}
```

`sound` can be `"default"` (the bundled chime), `"random"` (any library sound), a library name, or an absolute path to your own file. Imported sounds live in `…/claude-soundboard/sounds/`.

---

## How it works

A Claude Code [hook](https://code.claude.com/docs/en/hooks) on the `Stop` event runs `soundboard.js play reply` each time Claude finishes a turn. The script reads your config, rolls a die against the probability, and — if it wins — spawns your platform's audio player **detached** so the sound plays without the hook ever waiting. The `Notification`, `UserPromptSubmit`, and `SessionStart` hooks drive the other three triggers the same way.

The `/soundboard:sounds` command is a thin wrapper that runs the same script with your arguments, so config changes are deterministic — not improvised by the model.

Cross-platform playback uses `afplay` (macOS), `paplay`/`aplay`/`ffplay` (Linux), or PowerShell's `MediaPlayer` (Windows).

---

## Uninstall

```bash
/plugin uninstall soundboard@claude-soundboard
```

To also remove your settings and imported sounds, delete the config folder above.

---

## Contributing

PRs welcome — new bundled sounds, better Windows playback, more triggers. Keep the core dependency-free (Node built-ins only). The whole plugin is one small `soundboard.js`.

## License

[MIT](LICENSE) © FNDR Studio. The bundled `chime.wav` is an original synthesized tone, free to use.
