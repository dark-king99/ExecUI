/**
 * Turning what a device says about itself into a vendor and a device type.
 *
 * The collector sends the raw SNMP answers (sysObjectID, sysDescr, sysServices)
 * and the server decides, so the rules can improve without redeploying every
 * collector in the field.
 */

// IANA private enterprise numbers (the 7th arc of sysObjectID) → vendor.
const ENTERPRISES = {
  9: "Cisco", 11: "HP", 43: "3Com", 171: "D-Link", 311: "Microsoft", 674: "Dell",
  1916: "Extreme Networks", 1991: "Brocade", 2011: "Huawei", 2272: "Nortel", 2636: "Juniper",
  3375: "F5", 4526: "Netgear", 6486: "Alcatel-Lucent", 6527: "Nokia", 6876: "VMware",
  8072: "Net-SNMP (Linux/Unix)", 9303: "Sangoma", 11863: "TP-Link", 12356: "Fortinet",
  14179: "Cisco (Wireless)", 14823: "Aruba", 14988: "MikroTik", 25461: "Palo Alto Networks",
  25506: "H3C", 26543: "IBM", 29671: "Cisco Meraki", 30065: "Arista", 41112: "Ubiquiti",
  47196: "Cumulus", 50536: "Sophos", 2604: "Sophos", 3076: "Cisco (VPN)", 1588: "Brocade",
  232: "HPE (Compaq)", 2620: "Check Point", 8741: "SonicWall", 4413: "Broadcom", 10002: "Ubiquiti (Frogfoot)",
  6889: "Avaya", 5624: "Enterasys", 4329: "Siemens", 13858: "Pulse Secure", 1714: "QLogic", 1347: "Kyocera",
  2435: "Brother", 641: "Lexmark", 1602: "Canon", 2385: "Sharp", 367: "Ricoh", 253: "Xerox", 18334: "Konica Minolta",
  6574: "Synology", 24681: "QNAP", 789: "NetApp", 12325: "pfSense / FreeBSD", 21796: "Mobotix",
};

export function vendorFrom({ sysObjectId, sysDescr } = {}) {
  const m = String(sysObjectId ?? "").replace(/^\./, "").match(/^1\.3\.6\.1\.4\.1\.(\d+)/);
  if (m && ENTERPRISES[m[1]]) return ENTERPRISES[m[1]];
  const d = String(sysDescr ?? "");
  for (const v of ["Cisco", "Juniper", "MikroTik", "RouterOS", "Ubiquiti", "Fortinet", "FortiGate", "Aruba", "Huawei", "Netgear", "TP-Link", "Windows", "Linux", "pfSense", "OPNsense", "Synology", "HP", "Dell", "Brother", "Canon", "Epson"]) {
    if (d.toLowerCase().includes(v.toLowerCase())) return v === "RouterOS" ? "MikroTik" : v === "FortiGate" ? "Fortinet" : v;
  }
  return null;
}

/**
 * Device type: router | switch | firewall | server | endpoint | printer | wireless | storage.
 * sysServices bit 2 (value 4) = routing (L3), bit 1 (value 2) = bridging (L2),
 * bit 6 (value 64) = applications (a host).
 */
export function typeFrom({ sysDescr, sysServices, vendor, openPorts = [] } = {}) {
  const d = `${sysDescr ?? ""} ${vendor ?? ""}`.toLowerCase();
  if (/fortigate|fortinet|palo alto|pan-os|check point|sonicwall|asa|firepower|pfsense|opnsense|sophos|firewall/.test(d)) return "firewall";
  if (/printer|laserjet|officejet|brother|canon|epson|lexmark|kyocera|ricoh|xerox|konica|sharp/.test(d)) return "printer";
  if (/synology|qnap|netapp|diskstation|nas/.test(d)) return "storage";
  if (/access point|airos|unifi|aironet|wireless|wlan|cap ac|wap/.test(d)) return "wireless";
  const s = Number(sysServices);
  if (Number.isFinite(s) && s > 0) {
    if (s & 4) return /switch/.test(d) ? "switch" : "router";
    if (s & 2) return "switch";
  }
  // Switch models first: their sysDescr also says "Cisco IOS Software".
  if (/switch|catalyst|procurve|nexus|\bc(1000|2960|3560|3650|3750|3850|9200|9300|9500)\b|\bex\d{4}\b|\bsg\d{3}\b|\bcbs\d{3}\b|crs\d{3}/.test(d)) return "switch";
  if (/routeros|router|ios xe|ios software|junos|edgeos|vyos/.test(d)) return "router";
  if (/windows server|linux|ubuntu|debian|centos|red hat|rhel|freebsd|vmware esxi|esxi/.test(d)) return "server";
  if (/windows|macos|darwin/.test(d)) return "endpoint";
  if (openPorts.includes(9100) || openPorts.includes(631)) return "printer";
  if (openPorts.includes(3389) || openPorts.includes(445)) return "endpoint";
  if (openPorts.includes(22) || openPorts.includes(80) || openPorts.includes(443)) return "server";
  return "endpoint";
}

/** OS label from sysDescr, short enough for a table. */
export function osFrom(sysDescr) {
  const d = String(sysDescr ?? "").trim();
  if (!d) return null;
  const m = d.match(/(RouterOS \S+|Cisco IOS[^,]*|JUNOS \S+|Windows[^,]*?(?:Version \S+)?|Linux \S+ \S+|FreeBSD \S+|Darwin \S+|FortiOS \S+|PAN-OS \S+)/i);
  return (m ? m[1] : d).slice(0, 80);
}
