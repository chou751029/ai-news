import fs from "node:fs";
import path from "node:path";
import { rebuildSiteData, validatePeriod } from "./rebuild-site-data.mjs";

const [, , inputPathArg] = process.argv;
if (!inputPathArg) {
  console.error("Usage: npm run news:apply -- <period-json>");
  process.exit(1);
}

const repoRoot = process.cwd();
const inputPath = path.resolve(repoRoot, inputPathArg);
const period = JSON.parse(fs.readFileSync(inputPath, "utf8"));
validatePeriod(period, path.basename(inputPath));

const canonicalPath = path.join(repoRoot, "periods", path.basename(inputPath));
if (path.resolve(inputPath) !== path.resolve(canonicalPath)) {
  fs.copyFileSync(inputPath, canonicalPath);
}

const result = rebuildSiteData({ repoRoot });
console.log(
  `Applied ${period.id}; rebuilt ${result.periodCount} periods with ${result.articleCount} articles`,
);
