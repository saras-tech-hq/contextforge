import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outPath = path.join(root, "artifacts", "security-audit.json");
const git = (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

const SECRET_PATTERNS = [
  { label: "aws_access_key", git: "AKIA[0-9A-Z]{16}", js: /AKIA[0-9A-Z]{16}/ },
  { label: "github_token", git: "gh[pousr]_[A-Za-z0-9]{20,}", js: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { label: "github_pat", git: "github_pat_[A-Za-z0-9_]{20,}", js: /github_pat_[A-Za-z0-9_]{20,}/ },
  { label: "slack_token", git: "xox[baprs]-[0-9A-Za-z-]{10,}", js: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { label: "stripe_live_key", git: "sk_live_[0-9A-Za-z]{10,}", js: /sk_live_[0-9A-Za-z]{10,}/ },
  { label: "private_key_block", git: "-----BEGIN [A-Z ]*PRIVATE KEY-----", js: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    label: "lemon_squeezy_assignment",
    git: "LEMON_SQUEEZY_API_KEY[[:space:]]*=[[:space:]]*[^[:space:]]",
    js: /LEMON_SQUEEZY_API_KEY\s*=\s*[^\s]/,
  },
  {
    label: "cloudflare_token_assignment",
    git: "CLOUDFLARE_API_TOKEN[[:space:]]*=[[:space:]]*[^[:space:]]",
    js: /CLOUDFLARE_API_TOKEN\s*=\s*[^\s]/,
  },
  {
    label: "bearer_literal",
    git: "Authorization:[[:space:]]*Bearer[[:space:]]+[A-Za-z0-9._-]{20,}",
    js: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/,
  },
  {
    label: "api_key_literal",
    git: "api[_-]?key[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9]{16,}",
    js: /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9]{16,}/,
  },
];

const SENSITIVE_FILENAME = /(^|[\\/])(\.env(\..*)?|\.dev\.vars|.*\.pem|.*\.key|id_rsa.*|credentials?|secrets?)([\\/]|$)|\.wrangler[\\/]|\.sqlite(-shm|-wal)?$/i;

const report = {
  generatedAt: new Date().toISOString(),
  repository: {
    head: git(["rev-parse", "HEAD"]),
    branch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
    commits: Number(git(["rev-list", "--count", "HEAD"])),
    remotes: git(["remote", "-v"]).split("\n").map((line) => line.replace(/\/\/[^@/]+@/, "//<redacted>@")),
  },
  trackedWrangler: {
    count: Number(git(["ls-files", "workers/license-verify/.wrangler"]).split("\n").filter(Boolean).length),
    categories: {},
  },
  history: {
    wranglerIntroducedIn: git(["log", "--all", "--format=%h", "--", "workers/license-verify/.wrangler"])
      .split("\n")
      .filter(Boolean),
    suspiciousFilenames: [],
    credentialPatternHits: [],
  },
  workingTree: {
    credentialPatternHits: [],
  },
  wranglerJsonFieldAudit: [],
  wranglerBinaryAudit: [],
};

const wranglerFiles = git(["ls-files", "workers/license-verify/.wrangler"]).split("\n").filter(Boolean);
for (const file of wranglerFiles) {
  const category = file.includes("/cache/") ? "cache" : file.includes("/tmp/") ? "tmp-bundles" : file.includes("/state/") ? "miniflare-state" : "other";
  report.trackedWrangler.categories[category] = (report.trackedWrangler.categories[category] || 0) + 1;
}

// Filenames present anywhere in history (paths only).
const objects = git(["rev-list", "--objects", "--all"]).split("\n");
for (const line of objects) {
  const match = line.match(/^[0-9a-f]{40,64}\s+(.*)$/);
  if (!match) continue;
  const file = match[1];
  if (SENSITIVE_FILENAME.test(file)) report.history.suspiciousFilenames.push(file);
}
report.history.suspiciousFilenames = [...new Set(report.history.suspiciousFilenames)].sort();

// Credential-pattern scan across every commit. Paths only; matched values are never captured.
const commits = git(["rev-list", "--all"]).split("\n").filter(Boolean);
for (const commit of commits) {
  for (const { label, git: pattern } of SECRET_PATTERNS) {
    try {
      const result = execFileSync("git", ["grep", "-l", "-I", "-E", "-e", pattern, commit, "--", "."], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      }).trim();
      if (!result) continue;
      for (const entry of result.split("\n")) {
        const file = entry.slice(entry.indexOf(":") + 1);
        report.history.credentialPatternHits.push({ commit: commit.slice(0, 7), file, pattern: label });
      }
    } catch (error) {
      if (error.status !== 1) throw error;
    }
  }
}

// Working-tree credential scan. Values are never recorded.
const skip = new Set([".git", "node_modules", "artifacts"]);
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skip.has(entry.name)) continue;
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = statSync(full);
    if (stat.size > 5 * 1024 * 1024) continue;
    const rel = path.relative(root, full).replaceAll("\\", "/");
    let text;
    try {
      text = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    for (const { label, js } of SECRET_PATTERNS) {
      if (js.test(text)) report.workingTree.credentialPatternHits.push({ file: rel, pattern: label });
    }
  }
}
walk(root);

// .wrangler JSON: report only field paths and coarse classifications.
function inspectJson(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) return;
  const data = JSON.parse(readFileSync(full, "utf8"));
  const fields = [];
  function visit(value, prefix) {
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) visit(child, prefix ? `${prefix}.${key}` : key);
      return;
    }
    fields.push(prefix);
  }
  visit(data, "");
  report.wranglerJsonFieldAudit.push({
    file: rel,
    fields,
    classifications: {
      accountIdentifierField: fields.some((f) => /^account\.id$/.test(f)),
      accountDisplayNameField: fields.some((f) => /^account\.name$/.test(f)),
      networkGeolocationFields: fields.filter((f) => /city|region|postalCode|country|longitude|latitude|timezone|asOrganization|asn/i.test(f)),
      tlsMetadataFields: fields.filter((f) => /^tls/i.test(f)).length,
    },
  });
}

inspectJson("workers/license-verify/.wrangler/cache/cf.json");
inspectJson("workers/license-verify/.wrangler/cache/wrangler-account.json");

// Miniflare state: search for credential-like tokens without emitting values.
for (const rel of wranglerFiles.filter((f) => f.includes("/state/") && f.endsWith(".sqlite"))) {
  const buffer = readFileSync(path.join(root, rel));
  const text = buffer.toString("latin1");
  const checks = {
    bearerToken: /Bearer\s+[A-Za-z0-9._-]{20,}/.test(text),
    apiKeyLike: /(api[_-]?key|secret|token)["':=\s]{1,8}[A-Za-z0-9._-]{24,}/i.test(text),
    emailLike: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text),
  };
  if (checks.bearerToken || checks.apiKeyLike || checks.emailLike) {
    report.wranglerBinaryAudit.push({ file: rel, ...checks });
  }
}

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));

const summary = {
  out: path.relative(root, outPath),
  commits: report.repository.commits,
  trackedWranglerFiles: report.trackedWrangler.count,
  wranglerCategories: report.trackedWrangler.categories,
  historyCredentialHits: report.history.credentialPatternHits.length,
  workingTreeCredentialHits: report.workingTree.credentialPatternHits.length,
  suspiciousHistoryPaths: report.history.suspiciousFilenames.length,
  wranglerJsonFilesAudited: report.wranglerJsonFieldAudit.length,
  wranglerBinaryFilesFlagged: report.wranglerBinaryAudit.length,
};
console.log(JSON.stringify(summary, null, 2));
