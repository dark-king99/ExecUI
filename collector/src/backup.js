/**
 * Device configuration backup over SSH.
 *
 * Uses the machine's own `ssh` client with KEY authentication only — the key
 * lives on this collector machine (EXECUI_SSH_KEY) and is never sent to
 * ExecUI, so ExecUI never holds device login credentials. Host keys are
 * pinned on first contact in a dedicated known_hosts file; a device whose key
 * later changes fails loudly instead of being trusted.
 *
 * ExecUI decides the read-only command per vendor (e.g. `show running-config`,
 * `/export`) and sends it with the job; the collector runs exactly that and
 * returns the output.
 */
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const MAX_CONFIG = 2 * 1024 * 1024;

/** Only the read-only commands ExecUI is known to send. Anything else is refused. */
export const ALLOWED_COMMANDS = new Set([
  "show running-config",
  "show configuration | display set",
  "/export",
  "show full-configuration",
  "display current-configuration",
]);

export function sshArgs({ host, user, keyPath, knownHosts, command, port = 22 }) {
  return [
    "-o", "BatchMode=yes",                 // never prompt for a password
    "-o", "StrictHostKeyChecking=accept-new", // pin on first contact, refuse changes
    "-o", `UserKnownHostsFile=${knownHosts}`,
    "-o", "ConnectTimeout=10",
    "-o", "ServerAliveInterval=10",
    "-o", "LogLevel=ERROR",
    "-i", keyPath,
    "-p", String(port),
    "-T",
    `${user}@${host}`,
    command,
  ];
}

export function backupSettings(env = process.env) {
  const home = os.homedir();
  return {
    bin: env.EXECUI_SSH_BIN || "ssh",
    keyPath: env.EXECUI_SSH_KEY || path.join(home, ".ssh", "id_ed25519"),
    knownHosts: env.EXECUI_SSH_KNOWN_HOSTS || path.join(home, ".execui-collector", "known_hosts"),
  };
}

/** Back up one device. → { deviceId, ok, config?, error? } */
export function backupDevice(target, { user, bin, keyPath, knownHosts, timeoutMs = 60_000 }) {
  if (!ALLOWED_COMMANDS.has(target.command)) return Promise.resolve({ deviceId: target.deviceId, ok: false, error: `Refused unexpected command "${target.command}"` });
  if (!user) return Promise.resolve({ deviceId: target.deviceId, ok: false, error: "No SSH user set in Network → Settings" });
  if (!fs.existsSync(keyPath)) return Promise.resolve({ deviceId: target.deviceId, ok: false, error: `SSH key not found at ${keyPath} on the collector` });
  try { fs.mkdirSync(path.dirname(knownHosts), { recursive: true, mode: 0o700 }); } catch { /* reported by ssh if it matters */ }
  return new Promise((resolve) => {
    execFile(bin, sshArgs({ host: target.ip, user, keyPath, knownHosts, command: target.command }),
      { timeout: timeoutMs, maxBuffer: MAX_CONFIG, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const why = String(stderr || error.message).trim().split("\n").slice(-2).join(" ").slice(0, 300);
          const hint = /host key|REMOTE HOST IDENTIFICATION/i.test(why) ? " (the device's SSH host key changed — check it, then remove its line from the collector's known_hosts)" : "";
          return resolve({ deviceId: target.deviceId, ok: false, error: `${why}${hint}` });
        }
        const config = String(stdout);
        if (!config.trim()) return resolve({ deviceId: target.deviceId, ok: false, error: "The device returned an empty configuration" });
        resolve({ deviceId: target.deviceId, ok: true, config });
      });
  });
}
