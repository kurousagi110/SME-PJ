// Phase 4 – Professional Logging | 2026-04-02
// Structured winston logger with console (dev) + file transports (prod).
// All modules import this logger instead of using console.log/error directly.

import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, "../logs");

// Ensure logs directory exists at startup
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

/* ── Human-readable format for development console ── */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]: ${stack || message}${extra}`;
  })
);

/* ── Structured JSON format for file transports and production console ── */
const jsonFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const isDev = process.env.NODE_ENV !== "production";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  format: jsonFormat,

  transports: [
    /* errors only  → logs/error.log */
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024,  // 10 MB
      maxFiles: 5,
      tailable: true,
    }),
    /* all levels   → logs/combined.log */
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 20 * 1024 * 1024,  // 20 MB
      maxFiles: 10,
      tailable: true,
    }),
  ],

  /* Catch unhandled exceptions / rejections so they land in the log file */
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, "exceptions.log") }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, "rejections.log") }),
  ],
});

/* ── Console transport ── */
// Development: colorized human-readable output.
// Production:  JSON to stdout (collected by Docker / log aggregators).
logger.add(
  new winston.transports.Console({
    format: isDev ? devFormat : jsonFormat,
  })
);

export default logger;
