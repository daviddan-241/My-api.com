#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error("ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set");
  process.exit(1);
}

const OWNER = "daviddan-241";
const REPO = "My-api.com";
const BRANCH = "main";
const ROOT = new URL("..", import.meta.url).pathname;

const EXCLUDE = [
  ".git",
  "node_modules",
  ".local",
  "dist",
  ".cache",
  ".replit-artifact",
];

function shouldExclude(p) {
  return EXCLUDE.some(
    (ex) =>
      p.split("/").includes(ex)
  );
}

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (shouldExclude(rel)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function getFileSha(path) {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha;
}

async function pushFile(filePath) {
  const relPath = relative(ROOT, filePath);
  const content = readFileSync(filePath).toString("base64");
  const sha = await getFileSha(relPath);

  const body = {
    message: `sync: ${relPath}`,
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(relPath)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (res.ok) {
    console.log(`✓ ${relPath}`);
  } else {
    const err = await res.json();
    console.error(`✗ ${relPath}: ${err.message}`);
  }
}

const files = collectFiles(ROOT);
console.log(`Pushing ${files.length} files to ${OWNER}/${REPO}...`);

// Push sequentially to avoid SHA conflicts
for (const f of files) {
  await pushFile(f);
}

console.log("\nAll done! https://github.com/" + OWNER + "/" + REPO);
