# PDF 編輯工具 — 專案說明

## 開發流程規範

所有功能開發、Bug 修復、UX 優化，**一律使用 git worktree 隔離開發**，不直接在 `main` 上修改。

流程：
1. 建立新 branch（命名規則：`feat/xxx`、`fix/xxx`、`ux/xxx`）
2. 用 `git worktree add` 在獨立目錄開發
3. 完成後 merge 回 `main`，刪除 worktree 與 branch
4. Push 到 GitHub

例外：僅修改文件（CHANGELOG.md、CLAUDE.md）可直接在 `main` 上操作。

---

## 專案目的
純前端（單一 HTML 檔）的 PDF 編輯工具，用來取代公司部份 Adobe 功能。
分享給同事時以 ZIP 方式傳送離線版，不需安裝任何軟體，雙擊即用。

## 檔案結構
```
pdf-editor/
├── pdf-editor.html          ← 主要開發檔（含 CDN 連結，需網路）
├── build-offline.js         ← 打包腳本，產生離線版
├── dist/
│   └── pdf-editor-offline.html  ← 離線版輸出（不進 git，3.1MB）
└── CLAUDE.md                ← 本檔案
```

## 打包離線版
```bash
node build-offline.js
# 輸出至 dist/pdf-editor-offline.html
```

## 使用的 CDN Libraries
| Library | 版本 | 用途 |
|---------|------|------|
| pdf.js | 3.11.174 | PDF 渲染、頁面預覽 |
| pdf-lib | 1.17.1 | PDF 讀寫、合併、分割、輸出 |
| Sortable.js | 1.15.2 | 拖曳排序頁面縮圖 |
| mammoth.js | 1.8.0 | Word (.docx) 轉 HTML |
| html2canvas | 1.4.1 | HTML 截圖轉 canvas |
| jsPDF | 2.5.1 | canvas 轉 PDF |
| zip.js | 2.7.32 | 建立密碼保護的 ZIP |

## 現有功能
- **頁面管理**：縮圖預覽、拖曳重排、旋轉、勾選
- **合併**：多個 PDF 合併成一個，可拖曳調整順序
- **分割**：勾選頁面後單獨輸出
- **文字標注**：點擊頁面放置文字，可設定大小、顏色
- **表單設計**：拖曳畫出欄位框、設定欄位代碼，輸出含表單欄位的 PDF
- **Word 轉 PDF**：上傳 .docx 自動轉換後載入工具
- **PDF 加密**：輸出時可設定密碼加密（禁止修改/複製，允許列印/填表）
- **標示橡皮擦**：點擊或拖曳刪除畫線、螢光筆、矩形、橢圓等圖形標示

## 已知限制
- Word 轉 PDF：複雜排版（多欄、浮動圖片、特殊字型）轉換後可能與原稿有差異
- 文字標注字型：離線版僅支援 Helvetica（pdf-lib 內建），中文字需額外嵌入字型

## 打包注意事項（踩過的坑）
1. **`$&` 問題**：pdf-lib 和 Sortable.js 原始碼含 `$&`，`String.replace()` 會展開成原始標籤插回 HTML。
   → **務必使用函式形式** `html.replace(tag, () => newContent)`
2. **`</script>` 截斷**：library 內若含 `</script>` 字串，HTML 解析器會提前截斷 script 區塊。
   → 內嵌前用 `.replace(/<\/script>/gi, '<\\/script>')` 轉義
3. **pdf.js worker**：離線模式下 workerSrc 需用 blob URL，不能直接設 CDN 路徑。

## 分享給同事
將 `dist/pdf-editor-offline.html` 壓縮成 `.zip` 寄送（email 不允許直接附加 .html）。
