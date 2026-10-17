# 滬江小學行政管理平台（hujiang-admin）

## Live

https://hujiang-admin.vercel.app

與 [hujiang-cover](https://hujiang-cover.vercel.app/) **並列**的 Next.js 校務行政總平台（App Router · TypeScript · `zh-Hant`）。**不** fork／修改 cover。

## 路由

| Path | 說明 |
|------|------|
| `/` | 總平台 hub |
| `/timetable` | 有效課表（只讀 board） |
| `/exam-papers` | 試卷 checklist（清單來自來源檔，非網頁新增） |
| `/locks` `/duty` `/records` `/accounts` | 佔位 |
| 外連 | cover `/lookup`、`/arrange` |

## 試卷來源

PaperInstance **只由清單檔生成**（已停用網頁新增／示範種子）。

| 項目 | 值 |
|------|-----|
| **正式 Drive folder** | **Cursor** — https://drive.google.com/drive/folders/1powCilIiooBcrdb4SoLkLwKXowHVQsha |
| **Folder ID** | `1powCilIiooBcrdb4SoLkLwKXowHVQsha` |
| **現在（MCP 404）** | `data/exam-papers-source.json`（對齊 Store `docs/exam-papers-source.md`） |
| **目標** | Drive Cursor 內 `試卷清單.json` |

## 剔選持久化

Blob `exam-ticks.json`（跨裝置）；清單與剔選分離。

## 環境變數

- `BOARD_URL` — 預設 cover `/api/board`
- `BLOB_READ_WRITE_TOKEN` — 剔選
- `EXAM_SOURCE_MODE` — `store-file`（預設）／`drive`
- `EXAM_DRIVE_FOLDER_ID` — 預設 `1powCilIiooBcrdb4SoLkLwKXowHVQsha`
- `EXAM_SOURCE_FILE` — 預設 `試卷清單.json`
