# 更新方式

這個站現在支援用 period JSON 直接更新單一期別，再把結果寫回 `index.html`。

## 建議流程

1. 固定更新：
   由 Codex 週期性掃 Gmail、整理合格新聞、產出一份 `periods/YYYY-MM-DD_YYYY-MM-DD.json`。
2. 套版更新：
   在 repo 內執行 `npm run news:apply -- periods/<file>.json --set-default`。
3. 發布：
   `git add index.html periods/<file>.json`
   `git commit -m "Update <period-id> manufacturing AI roundup"`
   `git push origin main`

## 手動補新聞

當你額外提供新聞時，不需要重做整站。只要把同一期的 JSON 補上新條目，重新執行：

```bash
npm run news:apply -- periods/2026-07-16_2026-07-31.json --set-default
```

之後再 commit / push 即可。

## 目前進行中的期別

- Active period: `p_0716`
- Label: `07/16 - 07/31`
- JSON: `periods/2026-07-16_2026-07-31.json`
- Homepage default period: `p_0701`

首頁規則：

- 新一期開始後，先在背景累積新聞到 active period。
- 首頁仍停在上一個「已完成」期別。
- 等該期結束後，再把首頁預設切到新一期。

建議在這一期內至少更新 3 次：

- `2026-07-20`
- `2026-07-24`
- `2026-07-31`

原則是每次掃 Gmail 只新增「上次更新後出現、且實際發稿日仍在本期內」的合格新聞。

## JSON 欄位

- `id`: 例如 `p_0716`
- `label`: 例如 `07/16 - 07/31`
- `year`: 例如 `2026`
- `domestic`: 國內新聞陣列
- `international`: 國外新聞陣列
- `origTitles`: 國外原文標題對照，key 必須是文章 URL

每則新聞至少要有：

- `source`
- `date`
- `title`
- `url`
- `summary`
- `tags`

## 原則

- 只收實際發稿日在目標區間內的新聞。
- 同一事件重複報導只留一則。
- 純股價、財測、投資評論不收。
- 國外新聞若網站要顯示原文標題，需同步補 `origTitles`。
