import fs from "node:fs";
import path from "node:path";

export function rebuildSiteData({ repoRoot = process.cwd() } = {}) {
  const periodsDir = path.join(repoRoot, "periods");
  const indexPath = path.join(repoRoot, "index.html");
  const periodFiles = fs
    .readdirSync(periodsDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .reverse();
  const periods = periodFiles.map((name) => {
    const data = JSON.parse(fs.readFileSync(path.join(periodsDir, name), "utf8"));
    validatePeriod(data, name);
    return data;
  });

  const ids = new Set();
  for (const period of periods) {
    if (ids.has(period.id)) throw new Error(`Duplicate period id: ${period.id}`);
    ids.add(period.id);
  }

  let html = fs.readFileSync(indexPath, "utf8");
  html = replaceMethodBody(
    html,
    "  data() {\n    return [",
    "\n    ];\n  }\n\n  regionLabel",
    `\n${periods.map(toMarkedPeriod).join("\n")}`,
  );

  const origTitles = new Map();
  for (const period of periods) {
    for (const [url, title] of Object.entries(period.origTitles || {})) {
      origTitles.set(url, title);
    }
  }
  const origBody =
    origTitles.size === 0
      ? ""
      : `\n${[...origTitles.entries()]
          .map(([url, title]) => `      ${toSingleQuoted(url)}: ${toSingleQuoted(title)},`)
          .join("\n")}`;
  html = replaceMethodBody(
    html,
    "  origTitles() {\n    return {",
    "\n    };\n  }\n\n  scopedItems()",
    origBody,
  );

  fs.writeFileSync(indexPath, html);
  return {
    periodCount: periods.length,
    articleCount: periods.reduce(
      (total, period) => total + period.domestic.length + period.international.length,
      0,
    ),
  };
}

export function validatePeriod(data, fileName = "period JSON") {
  for (const key of ["id", "label", "year", "domestic", "international"]) {
    if (!(key in data)) throw new Error(`${fileName}: missing required field ${key}`);
  }
  if (!Array.isArray(data.domestic) || !Array.isArray(data.international)) {
    throw new Error(`${fileName}: domestic and international must be arrays`);
  }
  for (const item of [...data.domestic, ...data.international]) {
    for (const key of ["source", "date", "title", "url", "summary", "tags"]) {
      if (!(key in item)) throw new Error(`${fileName}: article missing ${key}`);
    }
  }
}

function replaceMethodBody(source, startNeedle, endNeedle, body) {
  const start = source.indexOf(startNeedle);
  if (start === -1) throw new Error(`Could not find ${startNeedle}`);
  const bodyStart = start + startNeedle.length;
  const bodyEnd = source.indexOf(endNeedle, bodyStart);
  if (bodyEnd === -1) throw new Error(`Could not find ${endNeedle}`);
  return source.slice(0, bodyStart) + body + source.slice(bodyEnd);
}

function toMarkedPeriod(period) {
  return [
    `      /* AUTO_PERIOD:${period.id}:start */`,
    `      ${toJsPeriod(period)},`,
    `      /* AUTO_PERIOD:${period.id}:end */`,
  ].join("\n");
}

function toJsPeriod(data) {
  return [
    "{",
    `  id: ${toSingleQuoted(data.id)},`,
    `  label: ${toSingleQuoted(data.label)},`,
    `  year: ${data.year},`,
    `  domestic: ${toJsValue(data.domestic)},`,
    `  international: ${toJsValue(data.international)},`,
    "}",
  ].join("\n      ");
}

function toJsValue(value) {
  if (Array.isArray(value)) {
    return value.length === 0 ? "[]" : `[${value.map(toJsValue).join(", ")}]`;
  }
  if (value && typeof value === "object") {
    return `{ ${Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${toJsValue(entryValue)}`)
      .join(", ")} }`;
  }
  if (typeof value === "string") return toSingleQuoted(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  throw new Error(`Unsupported value type: ${typeof value}`);
}

function toSingleQuoted(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = rebuildSiteData({ repoRoot: process.cwd() });
  console.log(`Rebuilt ${result.periodCount} periods with ${result.articleCount} articles`);
}
