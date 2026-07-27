import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const periods = fs
  .readdirSync(path.join(repoRoot, "periods"))
  .filter((name) => name.endsWith(".json"))
  .sort()
  .reverse()
  .map((name) => JSON.parse(fs.readFileSync(path.join(repoRoot, "periods", name), "utf8")));

function isoDate(year, value) {
  const [month, day] = value.split("/").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "from"].forEach((key) =>
      url.searchParams.delete(key),
    );
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function countryFor(item, category) {
  if (category === "國內") return "台灣";
  const text = `${item.title} ${item.summary} ${(item.tags || []).join(" ")}`;
  const rules = [
    ["美韓", "美國／南韓"],
    ["南韓|韓國|Samsung|LG Display|Naver Cloud", "南韓"],
    ["中國|青海|廣東|佛山|TCL", "中國"],
    ["日本|Omron|Yaskawa|Fujitsu", "日本"],
    ["西班牙|Serrano", "西班牙"],
    ["美國|Texas|Pearland|Fort Worth", "美國"],
    ["英國|CuspAI", "英國"],
    ["亞洲", "亞洲"],
  ];
  return rules.find(([pattern]) => new RegExp(pattern, "i").test(text))?.[1] || "";
}

const rows = [];
for (const period of periods) {
  for (const [key, category, code] of [
    ["domestic", "國內", "D"],
    ["international", "國外", "I"],
  ]) {
    period[key].forEach((item, index) => {
      const originalTitle = period.origTitles?.[item.url] || "";
      rows.push([
        `${period.id}-${code}-${String(index + 1).padStart(2, "0")}`,
        period.id,
        period.label,
        period.year,
        category,
        isoDate(period.year, item.date),
        countryFor(item, category),
        item.source,
        item.title,
        originalTitle === item.title ? "" : originalTitle,
        item.summary,
        item.url,
        (item.tags || []).join("、"),
        "",
        "",
        "",
        "",
        "既有網站",
        "已發布",
        index + 1,
        canonicalUrl(item.url),
        "2026-07-27",
        "由網站期別 JSON 同步",
      ]);
    });
  }
}

process.stdout.write(JSON.stringify(rows));
