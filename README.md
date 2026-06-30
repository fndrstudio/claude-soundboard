# 🔊 Claude FAHHH Replier

**Claude Code goes FAHHH every time it replies.**

That's it. That's the plugin. Install it and every answer Claude gives lands with a triumphant **FAHHH**. Too much? Dial it down to fire 1-in-4 replies. Want a different sound? Paste any YouTube link. But out of the box: pure, relentless FAHHH.

```
You ──prompt──▶ Claude ──reply──▶ 🔊 FAHHH
```

- 🔊 **FAHHH by default** — no setup; the sound is fetched automatically on first run.
- 🎲 **Dial the frequency** — every reply, or 25%, or off. Your eardrums, your call.
- 🎚️ **More triggers** — also FAHHH when Claude needs you, when you hit send, or at session start.
- 📺 **Bring your own** — swap the FAHHH for any YouTube clip (`add <url> 0:03-0:08`).
- 🪶 **Zero dependencies** — runs on the Node that ships with Claude Code. Cross-platform.
- 🤫 **Never blocks** — playback is fire-and-forget; it can't slow Claude down.

---

## Install

```bash
# 1. Add the marketplace
/plugin marketplace add fndrstudio/claude-fahhh

# 2. Install
/plugin install soundboard@claude-fahhh
```

Restart Claude Code so the hooks register. On the first session the plugin quietly grabs the FAHHH (a 3-second clip) and from then on **every reply goes FAHHH**.

> **First-run fetch needs [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) + `ffmpeg`** (the FAHHH lives on YouTube and is downloaded onto _your_ machine, never shipped in this repo). Until they're installed you'll hear a neutral chime instead. Get them with `brew install yt-dlp ffmpeg` (macOS), `sudo apt install ffmpeg && pipx install yt-dlp` (Linux), or `winget install yt-dlp.yt-dlp Gyan.FFmpeg` (Windows), then run `/soundboard:sounds fahhh`.

The control command is **`/soundboard:sounds`** (plugin commands are namespaced `/<plugin>:<command>`).

---

## Make it bearable

```bash
/soundboard:sounds reply 25%     # FAHHH on ~1 of every 4 replies
/soundboard:sounds off           # mute everything
/soundboard:sounds on            # bring it back
/soundboard:sounds               # show current status
```

## The `/soundboard:sounds` command

Every subcommand is typed after `/soundboard:sounds`:

| Subcommand                     | What it does                              |
| ------------------------------ | ----------------------------------------- |
| _(nothing)_                    | Show current status                       |
| `on` · `off`                   | Master mute toggle                        |
| `25%`                          | Set the **reply** sound to a 25% chance   |
| `fahhh`                        | (Re)fetch the FAHHH and set it on replies |
| `reply 50`                     | Set a trigger's probability               |
| `reply on` · `waiting off`     | Enable/disable a trigger                  |
| `reply <name>`                 | Assign a library sound to a trigger       |
| `reply random`                 | Pick a random library sound each time     |
| `add <url> [name] [start-end]` | Import another sound from YouTube         |
| `fade <name> [seconds]`        | Smooth a sound's ending (default 0.3s)    |
| `rename <old> <new>`           | Rename a custom sound                     |
| `remove <name>`                | Delete a custom sound                     |
| `list`                         | Show your sound library                   |
| `test [trigger\|name]`         | Play a sound right now                    |

> The command runs `soundboard.js` directly and applies your change deterministically — Claude only relays the result, it never hand-edits your config.

---

## The four triggers

| Trigger   | Fires when…                        | Hook               | Default         |
| --------- | ---------------------------------- | ------------------ | --------------- |
| `reply`   | Claude finishes an answer          | `Stop`             | **FAHHH, 100%** |
| `waiting` | Claude needs you / asks permission | `Notification`     | off             |
| `prompt`  | You submit a message               | `UserPromptSubmit` | off             |
| `session` | A session starts                   | `SessionStart`     | off             |

Each has its own on/off switch, probability, and sound — so you can FAHHH on replies but use something gentler when Claude needs your attention.

---

## Bring your own sound

Don't want the FAHHH? Replace it with anything on YouTube:

```bash
/soundboard:sounds add https://youtu.be/VIDEO_ID airhorn
/soundboard:sounds add https://youtu.be/VIDEO_ID drumroll 0:02-0:05   # grab ONLY 0:02–0:05
/soundboard:sounds reply airhorn
```

**Most clips are too long** — append a `start-end` range and only that snippet downloads (and yt-dlp pulls the raw stream, so no ads). Times accept `SS`, `M:SS`, or `H:MM:SS`. Imported sounds get a **0.3s fade-out** automatically so they don't cut off abruptly (`fade <sec>` to adjust, `nofade` to skip; `fade <name>` to smooth one you already have).

> If a link contains an `&`, wrap it in quotes. The short `youtu.be/ID` form never needs it.

---

## Configuration

Everything is stored in a plain JSON file you can also edit by hand:

| Platform      | Path                                      |
| ------------- | ----------------------------------------- |
| macOS / Linux | `~/.config/claude-soundboard/config.json` |
| Windows       | `%APPDATA%\claude-soundboard\config.json` |

```json
{
  "enabled": true,
  "triggers": {
    "reply": { "enabled": true, "probability": 100, "sound": "fahhh" },
    "waiting": { "enabled": false, "probability": 100, "sound": "default" },
    "prompt": { "enabled": false, "probability": 100, "sound": "default" },
    "session": { "enabled": false, "probability": 100, "sound": "default" }
  },
  "library": {
    "fahhh": "/Users/you/.config/claude-soundboard/sounds/fahhh.mp3"
  }
}
```

`sound` can be `"default"` (the bundled fallback chime), `"random"`, a library name, or an absolute path. Fetched/imported sounds live in `…/claude-soundboard/sounds/`.

---

## How it works

A Claude Code [hook](https://code.claude.com/docs/en/hooks) on the `Stop` event runs `soundboard.js play reply` each time Claude finishes a turn. The script reads your config, rolls a die against the probability, and — if it wins — spawns your platform's audio player **detached** so the FAHHH plays without the hook ever waiting. On a fresh install the first hook also kicks off a one-time background fetch of the FAHHH. The other three triggers work the same way.

Cross-platform playback uses `afplay` (macOS), `paplay`/`aplay`/`ffplay` (Linux), or PowerShell's `MediaPlayer` (Windows).

---

## Uninstall

```bash
/plugin uninstall soundboard@claude-fahhh
```

To also remove your settings and downloaded sounds, delete the config folder above.

---

## Contributing

PRs welcome — better Windows playback, more triggers, more ways to FAHHH. Keep the core dependency-free (Node built-ins only). The whole plugin is one small `soundboard.js`.

## License

[MIT](LICENSE) © FNDR Studio. The bundled `chime.wav` fallback is an original synthesized tone, free to use. The FAHHH is downloaded from YouTube to your machine and is **not** distributed with this repo.
