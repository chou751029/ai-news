# 更新方式

這個站以 `periods/*.json` 為新聞資料的唯一來源，再由重建指令產生 `index.html` 內的網站資料。

## 新聞主表

- Google 試算表：`https://docs.google.com/spreadsheets/d/1NfqQVdNSdXJ-ZHsURfmzdhh3qRYhVO2grh2YVx96Q_g`
- `新聞主表`：網站既有新聞、自動蒐集候選與手動新增新聞的共同來源。
- `使用說明`：欄位定義、兩種新增機制與發布規則。

後續新增分為兩種：

1. 自動蒐集：每週掃描 Gmail 與外部連結後，將候選新聞寫入主表，`來源機制` 設為 `自動蒐集`、`審核狀態` 設為 `待審核`。
2. 手動新增：使用者直接在主表新增新聞，`來源機制` 設為 `手動新增`；資料已確認可直接發布時，`審核狀態` 設為 `可發布`。

發布流程只讀取 `審核狀態 = 可發布` 的列，依期別與分類追加至 period JSON；完成網站發布後，把該列更新為 `已發布`。同一期內容一律追加，不覆蓋既有新聞。網站既有 2026 年 3 月起的 166 則資料也已回填主表。

## 建議流程

1. 固定更新：
   由 Codex 週期性掃 Gmail、整理合格新聞、產出一份 `periods/YYYY-MM-DD_YYYY-MM-DD.json`。
2. 套版更新：
   在 repo 內執行 `npm run news:apply -- periods/<file>.json`；若一次調整多個期別，執行 `npm run news:rebuild`。
3. 發布：
   `git add index.html periods/<file>.json`
   `git commit -m "Update <period-id> manufacturing AI roundup"`
   `git push origin main`

## 固定搜尋來源

每週掃 Gmail 與補新聞時，除了既有新聞快訊與外部連結，也要固定納入下列來源：

- Gmail：搜尋 `AI Ready 電子報`
- Gmail 帳號：`chou751029@gmail.com`
- 外部來源：`CNBC`
- 外部來源：`TechOrange`

若信件內或外部來源提到製造業 AI、physical AI、機器人、工廠自動化、品質檢測、製程優化、工具機、模具、金屬加工等場景，優先列入候選清單再做去重與篩選。

## 手動補新聞

當你額外提供新聞時，不需要重做整站。只要把同一期的 JSON 補上新條目，重新執行：

```bash
npm run news:apply -- periods/2026-07-16_2026-07-30.json
```

之後再 commit / push 即可。

## 目前進行中的期別

- Active period: `p_0716`
- Label: `07/16 - 07/30`
- JSON: `periods/2026-07-16_2026-07-30.json`
- Next period: `p_0731` / `07/31 - 08/15`
- Next JSON: `periods/2026-07-31_2026-08-15.json`

首頁規則：

- 以 `Asia/Taipei` 當日日期判斷所在期別。
- 首頁自動展開包含當日的期別，不再手動指定預設期別。
- 若當日未落在任何區間，顯示最近已開始的期別。

建議在這一期內至少更新 3 次：

- `2026-07-20`
- `2026-07-24`
- `2026-07-30`

原則是每次掃 Gmail 只新增「上次更新後出現、且實際發稿日仍在本期內」的合格新聞。

## JSON 欄位

- `id`: 例如 `p_0716`
- `label`: 例如 `07/16 - 07/30`
- `year`: 例如 `2026`
- `domestic`: 國內新聞陣列
- `international`: 國外新聞陣列
- `origTitles`: 國外原文標題對照，key 必須是文章 URL

每則新聞至少要有：

- `source`
- `date`
- `title`：國內使用來源原始標題；國外使用繁體中文重點標題
- `url`
- `summary`
- `tags`

## 原則

- 只收實際發稿日在目標區間內的新聞。
- 同一事件重複報導只留一則。
- 純股價、財測、投資評論不收。
- 國外外文新聞必須以 URL 為 key 將來源原始標題寫入 `origTitles`，網站顯示中文重點標題與外文原始標題。
- 國外中文來源只顯示中文標題，不重複建立相同的 `origTitles`。
- 原始標題必須以來源頁為準，不可自行改寫。
