// server/storage.js
import fs from "node:fs/promises";
import path from "node:path";

export async function ensureFile(filePath, defaultJson) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(defaultJson, null, 2), "utf-8");
  }
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function writeJson(filePath, data) {
  // atomic-ish write
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}
