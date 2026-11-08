import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const rows = [];
let failed = false;

function compare(label, a, b) {
  const ok = existsSync(a) && existsSync(b) && sha(a) === sha(b);
  if (!ok) failed = true;
  rows.push({
    label,
    ok,
    a: path.relative(root, a),
    b: path.relative(root, b),
    hash: ok ? sha(a) : null,
  });
}

for (const name of [
  "cleanMarkdown.js",
  "estimateTokens.js",
  "htmlToMarkdown.js",
  "index.js",
  "types.js",
]) {
  compare(
    `shared dist -> extension lib (${name})`,
    path.join(root, "shared", "dist", name),
    path.join(root, "chrome-extension", "lib", "shared", name)
  );
}

compare(
  "vendored Readability",
  path.join(root, "node_modules", "@mozilla", "readability", "Readability.js"),
  path.join(root, "chrome-extension", "lib", "Readability.js")
);

compare(
  "vendored Turndown (browser ESM)",
  path.join(root, "node_modules", "turndown", "lib", "turndown.browser.es.js"),
  path.join(root, "chrome-extension", "lib", "turndown.js")
);

const estimate = readFileSync(
  path.join(root, "chrome-extension", "lib", "shared", "estimateTokens.js"),
  "utf8"
);
const hasWhitespaceGuard = /!\s*text\.trim\(\)/.test(estimate);
if (!hasWhitespaceGuard) failed = true;
rows.push({ label: "whitespace guard present in built estimateTokens", ok: hasWhitespaceGuard });

const license = readFileSync(path.join(root, "chrome-extension", "license.js"), "utf8");
const hasTtl = /REVALIDATION_TTL_DAYS\s*=\s*30/.test(license);
if (!hasTtl) failed = true;
rows.push({ label: "30-day license TTL present in source", ok: hasTtl });

const popup = readFileSync(path.join(root, "chrome-extension", "popup.js"), "utf8");
const clearsOnError = /output\.value\s*=\s*""/.test(popup);
if (!clearsOnError) failed = true;
rows.push({ label: "popup clears stale output on failure", ok: clearsOnError });

// --- Release consistency checks -------------------------------------------

function check(label, ok, detail) {
  if (!ok) failed = true;
  rows.push({ label, ok, detail });
}

const rootPkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const extPkg = JSON.parse(readFileSync(path.join(root, "chrome-extension", "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(path.join(root, "chrome-extension", "manifest.json"), "utf8"));

check(
  "root, extension, and manifest versions match",
  rootPkg.version === extPkg.version && extPkg.version === manifest.version,
  { root: rootPkg.version, extension: extPkg.version, manifest: manifest.version }
);

const iconEntries = Object.entries(manifest.icons || {});
check("manifest declares 16/32/48/128 icons", iconEntries.length === 4, iconEntries.map(([k]) => k));

for (const [size, rel] of iconEntries) {
  const file = path.join(root, "chrome-extension", rel);
  if (!existsSync(file)) {
    check(`icon ${size} exists`, false, rel);
    continue;
  }
  const buf = readFileSync(file);
  const isPng = buf.toString("ascii", 1, 4) === "PNG";
  const width = isPng ? buf.readUInt32BE(16) : 0;
  const height = isPng ? buf.readUInt32BE(20) : 0;
  check(`icon ${size} is a ${size}x${size} PNG`, isPng && width === Number(size) && height === Number(size), {
    rel,
    width,
    height,
  });
}

check(
  "action uses the declared icon set",
  Boolean(manifest.action && manifest.action.default_icon),
  Object.keys(manifest.action?.default_icon || {})
);

const storageSource = path.join(root, "chrome-extension", "storage.js");
check("bounded storage module exists", existsSync(storageSource));
check(
  "popup persists through the bounded helper",
  /saveLastExtract\(page\)/.test(popup) && !/storage\.local\.set\(\{\s*lastExtract/.test(popup)
);

const licenseFile = path.join(root, "LICENSE");
const licenseText = existsSync(licenseFile) ? readFileSync(licenseFile, "utf8") : "";
check("MIT LICENSE present", /MIT License/.test(licenseText) && /ContextForge contributors/.test(licenseText));

const releaseDocs = ["README.md", "docs/index.html", "workers/license-verify/README.md"];
const placeholders = [];
for (const rel of releaseDocs) {
  const file = path.join(root, rel);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  if (/REPLACE_ME|example\.lemonsqueezy\.com/.test(text)) placeholders.push(rel);
}
check("no placeholder checkout links in release docs", placeholders.length === 0, placeholders);

const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const trackedWrangler = tracked.filter((file) => /(^|\/)\.wrangler\//.test(file));
check("no .wrangler paths tracked", trackedWrangler.length === 0, trackedWrangler.slice(0, 5));

console.log(JSON.stringify({ failed, rows }, null, 2));
process.exit(failed ? 1 : 0);
