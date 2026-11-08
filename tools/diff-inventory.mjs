import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [beforePath, afterPath, outPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error("usage: node tools/diff-inventory.mjs <before.json> <after.json> [out.json]");
  process.exit(2);
}

const before = JSON.parse(readFileSync(beforePath, "utf8"));
const after = JSON.parse(readFileSync(afterPath, "utf8"));
const toMap = (doc) => new Map(doc.files.map((f) => [f.path, f]));
const b = toMap(before);
const a = toMap(after);

const added = [];
const removed = [];
const changed = [];
const unchanged = [];

for (const [p, file] of a) {
  if (!b.has(p)) {
    added.push({ path: p, bytes: file.bytes });
    continue;
  }
  const prev = b.get(p);
  if (prev.sha256 !== file.sha256) {
    changed.push({ path: p, beforeBytes: prev.bytes, afterBytes: file.bytes });
  } else {
    unchanged.push(p);
  }
}
for (const [p, file] of b) {
  if (!a.has(p)) removed.push({ path: p, bytes: file.bytes });
}

added.sort((x, y) => x.path.localeCompare(y.path));
removed.sort((x, y) => x.path.localeCompare(y.path));
changed.sort((x, y) => x.path.localeCompare(y.path));

const report = {
  before: { file: path.basename(beforePath), count: before.count, generatedAt: before.generatedAt },
  after: { file: path.basename(afterPath), count: after.count, generatedAt: after.generatedAt },
  unchangedCount: unchanged.length,
  added,
  removed,
  changed,
};
const json = JSON.stringify(report, null, 2);
if (outPath) writeFileSync(outPath, json);
console.log(json);
