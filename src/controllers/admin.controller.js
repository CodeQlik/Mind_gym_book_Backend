import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sendResponse from "../utils/responseHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getErrorLogs = async (req, res, next) => {
  try {
    const { type = "error" } = req.query; // 'error' or 'combined'
    const fileName = type === "combined" ? "combined.log" : "error.log";
    const logPath = path.join(__dirname, `../../logs/${fileName}`);

    if (!fs.existsSync(logPath)) {
      return sendResponse(res, 200, true, `No ${type} logs found yet`, []);
    }

    const logs = fs.readFileSync(logPath, "utf8");
    const logLines = logs.trim().split("\n").filter(Boolean).reverse(); // Latest first

    const limit = parseInt(req.query.limit) || 100;
    const recentLogs = logLines.slice(0, limit);

    return sendResponse(
      res,
      200,
      true,
      "Logs fetched successfully",
      recentLogs,
    );
  } catch (error) {
    next(error);
  }
};

export const clearLogs = async (req, res, next) => {
  try {
    const errorLogPath = path.join(__dirname, "../../logs/error.log");
    const combinedLogPath = path.join(__dirname, "../../logs/combined.log");

    if (fs.existsSync(errorLogPath)) fs.writeFileSync(errorLogPath, "");
    if (fs.existsSync(combinedLogPath)) fs.writeFileSync(combinedLogPath, "");

    return sendResponse(res, 200, true, "Logs cleared successfully");
  } catch (error) {
    next(error);
  }
};
