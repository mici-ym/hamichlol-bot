import winston from "winston";
const { format } = winston;

const logDir = process.env.LOG_DIR || "./logs";
const formatCustom = format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  }
);
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    formatCustom
  ),
  defaultMeta: { service: "hamichlol-bot" },
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({
      dirname: logDir,
      filename: "error.log",
      level: "error",
    }),
    new winston.transports.File({ dirname: logDir, filename: "combined.log" }),
    new winston.transports.File({
      dirname: logDir,
      filename: "filter.log",
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        formatCustom,
        winston.format((info) => {
          if (info.service === "filter") {
            return info;
          }
          return false;
        })()
      ),
    }),
    new winston.transports.Console(),
  ],
  exitOnError: false,
});

export default logger;
