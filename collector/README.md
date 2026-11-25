# ExecUI network collector

A small agent you run **inside** a network. It finds devices, reads their
health over SNMP, works out how they're cabled together, and reports to
ExecUI. Everything it does is read-only: it never changes a device.

| What | How |
|---|---|
| Find devices | Sweeps the subnets set in **Network → Settings** with `ping` and TCP connects (a refused connection still proves a host is there). MACs from the OS ARP table, names from SNMP `sysName` or reverse DNS. |
| Identify them | SNMP `sysDescr`, `sysObjectID`, `sysServices` → vendor and type (router, switch, firewall, server, printer…). |
| Health | CPU (HOST-RESOURCES, Cisco, UCD), memory (UCD, HOST-RESOURCES), interface traffic from IF-MIB counters (64-bit, 32-bit fallback), uptime, latency. Traffic is a rate between two polls — the first poll has none. |
| Map | LLDP and CDP neighbour tables: which port on which device is plugged into which port on which other device. |
| Reachability | Every known device is checked each poll; one that stops answering raises an alert in ExecUI. |

Only private address space is scanned (10/8, 172.16/12, 192.168/16,
100.64/10), at most a /20 per subnet. SNMP v1 and v2c are supported; v3 is not yet.

## Run it

Requires **Node.js 18 or newer** and no other dependencies.

1. In ExecUI, **Network → Settings → Collectors → Add collector**. Copy the
   token — it's shown once.
2. Set the subnets (and the SNMP community, if it isn't `public`) in the same page.
3. On a machine inside the network:

```sh
EXECUI_URL=https://your-execui-host \
EXECUI_COLLECTOR_TOKEN=exc_... \
node bin/execui-collector.js
```

`--once` runs a single cycle and exits — useful to check a setup. The URL
must be `https://` (the token can read the SNMP community); for a lab only,
`EXECUI_ALLOW_HTTP=1` allows plain http.

### As a service (Linux, systemd)

```ini
# /etc/systemd/system/execui-collector.service
[Unit]
Description=ExecUI network collector
After=network-online.target

[Service]
Environment=EXECUI_URL=https://your-execui-host
Environment=EXECUI_COLLECTOR_TOKEN=exc_...
ExecStart=/usr/bin/node /opt/execui-collector/bin/execui-collector.js
Restart=always
DynamicUser=yes

[Install]
WantedBy=multi-user.target
```

Settings changed in ExecUI apply at the collector's next check-in; nothing
on this machine needs editing. Revoking the collector in ExecUI stops it
immediately.

## Test

```sh
npm test
```

The tests run a real UDP SNMP responder on localhost and drive a full
collector cycle against it.
