#!/usr/bin/env node
"use strict";

// Claude Soundboard — plays a sound on Claude events, gated by a per-event probability.
// Runs on the Node that ships with Claude Code, so it has zero npm dependencies.
// Invoked two ways:
//   node soundboard.js play <trigger>     (from hooks — silent, never blocks)
//   node soundboard.js <command> ...       (from the /soundboard:sounds slash command)

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const TRIGGERS = ["reply", "waiting", "prompt", "session"];

// The slash command users actually type. Plugin commands are namespaced as
// /<plugin>:<command>, so this is the single source of truth for every hint below.
const CMD = "/soundboard:sounds";

const PLUGIN_ROOT =
  process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
const BUILTIN_SOUND = path.join(PLUGIN_ROOT, "sounds", "chime.wav");

function configDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || os.homedir(), "claude-soundboard");
  }
  const base =
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "claude-soundboard");
}
const CONFIG_FILE = path.join(configDir(), "config.json");
const USER_SOUNDS = path.join(configDir(), "sounds");

function defaults() {
  const mk = (enabled) => ({ enabled, probability: 100, sound: "default" });
  return {
    enabled: true,
    triggers: {
      reply: mk(true),
      waiting: mk(false),
      prompt: mk(false),
      session: mk(false),
    },
    library: {},
  };
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}
function expandHome(p) {
  return p && p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}
function clamp(n) {
  return Math.max(0, Math.min(100, n));
}

function loadConfig() {
  const def = defaults();
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (_) {}
  const cfg = { ...def, ...raw };
  cfg.triggers = { ...def.triggers, ...(raw.triggers || {}) };
  for (const t of TRIGGERS)
    cfg.triggers[t] = { ...def.triggers[t], ...(cfg.triggers[t] || {}) };
  cfg.library = { ...(raw.library || {}) };
  return cfg;
}

function saveConfig(cfg) {
  ensureDir(configDir());
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + "\n");
}

function hasCmd(c) {
  const probe =
    process.platform === "win32"
      ? spawnSync("where", [c], { stdio: "ignore" })
      : spawnSync("sh", ["-c", `command -v ${c}`], { stdio: "ignore" });
  return probe.status === 0;
}

function resolveSound(cfg, sound) {
  if (!sound || sound === "default") return BUILTIN_SOUND;
  if (sound === "random") {
    const keys = Object.keys(cfg.library);
    if (!keys.length) return BUILTIN_SOUND;
    return cfg.library[keys[Math.floor(Math.random() * keys.length)]];
  }
  if (cfg.library[sound]) return cfg.library[sound];
  const asPath = expandHome(sound);
  if (asPath && fs.existsSync(asPath)) return asPath;
  return BUILTIN_SOUND;
}

// Fire-and-forget playback: spawn detached, never wait, never throw.
function play(file) {
  if (!file || !fs.existsSync(file)) return;
  try {
    let child;
    if (process.platform === "darwin") {
      child = spawn("afplay", [file], { detached: true, stdio: "ignore" });
    } else if (process.platform === "win32") {
      const uri = file.replace(/'/g, "''");
      const ps =
        `$ErrorActionPreference='SilentlyContinue';Add-Type -AssemblyName presentationCore;` +
        `$m=New-Object System.Windows.Media.MediaPlayer;$m.Open([uri]'${uri}');$m.Play();Start-Sleep -Seconds 12`;
      child = spawn(
        "powershell",
        ["-NoProfile", "-WindowStyle", "Hidden", "-c", ps],
        { detached: true, stdio: "ignore" },
      );
    } else {
      const player = ["paplay", "aplay", "ffplay"].find(hasCmd);
      if (!player) return;
      const args =
        player === "ffplay"
          ? ["-nodisp", "-autoexit", "-loglevel", "quiet", file]
          : [file];
      child = spawn(player, args, { detached: true, stdio: "ignore" });
    }
    child.unref();
  } catch (_) {
    /* a soundboard must never disrupt the session */
  }
}

// --- hook path: silent, fast, gated by probability ---
function hookPlay(trigger) {
  try {
    const cfg = loadConfig();
    if (!cfg.enabled) return;
    const t = cfg.triggers[trigger];
    if (!t || !t.enabled) return;
    if (Math.random() * 100 >= t.probability) return;
    play(resolveSound(cfg, t.sound));
  } catch (_) {}
}

// --- /soundboard:sounds command path: human-readable output relayed by Claude ---
function printStatus() {
  const cfg = loadConfig();
  let out = `🔊 Claude Soundboard: ${cfg.enabled ? "ON" : "OFF (muted)"}\n\n`;
  for (const t of TRIGGERS) {
    const c = cfg.triggers[t];
    out += `   ${t.padEnd(8)} ${c.enabled ? "on " : "off"}  ${String(c.probability).padStart(3)}%  → ${c.sound}\n`;
  }
  out += `\n   reply   = after Claude answers      prompt  = when you hit send`;
  out += `\n   waiting = when Claude needs you      session = at session start\n`;
  out += `\nControl with ${CMD} — e.g.  reply 25%  ·  add <url> fahh 0:03-0:08  ·  test  ·  off`;
  console.log(out);
}

function setMaster(on) {
  const cfg = loadConfig();
  cfg.enabled = on;
  saveConfig(cfg);
  console.log(`🔊 Soundboard ${on ? "ON" : "OFF — all sounds muted"}.`);
}

function setReplyProbability(v) {
  const n = clamp(parseInt(String(v).replace("%", ""), 10) || 0);
  const cfg = loadConfig();
  cfg.enabled = true;
  cfg.triggers.reply.enabled = true;
  cfg.triggers.reply.probability = n;
  saveConfig(cfg);
  console.log(
    `🔊 Reply sound set to ${n}% — plays after roughly ${n} of every 100 answers.`,
  );
}

function configTrigger(name, rest) {
  const cfg = loadConfig();
  const t = cfg.triggers[name];
  if (!rest.length) {
    console.log(
      `${name}: ${t.enabled ? "on" : "off"}, ${t.probability}%, sound → ${t.sound}`,
    );
    return;
  }
  const notes = [];
  for (const tok of rest) {
    if (tok === "on" || tok === "off") {
      t.enabled = tok === "on";
      notes.push(t.enabled ? "enabled" : "disabled");
    } else if (/^\d+%?$/.test(tok)) {
      t.probability = clamp(parseInt(tok, 10));
      t.enabled = true;
      notes.push(`${t.probability}%`);
    } else {
      const valid =
        tok === "default" ||
        tok === "random" ||
        cfg.library[tok] ||
        fs.existsSync(expandHome(tok));
      if (!valid) {
        console.log(
          `⚠️  No sound named "${tok}". Add one with: ${CMD} add <youtube-url> ${tok}`,
        );
        return;
      }
      t.sound = tok;
      notes.push(`sound → ${tok}`);
    }
  }
  saveConfig(cfg);
  console.log(`🔊 ${name}: ${notes.join(", ")}.`);
}

function test(arg) {
  const cfg = loadConfig();
  let sound = "default";
  if (arg) sound = TRIGGERS.includes(arg) ? cfg.triggers[arg].sound : arg;
  const file = resolveSound(cfg, sound);
  play(file);
  console.log(`▶️  Playing "${sound}".`);
}

function list() {
  const cfg = loadConfig();
  const names = Object.keys(cfg.library);
  let out = "🎵 Sound library:\n   default   (built-in chime)\n";
  out += names.length
    ? names.map((n) => `   ${n}`).join("\n") + "\n"
    : `   (no custom sounds yet — add one with ${CMD} add <youtube-url> [name])\n`;
  out += "\nAssigned to triggers:\n";
  for (const t of TRIGGERS)
    out += `   ${t.padEnd(8)} → ${cfg.triggers[t].sound}\n`;
  console.log(out);
}

function add(args) {
  let url = null,
    name = null,
    clip = null;
  const isRange = (s) => /^[\d:.]+-[\d:.]+$/.test(s);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "clip" || a === "--clip") {
      clip = args[++i];
      continue;
    }
    if (isRange(a)) {
      clip = a;
      continue;
    }
    if (!url) {
      url = a;
      continue;
    }
    if (!name) {
      name = a;
      continue;
    }
  }
  if (!url) {
    console.log(
      `Usage: ${CMD} add <youtube-url> [name] [start-end]   e.g. add <url> fahh 0:03-0:08`,
    );
    return;
  }
  if (!hasCmd("yt-dlp") || !hasCmd("ffmpeg")) {
    console.log(
      "⚠️  Adding sounds from YouTube needs yt-dlp + ffmpeg (one-time install):\n" +
        "   macOS:   brew install yt-dlp ffmpeg\n" +
        "   Linux:   sudo apt install ffmpeg && pipx install yt-dlp\n" +
        "   Windows: winget install yt-dlp.yt-dlp Gyan.FFmpeg",
    );
    return;
  }
  ensureDir(USER_SOUNDS);
  if (!name) {
    const t = spawnSync(
      "yt-dlp",
      ["--no-warnings", "--skip-download", "--print", "%(title)s", url],
      { encoding: "utf8" },
    );
    name = slug((t.stdout || "").trim().split("\n")[0]) || "clip";
  } else {
    name = slug(name);
  }
  const ytArgs = [
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    "--no-playlist",
    "-o",
    path.join(USER_SOUNDS, name + ".%(ext)s"),
  ];
  if (clip)
    ytArgs.push("--download-sections", `*${clip}`, "--force-keyframes-at-cuts");
  ytArgs.push(url);
  console.log(`⬇️  Downloading "${name}"…`);
  const r = spawnSync("yt-dlp", ytArgs, { encoding: "utf8" });
  const finalPath = path.join(USER_SOUNDS, name + ".mp3");
  if (r.status !== 0 || !fs.existsSync(finalPath)) {
    console.log(
      "❌ Download failed.\n" +
        (r.stderr || "").split("\n").filter(Boolean).slice(-3).join("\n"),
    );
    return;
  }
  const cfg = loadConfig();
  cfg.library[name] = finalPath;
  saveConfig(cfg);
  console.log(
    `✅ Added "${name}".\n   Assign it:  ${CMD} reply ${name}\n   Hear it:    ${CMD} test ${name}`,
  );
}

function rename(oldName, newRaw) {
  if (!oldName || !newRaw) {
    console.log(`Usage: ${CMD} rename <old> <new>`);
    return;
  }
  const newName = slug(newRaw);
  const cfg = loadConfig();
  if (!cfg.library[oldName]) {
    console.log(`No custom sound named "${oldName}".`);
    return;
  }
  if (cfg.library[newName]) {
    console.log(`A sound named "${newName}" already exists.`);
    return;
  }
  const oldPath = cfg.library[oldName];
  const newPath = path.join(USER_SOUNDS, newName + path.extname(oldPath));
  try {
    fs.renameSync(oldPath, newPath);
  } catch (_) {}
  delete cfg.library[oldName];
  cfg.library[newName] = newPath;
  for (const t of TRIGGERS)
    if (cfg.triggers[t].sound === oldName) cfg.triggers[t].sound = newName;
  saveConfig(cfg);
  console.log(`✏️  Renamed "${oldName}" → "${newName}".`);
}

function remove(name) {
  if (!name) {
    console.log(`Usage: ${CMD} remove <name>`);
    return;
  }
  const cfg = loadConfig();
  if (!cfg.library[name]) {
    console.log(`No custom sound named "${name}".`);
    return;
  }
  try {
    fs.unlinkSync(cfg.library[name]);
  } catch (_) {}
  delete cfg.library[name];
  for (const t of TRIGGERS)
    if (cfg.triggers[t].sound === name) cfg.triggers[t].sound = "default";
  saveConfig(cfg);
  console.log(`🗑️  Removed "${name}".`);
}

function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function help() {
  console.log(`${CMD} — control your Claude Soundboard.

Usage:  ${CMD} <command>

  (no args)                      show current status
  on | off                       master toggle (mute everything)
  25%                            set the reply sound to a 25% chance
  <trigger> <value>              configure a trigger
       trigger: reply | waiting | prompt | session
       value:   on | off | <number>% | <sound-name>
       e.g.  reply 50     waiting on     reply fahh     reply random
  add <url> [name] [start-end]   import a sound from YouTube (e.g. add <url> fahh 0:03-0:08)
  rename <old> <new>             rename a custom sound
  remove <name>                  delete a custom sound
  list                           show the sound library
  test [trigger|name]            play a sound right now`);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (cmd === "play") {
    hookPlay(argv[1]);
    return;
  }

  switch (cmd) {
    case undefined:
    case "status":
      return printStatus();
    case "on":
    case "enable":
    case "unmute":
      return setMaster(true);
    case "off":
    case "disable":
    case "mute":
      return setMaster(false);
    case "help":
    case "-h":
    case "--help":
      return help();
    case "list":
    case "ls":
      return list();
    case "test":
    case "play-now":
      return test(argv[1]);
    case "add":
      return add(argv.slice(1));
    case "rename":
    case "mv":
      return rename(argv[1], argv[2]);
    case "remove":
    case "rm":
      return remove(argv[1]);
    case "set":
      return setReplyProbability(argv[1]);
    default:
      if (TRIGGERS.includes(cmd)) return configTrigger(cmd, argv.slice(1));
      if (/^\d+%?$/.test(cmd)) return setReplyProbability(cmd);
      console.log(`Unknown command "${cmd}".`);
      return help();
  }
}

main();
