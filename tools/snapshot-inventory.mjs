import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = process.argv[2] || path.join(root, "artifacts", "inventory.json");
const skipDirs = new Set([".git", "node_modules", "artifacts", "test-results", "playwright-report"]);

const rows = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = path.relative(root, full).replaceAll("\\", "/");
    const stat = statSync(full);
    rows.push({
      path: rel,
      bytes: stat.size,
      sha256: createHash("sha256").update(readFileSync(full)).digest("hex"),
    });
  }
}
walk(root);
rows.sort((a, b) => a.path.localeCompare(b.path));
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ root, generatedAt: new Date().toISOString(), count: rows.length, files: rows }, null, 2));
console.log(JSON.stringify({ out, count: rows.length }));
