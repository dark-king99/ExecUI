/**
 * Configuration backup, with a stand-in `ssh` that records its arguments and
 * answers like a router — or like a device whose host key has changed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { backupDevice, sshArgs } from "../src/backup.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "execui-backup-"));
const key = path.join(dir, "id_ed25519");
fs.writeFileSync(key, "not-a-real-key", { mode: 0o600 });
const argsLog = path.join(dir, "args.txt");
const fakeSsh = path.join(dir, "ssh");
fs.writeFileSync(fakeSsh, `#!/bin/sh
printf '%s\\n' "$@" > "${argsLog}"
for last; do :; done
case "$*" in
  *10.0.0.66*) echo "@@@ WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED! @@@" >&2; exit 255 ;;
esac
if [ "$last" = "/export" ]; then
  printf '# RouterOS 7.14\\n/system identity set name=core-rtr\\n'
else
  printf 'hostname access-sw1\\ninterface Gi0/1\\n'
fi
`, { mode: 0o755 });
const opts = { user: "backup", bin: fakeSsh, keyPath: key, knownHosts: path.join(dir, "known_hosts") };

test("ssh is run non-interactively, with key auth and pinned host keys", () => {
  const a = sshArgs({ host: "10.0.0.1", user: "backup", keyPath: key, knownHosts: "/k", command: "/export" });
  assert.ok(a.includes("BatchMode=yes"), "never prompts for a password");
  assert.ok(a.includes("StrictHostKeyChecking=accept-new"), "pins on first contact, refuses a changed key");
  assert.equal(a.at(-1), "/export");
  assert.equal(a.at(-2), "backup@10.0.0.1");
});

test("a device's configuration is returned as text", async () => {
  const r = await backupDevice({ deviceId: "d1", ip: "10.0.0.1", command: "/export" }, opts);
  assert.equal(r.ok, true);
  assert.match(r.config, /set name=core-rtr/);
  assert.match(fs.readFileSync(argsLog, "utf8"), /UserKnownHostsFile=/);
});

test("only the known read-only commands are ever run", async () => {
  const r = await backupDevice({ deviceId: "d1", ip: "10.0.0.1", command: "reload" }, opts);
  assert.equal(r.ok, false);
  assert.match(r.error, /Refused/);
});

test("a changed host key fails loudly with a hint", async () => {
  const r = await backupDevice({ deviceId: "d2", ip: "10.0.0.66", command: "show running-config" }, opts);
  assert.equal(r.ok, false);
  assert.match(r.error, /host key changed/);
});

test("missing user or key is reported, not attempted", async () => {
  assert.match((await backupDevice({ deviceId: "d", ip: "10.0.0.1", command: "/export" }, { ...opts, user: "" })).error, /No SSH user/);
  assert.match((await backupDevice({ deviceId: "d", ip: "10.0.0.1", command: "/export" }, { ...opts, keyPath: "/nope" })).error, /key not found/);
});
