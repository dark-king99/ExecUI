# Network collection

Network data comes from one of three places, and every device says which:

| Source | Shown as | Has live metrics? |
|---|---|---|
| **Collector** — an agent run inside the customer's network (`collector/`) | "Discovered · seen …" | Yes, when the device answers SNMP |
| **Monitoring tool** — LibreNMS, imported every 10 minutes | "From monitoring tool · seen …" | Status, traffic, links (CPU/memory come from collectors) |
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

- SNMP v1/v2c only (no v3).
- No flow data (NetFlow/sFlow), so no per-protocol or per-conversation traffic.
- No device configuration backup (needs SSH credentials and vendor support).
- LibreNMS is the only monitoring tool connector.
