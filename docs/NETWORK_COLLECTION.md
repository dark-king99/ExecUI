# Network collection

Network data comes from one of three places, and every device says which:

| Source | Shown as | Has live metrics? |
|---|---|---|
| **Collector** — an agent run inside the customer's network (`collector/`) | "Discovered · seen …" | Yes, when the device answers SNMP |
| **Monitoring tool** — LibreNMS, imported every 10 minutes | "From monitoring tool · seen …" + "Open in LibreNMS" | Status, traffic, links, open alerts (CPU/memory come from collectors) |
| **Manual** — typed in by a person | "Entered by hand · not monitored" | No |

Averages, capacity, traffic and top talkers use **measured devices only**; a
typed-in CPU figure is never presented as a reading.

## What used to be invented, and what replaced it

| Was | Now |
|---|---|
| "Sync metrics" wrote random CPU/memory/disk | Copies measured values from the same IP; refuses if there are none |
| "Restart server" set the status to "rebooting" | Refused — ExecUI can't restart servers; raise a change request |
| Automation "Run" marked every job "success" | Network Discovery is queued for the collector, which runs it and reports a result; other templates are labelled "not runnable yet" |
| Policy check always said "compliant" | Refused — no checks are configured |
| Traffic split 58/42 in/out, "internal" = 21%, "bytes" = Mbps × 7.2 | Summed from interface counters; blank with an explanation when nothing is measured |
| Firewall "logs" were rules with made-up timestamps | Empty — ExecUI receives no firewall logs |
| Map links attached each server to a router by list position | Drawn only from LLDP/CDP or the monitoring tool; unconnected devices sit apart |
| Settings were a constant; saving kept nothing | Saved per organization, used by collectors; secrets encrypted and write-only |

Social marketing had the same problem and was fixed at the same time:
publishing no longer records random reach/likes or bumps follower counts,
the growth chart only plots recorded days, and "Sync" no longer creates sample
customer comments.

## LibreNMS

Connect it in **Network → Settings → Existing monitoring tool** (address +
API token). Every 10 minutes ExecUI imports devices, per-device traffic, LLDP/
CDP/xDP links, and **open alerts** — each becomes an ExecUI alert (and a chat
post, if channels are set up) and is resolved when LibreNMS clears it.

With **Add devices the collector discovers** on, SNMP devices an ExecUI
collector finds are added to LibreNMS with the v2c/v3 credentials from network
settings (up to 20 per sync; a failed add is retried a day later), so LibreNMS
starts graphing them. Once LibreNMS has a device, the next import links the two.

## Configuration backup

Set the SSH user in **Network → Settings → Configuration backup** and put a
private key for it on the collector machine (`EXECUI_SSH_KEY`). Run
**Automation → Config Backup**, or tick *Back up every day*. ExecUI picks the
read-only command per vendor — Cisco/Arista/HP/Aruba `show running-config`,
MikroTik `/export`, Juniper `show configuration | display set`, Fortinet
`show full-configuration`, Huawei/H3C `display current-configuration`; the
collector refuses any other command. Configs are encrypted at rest; a new
version is kept only when the text changed (last 30 per device); a change
raises an info alert and a chat post. **Devices → Config** shows versions and a
line diff; viewing needs *Manage network collection* and is audited.

## Alerts

Raised automatically from measurements, one open alert per condition, and
resolved when it clears (if *auto-resolve* is on):

- device unreachable (critical) — only for devices already known
- CPU or memory over the thresholds in settings (warning)
- a collector that hasn't checked in for 15 minutes (critical) — so stale
  readings aren't mistaken for current ones

## Permissions

Viewing is open to anyone with the Network module. Creating/revoking
collectors, changing settings and connecting the monitoring tool need an admin
or the grantable **Manage network collection** permission
(`network.settings.manage`).

## Limits today

- Flow formats: NetFlow v5/v9 and IPFIX. sFlow (packet sampling) isn't parsed.
- LibreNMS is the only monitoring tool connector.
