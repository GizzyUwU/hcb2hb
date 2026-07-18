import { configure, getConsoleSink, getLogger } from "@logtape/logtape";
import { DEFAULT_REDACT_FIELDS, redactByField } from "@logtape/redaction";
import { getSentrySink } from "@logtape/sentry";
import * as Sentry from "@sentry/bun";
import ansiRegex from "ansi-regex";
import path from "path";
import fs from "fs";
const registeredInitModules = new Set<string>();
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
    ...(process.env["SENTRY_DSN"] ? { sentry: sentryAdapter } : {}),
    console: consoleAdapter,
  },
  loggers: [
    {
      category: ["logtape", "meta"],
      sinks: [...(process.env["SENTRY_DSN"] ? ["sentry"] : []), "console"],
      lowestLevel: "error",
    },
    {
      category: ["HC2HB"],
      sinks: [...(process.env["SENTRY_DSN"] ? ["sentry"] : []), "console"],
      lowestLevel:
        logLevel[configuredLogLevel as keyof typeof logLevel] ?? "info",
    },
  ],
});

export const logger = getLogger(["HC2HB"]);
const jobsRunning = new Map<string, boolean>();
const jobsLastRun = new Map<string, number>();
async function jobRunner() {
  registeredInitModules.clear();
  const jobDir = path.resolve(__dirname, "./jobs");
  const jobs = fs
    .readdirSync(jobDir)
    .filter((f) => f.endsWith(".ts") && !f.includes(".disabled."));
  const now = Date.now();
  const promises: Promise<void>[] = [];
  for (const job of jobs) {
    try {
      const importJobFile = await import(path.join(jobDir, job));
      const mod = importJobFile.default;
      if (!mod.name || typeof mod.execute !== "function") continue;
      if (registeredInitModules.has(mod.name))
        throw new Error(`[HC2HB] Duplicate job name "${mod.name}" in ${job}`);
      if (jobsRunning.has(mod.name)) continue;
      const interval = Math.max(10, mod.interval ?? 60) * 1000;
      if (now - (jobsLastRun.get(mod.name) ?? 0) < interval) continue;
      jobsLastRun.set(mod.name, now);
      jobsRunning.set(mod.name, true);
      const ctxLogger = logger.with({
        data: {
          module: mod.name,
          file: job,
        },
      });
      mod
        .execute({
          logger: ctxLogger,
        })
        .catch((err: unknown) => {
          ctxLogger
            .with({
              err,
            })
            .error("Failed to execute job");
        })
        .finally(() => {
          jobsRunning.delete(mod.name);
        });
    } catch (e) {
      logger
        .with({
          data: {
            file: job,
          },
        })
        .error("Failed to execute handler");
    }
  }
  await Promise.all(promises);
}

(async () => {
  const jobLoop = async () => {
    await jobRunner();
    setTimeout(jobLoop, 10 * 1000);
  };
  await jobLoop();
  console.log("[HC2HB] Started running jobs successfully!");
  Bun.serve({
    port: 3000,
    routes: {
      "/healthcheck": new Response("OK"),
    },
  });
})();

process.on("SIGTERM", async () => {
  process.exit(0);
});

process.on("SIGINT", async () => {
  process.stdout.write("\r\x1b[K"); // This literally just makes it not show ^C⏎ in my terminal as it annoys me
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error });
});
