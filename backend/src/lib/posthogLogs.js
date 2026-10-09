import "dotenv/config";
import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

const KEY = process.env.POSTHOG_KEY;
const HOST = process.env.POSTHOG_HOST;

if (process.env.NODE_ENV !== "production" && !KEY) {
  throw new Error("POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_KEY is configured");
}
if (process.env.NODE_ENV !== "production" && !HOST) {
  throw new Error("POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured");
}

let sdk = null;
let logger = null;

function logsEnabled() {
  return !!KEY && !!HOST;
}

function getLogger() {
  if (!logsEnabled()) return null;
  if (logger) return logger;

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": "exec-ui-api",
      "deployment.environment": process.env.NODE_ENV || "development",
    }),
    logRecordProcessors: [
      new BatchLogRecordProcessor(new OTLPLogExporter({
        url: new URL("/i/v1/logs", HOST).toString(),
        headers: { Authorization: `Bearer ${KEY}` },
      })),
    ],
  });
  sdk.start();
  logger = logs.getLogger("exec-ui-posthog");
  return logger;
}

/** Emit only purpose-built PostHog log records; existing application logs stay local. */
export function posthogLog(severityText, body, attributes = {}) {
  try {
    getLogger()?.emit({ severityText, body, attributes });
  } catch {
    // Log export must never affect application availability.
  }
}

/** Flush the dedicated OTLP exporter during graceful process shutdown. */
export async function shutdownPostHogLogs() {
  try {
    if (sdk) await sdk.shutdown();
  } catch {
    // Process shutdown should continue even if log delivery fails.
  }
}
