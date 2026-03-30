import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDbDir = path.join(__dirname, "db");
const configuredDbDir = process.env.SQLITE_DB_DIR
  ? path.resolve(process.cwd(), process.env.SQLITE_DB_DIR)
  : defaultDbDir;

fs.mkdirSync(configuredDbDir, { recursive: true });

export const ORDERS_DB_PATH = path.join(configuredDbDir, "orders.json");

export const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH
  ? path.resolve(process.cwd(), process.env.SQLITE_DB_PATH)
  : path.join(configuredDbDir, "sqlite.db");
