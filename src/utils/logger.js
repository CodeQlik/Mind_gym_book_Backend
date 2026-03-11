import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, "../../logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const errorLogPath = path.join(logDir, "error.log");
const combinedLogPath = path.join(logDir, "combined.log");

const formatDate = () => {
  return new Date().toISOString();
};

const logToFile = (filePath, level, message, details = "") => {
  const logEntry = `[${formatDate()}] [${level}] ${message} ${details ? JSON.stringify(details) : ""}\n`;
  fs.appendFileSync(filePath, logEntry);
};

const logger = {
  info: (message, details) => {
    console.log(`[INFO] [${formatDate()}] ${message}`);
    logToFile(combinedLogPath, "INFO", message, details);
  },
  error: (message, details) => {
    console.error(`[ERROR] [${formatDate()}] ${message}`, details || "");
    logToFile(combinedLogPath, "ERROR", message, details);
    logToFile(errorLogPath, "ERROR", message, details);
  },
  warn: (message, details) => {
    console.warn(`[WARN] [${formatDate()}] ${message}`);
    logToFile(combinedLogPath, "WARN", message, details);
  },
};

export default logger;
