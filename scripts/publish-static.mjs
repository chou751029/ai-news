import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export function publishStaticSite({ repoRoot = process.cwd() } = {}) {
  const bundlePath = path.join(repoRoot, "index.bundle.html");
  const outputPath = path.join(repoRoot, "index.html");
  const bundleHtml = fs.readFileSync(bundlePath, "utf8");

  const manifest = extractJsonScript(bundleHtml, "__bundler/manifest");
  let template = extractJsonScript(bundleHtml, "__bundler/template");
  const extResources = extractJsonScript(bundleHtml, "__bundler/ext_resources", []);

  const dataUrlByUuid = {};
  for (const [uuid, entry] of Object.entries(manifest)) {
    const bytes = decodeEntry(entry);
    dataUrlByUuid[uuid] = `data:${entry.mime};base64,${bytes.toString("base64")}`;
  }

  for (const [uuid, dataUrl] of Object.entries(dataUrlByUuid)) {
    template = template.split(uuid).join(dataUrl);
  }

  template = template
    .replace(/\s+integrity="[^"]*"/gi, "")
    .replace(/\s+crossorigin="[^"]*"/gi, "");

  if (extResources.length > 0) {
    const resourceMap = {};
    for (const entry of extResources) {
      if (dataUrlByUuid[entry.uuid]) {
        resourceMap[entry.id] = dataUrlByUuid[entry.uuid];
      }
    }

    const resourceScript =
      "<script>window.__resources = " +
      JSON.stringify(resourceMap).replace(/<\/script>/gi, "<\\/script>") +
      ";<\/script>";

    const headOpen = template.match(/<head[^>]*>/i);
    if (!headOpen) throw new Error("Could not find <head> in template");
    const insertAt = headOpen.index + headOpen[0].length;
    template = template.slice(0, insertAt) + resourceScript + template.slice(insertAt);
  }

  fs.writeFileSync(outputPath, template);
  return outputPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputPath = publishStaticSite({ repoRoot: process.cwd() });
  console.log(`Published static site to ${path.basename(outputPath)}`);
}

function extractJsonScript(source, type, fallback) {
  const pattern = new RegExp(`<script type="${escapeRegex(type)}">([\\s\\S]*?)<\\/script>`);
  const match = source.match(pattern);
  if (!match) {
    if (arguments.length === 3) return fallback;
    throw new Error(`Missing script block for ${type}`);
  }
  return JSON.parse(match[1]);
}

function decodeEntry(entry) {
  const compressedBytes = Buffer.from(entry.data, "base64");
  return entry.compressed ? zlib.gunzipSync(compressedBytes) : compressedBytes;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
