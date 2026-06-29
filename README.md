# 🔊 Claude Soundboard

A tiny, fun Claude Code plugin that **plays a sound when Claude replies** — but only as often as you want it to.

Set it to fire on every answer, or 20% of the time for a random little dopamine hit. Build a library of sounds, assign different ones to different moments, or **add any sound by pasting a YouTube link**.

```
You ──prompt──▶ Claude ──reply──▶ 🔔  (plays ~25% of the time, your call)
```

- 🎲 **Probability per event** — `100%` for always, `20%` for occasional, `0%` for never.
- 🎚️ **Four triggers** — a sound when Claude _answers_, _needs you_, when _you_ hit send, or at _session start_.
- 📺 **Paste a YouTube link** — `/sounds add <url> airhorn` rips the audio into your library.
- 🎵 **Sound library** — name sounds, assign them, or set a trigger to `random`.
- 🪶 **Zero dependencies** — runs on the Node that already ships with Claude Code. Cross-platform.
- 🤫 **Never blocks** — playback is fire-and-forget; it can't slow Claude down.

---

## Install

```bash
# 1. Add this repo as a plugin marketplace
/plugin marketplace add fndrstudio/claude-soundboard

# 2. Install the plugin
/plugin install claude-soundboard@claude-soundboard
```

Restart Claude Code (or reload the window) so the hooks register. That's it — the next time Claude finishes a reply, you'll hear the built-in chime.

> Prefer to try it locally first? Clone the repo and run `/plugin marketplace add /path/to/claude-soundboard`.

---

## Quick start

```bash
/sounds                     # see what's on
/sounds reply 25%           # chime after ~1 in 4 answers
/sounds add https://youtu.be/dQw4w9WgXcQ airhorn   # import a sound
/sounds reply airhorn       # use it for replies
/sounds test                # hear the current reply sound
/sounds off                 # mute everything
```

---

## The `/sounds` command

| Command                                     | What it does                            |
| ------------------------------------------- | --------------------------------------- |
| `/sounds`                                   | Show current status                     |
| `/sounds on` · `/sounds off`                | Master mute toggle                      |
| `/sounds 25%`                               | Set the **reply** sound to a 25% chance |
| `/sounds reply 50`                          | Set a trigger's probability             |
| `/sounds reply on` · `/sounds waiting off`  | Enable/disable a trigger                |
| `/sounds reply bonk`                        | Assign a library sound to a trigger     |
| `/sounds reply random`                      | Pick a random library sound each time   |
| `/sounds add <url> [name] [clip 0:03-0:08]` | Import audio from YouTube               |
| `/sounds list`                              | Show your sound library                 |
| `/sounds remove <name>`                     | Delete a custom sound                   |
| `/sounds test [trigger\|name]`              | Play a sound right now                  |

---

## The four triggers

| Trigger   | Fires when…                        | Hook               | Default      |
| --------- | ---------------------------------- | ------------------ | ------------ |
| `reply`   | Claude finishes an answer          | `Stop`             | **on, 100%** |
| `waiting` | Claude needs you / asks permission | `Notification`     | off          |
| `prompt`  | You submit a message               | `UserPromptSubmit` | off          |
| `session` | A session starts                   | `SessionStart`     | off          |

Each has its own on/off switch, its own probability, and its own sound. Want a soft chime when an answer lands but an airhorn when Claude needs your attention? Easy:

```bash
/sounds reply chime
/sounds waiting on
/sounds waiting airhorn
```

---

## Adding sounds from YouTube

```bash
/sounds add https://www.youtube.com/watch?v=VIDEO_ID
/sounds add https://youtu.be/VIDEO_ID airhorn
/sounds add https://youtu.be/VIDEO_ID drumroll 0:02-0:05   # grab ONLY 0:02–0:05
```

**Most YouTube sounds are too long** — just append a `start-end` range and only that snippet is downloaded (handy for long intros, and yt-dlp pulls the raw stream so there are no ads either way). Times accept `SS`, `M:SS`, or `H:MM:SS`, e.g. `0:03-0:08`, `90-95`, `1:02:00-1:02:04`. The range is detected automatically, so the `clip` keyword is optional.

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

Everything `/sounds` changes is stored in a plain JSON file you can also edit by hand:

| Platform      | Path                                      |
| ------------- | ----------------------------------------- |
| macOS / Linux | `~/.config/claude-soundboard/config.json` |
| Windows       | `%APPDATA%\claude-soundboard\config.json` |

```json
{
  "enabled": true,
  "triggers": {
    "reply": { "enabled": true, "probability": 25, "sound": "airhorn" },
    "waiting": { "enabled": false, "probability": 100, "sound": "default" },
    "prompt": { "enabled": false, "probability": 100, "sound": "default" },
    "session": { "enabled": false, "probability": 100, "sound": "default" }
  },
  "library": {
    "airhorn": "/Users/you/.config/claude-soundboard/sounds/airhorn.mp3"
  }
}
```

`sound` can be `"default"` (the bundled chime), `"random"` (any library sound), a library name, or an absolute path to your own file. Imported sounds live in `…/claude-soundboard/sounds/`.

---

## How it works

A Claude Code [hook](https://code.claude.com/docs/en/hooks) on the `Stop` event runs `soundboard.js play reply` each time Claude finishes a turn. The script reads your config, rolls a die against the probability, and — if it wins — spawns your platform's audio player **detached** so the sound plays without the hook ever waiting. The `Notification`, `UserPromptSubmit`, and `SessionStart` hooks drive the other three triggers the same way.

Cross-platform playback uses `afplay` (macOS), `paplay`/`aplay`/`ffplay` (Linux), or PowerShell's `MediaPlayer` (Windows).

---

## Uninstall

```bash
/plugin uninstall claude-soundboard@claude-soundboard
```

To also remove your settings and imported sounds, delete the config folder above.

---

## Contributing

PRs welcome — new bundled sounds, better Windows playback, more triggers. Keep the core dependency-free (Node built-ins only). The whole plugin is one small `soundboard.js`.

## License

[MIT](LICENSE) © FNDR Studio. The bundled `chime.wav` is an original synthesized tone, free to use.
