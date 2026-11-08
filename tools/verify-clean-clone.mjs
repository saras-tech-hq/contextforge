import { execFileSync } from "node:child_process";

const [sourceRepo, cleanRepo, removedPrefix = "workers/license-verify/.wrangler"] =
  process.argv.slice(2);
if (!sourceRepo || !cleanRepo) {
  console.error("usage: node tools/verify-clean-clone.mjs <source-repo> <clean-repo> [removed-prefix]");
  process.exit(2);
}

const lsTree = (repo, rev) =>
  execFileSync("git", ["-C", repo, "ls-tree", "-r", rev], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [meta, ...rest] = line.split("\t");
      const [, type, sha] = meta.split(" ");
      return { path: rest.join("\t"), type, sha };
    });

const before = new Map(lsTree(sourceRepo, "HEAD").map((e) => [e.path, e]));
const after = new Map(lsTree(cleanRepo, "HEAD").map((e) => [e.path, e]));

const expectedRemoved = [...before.keys()].filter((p) => p === removedPrefix || p.startsWith(`${removedPrefix}/`));
const actuallyRemoved = [...before.keys()].filter((p) => !after.has(p));
const unexpectedRemoved = actuallyRemoved.filter((p) => !expectedRemoved.includes(p));
const added = [...after.keys()].filter((p) => !before.has(p));
const changed = [...after.entries()].filter(([p, e]) => before.has(p) && before.get(p).sha !== e.sha);

const report = {
  sourceHead: execFileSync("git", ["-C", sourceRepo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  cleanHead: execFileSync("git", ["-C", cleanRepo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceTreeEntries: before.size,
  cleanTreeEntries: after.size,
  expectedRemoved: expectedRemoved.length,
  actuallyRemoved: actuallyRemoved.length,
  unexpectedRemoved,
  added,
  changedFiles: changed.map(([p]) => p),
  ok: unexpectedRemoved.length === 0 && added.length === 0 && changed.length === 0,
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
