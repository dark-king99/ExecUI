#!/usr/bin/env node
/**
 * ExecUI network collector.
 *
 *   EXECUI_URL=https://your-execui-host EXECUI_COLLECTOR_TOKEN=exc_… execui-collector
 *
 * Options: --once (one cycle, then exit — for testing a setup).
 */
import { Agent } from "../src/agent.js";

const stamp = () => new Date().toISOString();
const log = {
  info: (m) => console.log(`${stamp()} INFO  ${m}`),
  warn: (m) => console.warn(`${stamp()} WARN  ${m}`),
  error: (m) => console.error(`${stamp()} ERROR ${m}`),
};

const major = Number(process.versions.node.split(".")[0]);
if (major < 18) { log.error(`Node.js 18 or newer is required (this is ${process.versions.node}).`); process.exit(1); }

try {
  const agent = new Agent({
    url: process.env.EXECUI_URL,
    token: process.env.EXECUI_COLLECTOR_TOKEN,
    once: process.argv.includes("--once"),
    log,
  });
  await agent.run();
} catch (e) {
  log.error(e.message);
  process.exit(1);
}
