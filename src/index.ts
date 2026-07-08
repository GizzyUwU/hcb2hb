import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { DEFAULT_REDACT_FIELDS, redactByField } from "@logtape/redaction";
import { getSentrySink } from "@logtape/sentry";
import * as Sentry from "@sentry/bun";
import ansiRegex from "ansi-regex";
const sentryAdapter = redactByField(
  getSentrySink({
    enableBreadcrumbs: true,
    beforeSend(record) {
      if (
        typeof record.rawMessage === "string" &&
        record.rawMessage.includes("Request failed with status code 500")
      ) {
        return null;
      }

      const err = record.properties?.["error"] as any;
      if (
        err?.name === "AxiosError" &&
        typeof err?.status === "number" &&
        err.status >= 500
      ) {
        return null;
      }

      return record;
    },
  }),
  {
    fieldPatterns: [
      /api[-_]?key/i,
      /ft_sk_[A-Za-z0-9_-]*'/gi,
      /api_key"\s*=\s*'[^']*'/gi,
      ...DEFAULT_REDACT_FIELDS,
    ],
    action: () => "[REDACTED]",
  },
);

const consoleAdapter = redactByField(getConsoleSink(), {
  fieldPatterns: [
    /api[-_]?key/i,
    /ft_sk_[A-Za-z0-9_-]*'/gi,
    /api_key"\s*=\s*'[^']*'/gi,
    ...DEFAULT_REDACT_FIELDS,
  ],
  action: () => "[REDACTED]",
});

if (process.env["SENTRY_DSN"]) {
  Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    release: process.env["SENTRY_NAME"] || "logpheus",
    integrations: [],
    tracesSampleRate: 0,
    sendDefaultPii: true,
    beforeSend(event) {
      if (Array.isArray(event.breadcrumbs)) {
        event.breadcrumbs = event.breadcrumbs.map((bc: Sentry.Breadcrumb) => ({
          ...bc,
          ...(bc.message !== undefined && {
            message: bc.message.replace(ansiRegex(), ""),
          }),
        }));
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "console") return {};
      return breadcrumb;
    },
  });
}

const logLevel = {
  1: "warning",
  2: "trace",
  3: "info",
  4: "fatal",
  5: "error",
  6: "debug",
} as const;

/** @env
 * 1 = Warning
 * 2 = Trace
 * 3 = Info
 * 4 = Fatal
 * 5 = Error
 * 6 = Debug
 */
const configuredLogLevel = Number(process.env["LOG_LEVEL"]);
await configure({
  sinks: {
    sentry: sentryAdapter,
    console: consoleAdapter,
  },
  loggers: [
    {
      category: ["logtape", "meta"],
      sinks: [
        ...(process.env["SENTRY_DSN"] ? ["sentry"] : []),
        "console",
      ],
      lowestLevel: "error",
    },
    {
      category: ["hcb2hb"],
      sinks: [
        ...(process.env["SENTRY_DSN"]  ? ["sentry"] : []),
        "console",
      ],
      lowestLevel:
        logLevel[configuredLogLevel as keyof typeof logLevel] ??
        "info",
    },
  ],
});

export const logger = getLogger(["logpheus"]);