import fs from "node:fs";
import path from "node:path";

const [, , inputPathArg, ...restArgs] = process.argv;

if (!inputPathArg) {
  console.error("Usage: npm run news:apply -- <period-json> [--set-default]");
  process.exit(1);
}

const setDefault = restArgs.includes("--set-default");
const inputPath = path.resolve(process.cwd(), inputPathArg);
const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, "index.html");

const raw = fs.readFileSync(inputPath, "utf8");
const period = JSON.parse(raw);
const html = fs.readFileSync(indexPath, "utf8");

validatePeriod(period);

let next = html;
next = upsertPeriodBlock(next, period);
next = upsertOrigTitlesBlock(next, period);

if (setDefault) {
  next = next.replace(/periodId: 'p_[^']+'/g, `periodId: '${period.id}'`);
  next = next.replace(/expanded: 'p_[^']+'/g, `expanded: '${period.id}'`);
}

fs.writeFileSync(indexPath, next);
console.log(`Updated ${path.basename(indexPath)} with ${period.id}`);

function validatePeriod(data) {
  for (const key of ["id", "label", "year", "domestic", "international"]) {
    if (!(key in data)) {
      throw new Error(`Missing required field: ${key}`);
    }
  }

  if (!Array.isArray(data.domestic) || !Array.isArray(data.international)) {
    throw new Error("domestic and international must be arrays");
  }

  if (data.origTitles && typeof data.origTitles !== "object") {
    throw new Error("origTitles must be an object when provided");
  }
}

function upsertPeriodBlock(source, data) {
  const markerStart = `/* AUTO_PERIOD:${data.id}:start */`;
  const markerEnd = `/* AUTO_PERIOD:${data.id}:end */`;
  const block = `${markerStart}\\n      ${toJsPeriod(data)},\\n      ${markerEnd}`;

  if (source.includes(markerStart) && source.includes(markerEnd)) {
    return replaceBetweenMarkers(source, markerStart, markerEnd, block);
  }

  const existing = findExistingPeriodRange(source, data.id);
  if (existing) {
    return source.slice(0, existing.start) + block + source.slice(existing.end);
  }

  const needle = "  data() {\\n    return [\\n";
  if (!source.includes(needle)) {
    throw new Error("Could not find data() insertion point");
  }
  return source.replace(needle, `${needle}      ${toJsPeriod(data)},\\n`);
}

function upsertOrigTitlesBlock(source, data) {
  const entries = Object.entries(data.origTitles || {});
  if (entries.length === 0) return source;

  const markerStart = `/* AUTO_ORIG:${data.id}:start */`;
  const markerEnd = `/* AUTO_ORIG:${data.id}:end */`;
  const block =
    `${markerStart}\\n` +
    entries
      .map(([url, title]) => `      ${toSingleQuoted(url)}: ${toSingleQuoted(title)},`)
      .join("\\n") +
    `\\n      ${markerEnd}`;

  if (source.includes(markerStart) && source.includes(markerEnd)) {
    return replaceBetweenMarkers(source, markerStart, markerEnd, block);
  }

  const needle = "\\n    };\\n  }\\n\\n  scopedItems()";
  if (!source.includes(needle)) {
    throw new Error("Could not find origTitles() insertion point");
  }

  return source.replace(needle, `\\n      ${block}${needle}`);
}

function replaceBetweenMarkers(source, markerStart, markerEnd, replacement) {
  const start = source.indexOf(markerStart);
  const end = source.indexOf(markerEnd, start);
  if (start === -1 || end === -1) {
    throw new Error(`Could not replace marker block ${markerStart}`);
  }
  const endInclusive = end + markerEnd.length;
  return source.slice(0, start) + replacement + source.slice(endInclusive);
}

function findExistingPeriodRange(source, periodId) {
  const patterns = [`id: '${periodId}'`, `"id": "${periodId}"`];
  let index = -1;

  for (const pattern of patterns) {
    index = source.indexOf(pattern);
    if (index !== -1) break;
  }

  if (index === -1) return null;

  const start = findOpeningBrace(source, index);
  const endBrace = findMatchingBrace(source, start);
  let end = endBrace + 1;

  while (source[end] === " " || source[end] === "\t") end += 1;
  if (source.slice(end, end + 2) === "\\n") end += 2;
  while (source[end] === " " || source[end] === "\t") end += 1;
  if (source[end] === ",") end += 1;

  return { start, end };
}

function findOpeningBrace(source, fromIndex) {
  for (let i = fromIndex; i >= 0; i -= 1) {
    if (source[i] === "{") return i;
  }
  throw new Error("Could not find opening brace for period block");
}

function findMatchingBrace(source, start) {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (inSingle) {
      if (ch === "'") inSingle = false;
      continue;
    }

    if (inDouble) {
      if (ch === "\"") inDouble = false;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      continue;
    }

    if (ch === "\"") {
      inDouble = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  throw new Error("Could not find matching brace for period block");
}

function toJsPeriod(data) {
  const lines = [
    "{",
    `  id: ${toSingleQuoted(data.id)},`,
    `  label: ${toSingleQuoted(data.label)},`,
    `  year: ${data.year},`,
    `  domestic: ${toJsValue(data.domestic)},`,
    `  international: ${toJsValue(data.international)},`,
    "}",
  ];

  return lines.join("\\n      ");
}

function toJsValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.map(item => toJsValue(item)).join(", ")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, entryValue]) => `${key}: ${toJsValue(entryValue)}`);
    return `{ ${entries.join(", ")} }`;
  }

  if (typeof value === "string") return toSingleQuoted(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";

  throw new Error(`Unsupported value type in period payload: ${typeof value}`);
}

function toSingleQuoted(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}
