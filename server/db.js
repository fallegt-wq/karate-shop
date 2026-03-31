import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// alltaf nota local db möppu (ekki /var/data)
const dbDir = path.join(__dirname, "db");

fs.mkdirSync(dbDir, { recursive: true });

export const ORDERS_DB_PATH = path.join(dbDir, "orders.json");

export const SQLITE_DB_PATH = path.join(dbDir, "sqlite.db");
