/**
 * What the collector reads from a device over SNMP.
 *
 *   identify   sysDescr, sysObjectID, sysName, sysUpTime, sysServices
 *   metrics    CPU   HOST-RESOURCES hrProcessorLoad → Cisco cpmCPUTotal5minRev
 *                    → UCD ssCpuIdle
 *              memory UCD memTotalReal/memAvailReal → HOST-RESOURCES RAM storage
 *              traffic IF-MIB 64-bit octet counters (32-bit fallback), turned
 *                    into bits/second from the previous poll
 *   neighbours LLDP (standard) and CDP (Cisco): who is plugged into which port
 *
 * Every read is best-effort: a device that doesn't expose a table simply
 * contributes nothing for it, and nothing is ever estimated to fill the gap.
 */
import { Session, text, mac, under } from "./snmp.js";
import { SessionV3 } from "./snmpv3.js";

export const OID = {
  sysDescr: "1.3.6.1.2.1.1.1.0", sysObjectID: "1.3.6.1.2.1.1.2.0", sysUpTime: "1.3.6.1.2.1.1.3.0",
  sysName: "1.3.6.1.2.1.1.5.0", sysServices: "1.3.6.1.2.1.1.7.0",
  hrProcessorLoad: "1.3.6.1.2.1.25.3.3.1.2",
  ciscoCpu5min: "1.3.6.1.4.1.9.9.109.1.1.1.1.8",
  ucdCpuIdle: "1.3.6.1.4.1.2021.11.11.0",
  ucdMemTotal: "1.3.6.1.4.1.2021.4.5.0", ucdMemAvail: "1.3.6.1.4.1.2021.4.6.0",
  hrStorageType: "1.3.6.1.2.1.25.2.3.1.2", hrStorageUnits: "1.3.6.1.2.1.25.2.3.1.4",
  hrStorageSize: "1.3.6.1.2.1.25.2.3.1.5", hrStorageUsed: "1.3.6.1.2.1.25.2.3.1.6", hrStorageRam: "1.3.6.1.2.1.25.2.1.2",
  ifName: "1.3.6.1.2.1.31.1.1.1.1", ifHCIn: "1.3.6.1.2.1.31.1.1.1.6", ifHCOut: "1.3.6.1.2.1.31.1.1.1.10",
  ifIn: "1.3.6.1.2.1.2.2.1.10", ifOut: "1.3.6.1.2.1.2.2.1.16", ifOperStatus: "1.3.6.1.2.1.2.2.1.8", ifDescr: "1.3.6.1.2.1.2.2.1.2",
  lldpLocPortId: "1.0.8802.1.1.2.1.3.7.1.3", lldpLocPortDesc: "1.0.8802.1.1.2.1.3.7.1.4",
  lldpRemChassisIdSubtype: "1.0.8802.1.1.2.1.4.1.1.4", lldpRemChassisId: "1.0.8802.1.1.2.1.4.1.1.5",
  lldpRemPortId: "1.0.8802.1.1.2.1.4.1.1.7", lldpRemPortDesc: "1.0.8802.1.1.2.1.4.1.1.8",
  lldpRemSysName: "1.0.8802.1.1.2.1.4.1.1.9", lldpRemSysDesc: "1.0.8802.1.1.2.1.4.1.1.10",
  lldpRemManAddrIfSubtype: "1.0.8802.1.1.2.1.4.2.1.3",
  cdpCacheAddress: "1.3.6.1.4.1.9.9.23.1.2.1.1.4", cdpCacheDeviceId: "1.3.6.1.4.1.9.9.23.1.2.1.1.6",
  cdpCacheDevicePort: "1.3.6.1.4.1.9.9.23.1.2.1.1.7", cdpCachePlatform: "1.3.6.1.4.1.9.9.23.1.2.1.1.8",
};

const suffix = (oid, root) => oid.slice(root.length + 1);
const byIndex = (rows, root) => new Map(rows.map((r) => [suffix(r.oid, root), r.value]));
const safeWalk = (s, root) => s.walk(root).catch(() => []);

export function openSession(ip, snmp) {
  if (snmp?.version === "v3") {
    return new SessionV3(ip, {
      user: snmp.user, level: snmp.level, authProtocol: snmp.authProtocol, authPassword: snmp.authPassword,
      privProtocol: snmp.privProtocol, privPassword: snmp.privPassword,
      timeoutMs: snmp.timeoutMs ?? 1500, port: snmp.port ?? 161,
    });
  }
  return new Session(ip, { community: snmp?.community ?? "public", version: snmp?.version ?? "v2c", timeoutMs: snmp?.timeoutMs ?? 1200, port: snmp?.port ?? 161 });
}

/** System group, or null if the device doesn't answer SNMP. */
export async function identify(session) {
  try {
    const r = await session.get([OID.sysDescr, OID.sysObjectID, OID.sysUpTime, OID.sysName, OID.sysServices]);
    if (!Object.keys(r).length) return null;
    return {
      sysDescr: text(r[OID.sysDescr]),
      sysObjectId: r[OID.sysObjectID] ?? null,
      sysName: text(r[OID.sysName]),
      uptimeSec: r[OID.sysUpTime] != null ? Math.round(r[OID.sysUpTime] / 100) : null,
      sysServices: r[OID.sysServices] ?? null,
    };
  } catch { return null; }
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

export async function cpu(session) {
  const hr = (await safeWalk(session, OID.hrProcessorLoad)).map((r) => r.value).filter(Number.isFinite);
  if (hr.length) return round1(avg(hr));
  const cisco = (await safeWalk(session, OID.ciscoCpu5min)).map((r) => r.value).filter(Number.isFinite);
  if (cisco.length) return round1(avg(cisco));
  const idle = (await session.get([OID.ucdCpuIdle]).catch(() => ({})))[OID.ucdCpuIdle];
  return Number.isFinite(idle) ? round1(100 - idle) : null;
}

export async function memory(session) {
  const ucd = await session.get([OID.ucdMemTotal, OID.ucdMemAvail]).catch(() => ({}));
  const total = ucd[OID.ucdMemTotal], avail = ucd[OID.ucdMemAvail];
  if (total > 0 && avail >= 0) return round1(((total - avail) / total) * 100);
  const types = byIndex(await safeWalk(session, OID.hrStorageType), OID.hrStorageType);
  const ram = [...types].find(([, t]) => t === OID.hrStorageRam)?.[0];
  if (!ram) return null;
  const r = await session.get([`${OID.hrStorageSize}.${ram}`, `${OID.hrStorageUsed}.${ram}`]).catch(() => ({}));
  const size = r[`${OID.hrStorageSize}.${ram}`], used = r[`${OID.hrStorageUsed}.${ram}`];
  return size > 0 ? round1((used / size) * 100) : null;
}

/** Raw interface counters right now → { [ifIndex]: { name, in, out, bits, up } } */
export async function interfaceCounters(session) {
  const names = byIndex(await safeWalk(session, OID.ifName), OID.ifName);
  const descr = names.size ? new Map() : byIndex(await safeWalk(session, OID.ifDescr), OID.ifDescr);
  const oper = byIndex(await safeWalk(session, OID.ifOperStatus), OID.ifOperStatus);
  let ins = byIndex(await safeWalk(session, OID.ifHCIn), OID.ifHCIn);
  let outs = byIndex(await safeWalk(session, OID.ifHCOut), OID.ifHCOut);
  let bits = 64;
  if (!ins.size) {
    ins = byIndex(await safeWalk(session, OID.ifIn), OID.ifIn);
    outs = byIndex(await safeWalk(session, OID.ifOut), OID.ifOut);
    bits = 32;
  }
  const out = {};
  for (const [idx, inOctets] of ins) {
    const name = text(names.get(idx)) ?? text(descr.get(idx)) ?? `if${idx}`;
    if (/^(lo|loopback|null|inloopback)/i.test(name)) continue;
    out[idx] = { name, in: inOctets, out: outs.get(idx) ?? 0, bits, up: oper.get(idx) === 1 };
  }
  return out;
}

/**
 * Bits/second between two counter snapshots. A counter that went backwards
 * wrapped (32-bit) or reset (reboot); a reset is skipped rather than guessed.
 */
export function rates(prev, curr, seconds) {
  if (!prev || !(seconds > 0)) return null;
  let inBps = 0, outBps = 0, counted = 0;
  for (const [idx, c] of Object.entries(curr)) {
    const p = prev[idx];
    if (!p || !c.up) continue;
    const delta = (a, b) => {
      if (b >= a) return b - a;
      return c.bits === 32 && a - b > 2 ** 31 ? b + 2 ** 32 - a : null; // wrap vs reset
    };
    const di = delta(p.in, c.in), dout = delta(p.out, c.out);
    if (di == null || dout == null) continue;
    inBps += (di * 8) / seconds;
    outBps += (dout * 8) / seconds;
    counted += 1;
  }
  return counted ? { inBps: Math.round(inBps), outBps: Math.round(outBps) } : null;
}

/** LLDP + CDP neighbours of the device at `localIp`. */
export async function neighbours(session, localIp) {
  const links = [];

  // LLDP: index is timeMark.localPortNum.remIndex
  const remName = await safeWalk(session, OID.lldpRemSysName);
  if (remName.length) {
    const [subtypes, chassis, portId, portDesc, sysDesc, locPort, locDesc, manAddr] = await Promise.all([
      safeWalk(session, OID.lldpRemChassisIdSubtype), safeWalk(session, OID.lldpRemChassisId),
      safeWalk(session, OID.lldpRemPortId), safeWalk(session, OID.lldpRemPortDesc), safeWalk(session, OID.lldpRemSysDesc),
      safeWalk(session, OID.lldpLocPortId), safeWalk(session, OID.lldpLocPortDesc), safeWalk(session, OID.lldpRemManAddrIfSubtype),
    ]);
    const m = (rows, root) => byIndex(rows, root);
    const [st, ch, pid, pd, sd, lp, ld] = [m(subtypes, OID.lldpRemChassisIdSubtype), m(chassis, OID.lldpRemChassisId), m(portId, OID.lldpRemPortId), m(portDesc, OID.lldpRemPortDesc), m(sysDesc, OID.lldpRemSysDesc), m(locPort, OID.lldpLocPortId), m(locDesc, OID.lldpLocPortDesc)];
    // Management address is encoded in the index: …remIndex.addrSubtype(1=IPv4).len(4).a.b.c.d
    const addr = new Map();
    for (const r of manAddr) {
      const parts = suffix(r.oid, OID.lldpRemManAddrIfSubtype).split(".");
      if (parts[3] === "1" && parts[4] === "4") addr.set(parts.slice(0, 3).join("."), parts.slice(5, 9).join("."));
    }
    for (const { oid, value } of remName) {
      const idx = suffix(oid, OID.lldpRemSysName);
      const localPortNum = idx.split(".")[1];
      links.push({
        protocol: "lldp",
        local: { ip: localIp },
        localPort: text(ld.get(localPortNum)) ?? text(lp.get(localPortNum)) ?? localPortNum,
        remote: {
          name: text(value),
          ip: addr.get(idx) ?? null,
          chassisId: st.get(idx) === 4 ? mac(ch.get(idx)) : null,
          description: text(sd.get(idx)),
        },
        remotePort: text(pd.get(idx)) ?? text(pid.get(idx)) ?? mac(pid.get(idx)),
      });
    }
  }

  // CDP: index is ifIndex.deviceIndex
  const cdpIds = await safeWalk(session, OID.cdpCacheDeviceId);
  if (cdpIds.length) {
    const [addrs, ports, platforms, ifNames] = await Promise.all([
      safeWalk(session, OID.cdpCacheAddress), safeWalk(session, OID.cdpCacheDevicePort),
      safeWalk(session, OID.cdpCachePlatform), safeWalk(session, OID.ifName),
    ]);
    const a = byIndex(addrs, OID.cdpCacheAddress), p = byIndex(ports, OID.cdpCacheDevicePort);
    const pl = byIndex(platforms, OID.cdpCachePlatform), ifn = byIndex(ifNames, OID.ifName);
    for (const { oid, value } of cdpIds) {
      const idx = suffix(oid, OID.cdpCacheDeviceId);
      const raw = a.get(idx);
      links.push({
        protocol: "cdp",
        local: { ip: localIp },
        localPort: text(ifn.get(idx.split(".")[0])) ?? idx.split(".")[0],
        remote: { name: text(value), ip: Buffer.isBuffer(raw) && raw.length === 4 ? [...raw].join(".") : null, description: text(pl.get(idx)) },
        remotePort: text(p.get(idx)),
      });
    }
  }
  return links;
}

export { under };
