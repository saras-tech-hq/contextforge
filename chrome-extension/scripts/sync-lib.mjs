import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..");
const lib = join(root, "lib");
const sharedDest = join(lib, "shared");

mkdirSync(sharedDest, { recursive: true });

const sharedFiles = [
  "cleanMarkdown.js",
  "estimateTokens.js",
  "htmlToMarkdown.js",
  "index.js",
  "types.js",
];

for (const name of sharedFiles) {
  const src = join(repo, "shared", "dist", name);
  if (!existsSync(src)) {
    console.warn("missing", src, "— run npm run build -w shared first");
    continue;
  }
  copyFileSync(src, join(sharedDest, name));
}

const vendors = [
  [
    join(repo, "node_modules", "@mozilla", "readability", "Readability.js"),
    join(lib, "Readability.js"),
  ],
  [
    join(root, "node_modules", "@mozilla", "readability", "Readability.js"),
    join(lib, "Readability.js"),
  ],
  [
    join(repo, "node_modules", "turndown", "lib", "turndown.browser.es.js"),
    join(lib, "turndown.js"),
  ],
  [
    join(repo, "node_modules", "turndown", "dist", "turndown.js"),
    join(lib, "turndown.js"),
  ],
];

function copyFirst(pairs, destKey) {
  const seen = new Set();
  for (const [src, dest] of pairs) {
    if (seen.has(dest)) continue;
    if (existsSync(src)) {
      copyFileSync(src, dest);
      seen.add(dest);
      console.log("copied", src, "->", dest);
    }
  }
}

copyFirst(vendors);

console.log("sync-lib done");
