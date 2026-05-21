# CLAUDE.md — 三和商研 DX Platform 引き継ぎ書

> 最終更新: 2026-05-21（Supabase連携・複数案件管理を追加）
> 初版作成: 株式会社トレプロ / 山中秀斗
> 直近更新: 株式会社トレプロ / 森田雄希

---

## Supabase（重要・最初に読め）

**新規DBは作らず、既存 trefinder プロジェクトに同居**（追加コスト¥0）

| 項目 | 値 |
|---|---|
| プロジェクトID | `heylrpbvrdhxziciokmg`（trefinder 既存） |
| URL | https://heylrpbvrdhxziciokmg.supabase.co |
| Region | ap-northeast-1 |
| 請求先 | トレプロ組織（既存プロジェクト・追加料金なし） |
| 公開キー（anon） | `sb_publishable_HG9VT11GVlXmk37F7FgS4g_cvkvUBN0` |

### テーブル構成（`sanwa_` プレフィックスで分離）
| テーブル | 役割 |
|---|---|
| `sanwa_projects` | 案件マスタ |
| `sanwa_layouts` | 図面データ（zones/shelves/labor を JSONB） |
| `sanwa_parts` | 案件ごとの資材マスタ（cost_price は null許容） |
| `sanwa_order_history` | 発注履歴（items は JSONB） |
| `sanwa_settings` | グローバルKV（alertEmail / colFormat） |

trefinder の既存テーブル（users / diagnosis_results / invite_links 等）とは完全分離。

**注：** trepro-pl は REST API がダッシュボードで無効化されていたため、
同じトレプロ組織内の trefinder を選択。

### RLS方針
現状は **公開ポリシー（誰でもCRUD可）**。デモ・社内利用前提。
本番化する際は anon キーを廃止し、認証導入＋user_id絞り込みに切り替える。

### Supabase API ヘルパー
全アクセスは `src/lib/supabase.js` に集約。
`listProjects()` / `loadFullProject(id)` / `upsertLayout()` / `upsertParts()` / `createOrder()` 等。

---

## このプロジェクトは何か

**スーパーマーケット什器レイアウト管理 SaaS（デモ版）**

三和商研向けに作成したツール。
設計士が現場で決めたスーパーの棚レイアウト図面をAIに読ませ、
必要な鋼材・部品を自動算出 → フロアマップ可視化 → 見積書出力 → 発注メールまで一気通貫で完結する。

---

## すぐ起動する

```bash
cd sanwa-dx
npm install
npm run dev
# → http://localhost:5173（ポート使用中なら5174, 5175...と自動昇順）
```

---

## ディレクトリ構成

```
sanwa-dx/
├── index.html                  # ファビコン・meta・Googleフォント読み込み
├── vite.config.js
├── package.json                # xlsx(SheetJS) 追加済み
├── 作業報告_20260519.md        # 2026-05-19 森田の作業報告書
├── src/
│   ├── main.jsx                # Reactエントリポイント
│   ├── App.jsx                 # タブ管理（概要/図面取込/マップ/資材/在庫/見積書/手書き取込）
│   ├── index.css               # グローバルCSS変数（:root で全トークン定義）
│   ├── App.module.css
│   ├── components/
│   │   ├── Landing.jsx         # 概要ページ（LP）
│   │   ├── Landing.module.css
│   │   ├── JsonInput.jsx       # ① 図面取込・Gemini/Claudeプロンプト生成
│   │   ├── JsonInput.module.css
│   │   ├── FloorMap2D.jsx      # ② 2Dフロアマップ（ズーム・パン・棚クリック詳細）★更新
│   │   ├── FloorMap2D.module.css
│   │   ├── PartsList.jsx       # ③ 資材リスト（複数選択フィルタ・原価表示・Excel出力）★更新
│   │   ├── PartsList.module.css
│   │   ├── Inventory.jsx       # ④ 在庫・発注（アラート・Excel設定・発注履歴）★更新
│   │   ├── Inventory.module.css
│   │   ├── EstimateSheet.jsx   # ⑤ 見積書（印刷/PDF/メール/Excel出力）
│   │   ├── EstimateSheet.module.css
│   │   ├── PdfReader.jsx       # ⑥ 手書き取込（Gemini Vision APIで品目自動抽出）★新規
│   │   └── PdfReader.module.css
│   └── data/
│       └── sampleLayout.json   # デモデータ（cost_price フィールド追加済み）★更新
└── CLAUDE.md                   # ← この引き継ぎ書
```

---

## タブ構成と各コンポーネントの責務

| タブ | コンポーネント | 主な機能 |
|---|---|---|
| 🏠 概要 | `Landing.jsx` | プロダクト説明LP・導入前後比較・CTA |
| ① 図面取込 | `JsonInput.jsx` | 図面アップロード・Gemini/Claude AIプロンプト生成・JSON貼付 |
| ② 2Dフロアマップ | `FloorMap2D.jsx` | SVGマップ描画・ホイールズーム・ドラッグパン・棚クリックで部品詳細 |
| ③ 資材リスト | `PartsList.jsx` | 全資材一覧・複数選択カテゴリフィルタ・原価/粗利表示・Excel出力 |
| ④ 在庫・発注 | `Inventory.jsx` | 在庫不足検出・アラートメール・発注履歴（localStorage）・Excel出力 |
| ⑤ 見積書 | `EstimateSheet.jsx` | 資材費+施工費集計・税込見積書・印刷/PDF/メール/Excel |
| ⑥ 手書き取込 | `PdfReader.jsx` | 手書きPDF/画像をGemini APIで解析・品目をデータに反映 |

---

## データ構造（sampleLayout.json の型定義）

```json
{
  "meta": {
    "project": "string",       // プロジェクト名
    "date": "YYYY-MM-DD",
    "area_sqm": number,        // 売場面積（㎡）
    "area_tsubo": number,      // 坪数
    "notes": "string"
  },
  "zones": [{
    "id": "zone-xxx",
    "name": "string",
    "type": "general|fresh|daily",   // ※ frozen/refrigeratedは三和商研対象外
    "color": "#hex",
    "x": number, "y": number, "w": number, "h": number
  }],
  "shelves": [{
    "id": "S001",
    "zone": "zone-xxx",
    "x": number, "y": number, "w": number, "h": number,
    "type": "SH-1950|SH-1500W",
    "label": "食品①"
  }],
  "parts": [{
    "id": "SH-1950",
    "name": "棚柱ユニット 1950H",
    "spec": "仕様文字列",
    "qty": number,             // 必要数
    "unit": "本|枚|個|組|巻",
    "category": "主材|固定材|陳列部材|締結材|施工材",
    "stock": number,           // 現在庫（不足判定に使用）
    "unit_price": number,      // 売価（円）
    "cost_price": number|null  // 原価（円）★2026-05-19追加。nullの場合は原価表示を非表示
  }],
  "labor": {
    "total_man_days": number,
    "crew_size": number,
    "estimated_days": number,
    "breakdown": [{ "task": "string", "man_days": number }]
  }
}
```

---

## データの永続化先（2026-05-21更新）

| データ | 保存先 | 備考 |
|---|---|---|
| 案件マスタ | **Supabase `projects`** | 複数案件対応 |
| 図面データ（zones/shelves/labor） | **Supabase `layouts`** | JSONBで保存 |
| 資材マスタ・在庫 | **Supabase `parts`** | プロジェクトごとに紐付け |
| 発注履歴 | **Supabase `order_history`** | 全端末で共有 |
| アラートメール | **Supabase `settings`** | localStorageもフォールバック維持 |
| Excel列設定 | **Supabase `settings`** | 同上 |
| 現在の案件ID | `localStorage.sanwa_currentProjectId` | UI状態のみ |
| Gemini APIキー | `localStorage.sanwa_geminiKey` | クラウドに送らない |

---

## AIフロー

### 通常フロー（コスト¥0）

```
現場で図面確定
  → ① 図面取込タブ で図面アップロード
  → 「プロンプトをコピー」
  → Gemini AI Studio（無料）or Claude.ai に貼り付け送信
  → 返ってきた JSON をテキストエリアに貼り付け
  → 「マップ生成」ボタン
  → ②〜⑤ タブで確認・見積書出力・発注
```

### 手書きPDF読み取りフロー

```
手書き発注書 / 棚割メモ を用意
  → ⑥ 手書き取込タブ を開く
  → Gemini APIキーを設定（初回のみ。localStorage保存）
  → PDF/JPG/PNG をドラッグ＆ドロップ
  → 「AIで読み取る」ボタン
  → 読み取り結果（品名・仕様・数量・単位）をテーブルで確認
  → 「在庫・発注データに反映する」ボタン
  → ④ 在庫・発注タブで発注作業に進む
```

---

## 発注履歴の仕様

`sanwa_orderHistory` の1エントリの構造：

```js
{
  histId:      "ORD-1779174704413",   // ユニークID（Date.getTime()ベース）
  date:        "2026/5/19 16:11:44",  // 表示用日時（ja-JP形式）
  isoDate:     "2026-05-19T07:11:44.413Z", // Excel出力用ISO日付
  project:     "三和商研 スーパー什器レイアウト",
  items: [{
    id:         "SH-970W",
    name:       "棚板 970mm幅",
    spec:       "スチール製 白塗装",
    qty:        68,
    unit:       "枚",
    unit_price: 2200,
    total:      149600,
  }],
  totalAmount: 391680,
}
```

---

## Excel出力（SheetJS）

| タブ | 出力ファイル | シート構成 |
|---|---|---|
| ③ 資材リスト | `三和商研_資材リスト_YYYY-MM-DD.xlsx` | 資材明細＋合計行 |
| ③ 資材リスト（原価ON） | 同上 | 原価・売価・粗利・粗利率列を追加 |
| ④ 在庫・発注 | `三和商研_発注リスト_YYYY-MM-DD.xlsx` | 選択発注品＋合計（列は設定に従う） |
| ④ 発注履歴 | `三和商研_発注履歴_YYYYMMDD.xlsx` | 品番・品名・発注数・単価・金額＋合計 |
| ⑤ 見積書 | `三和商研_見積書_YYYY-MM-DD.xlsx` | 「見積書」「明細」2シート |

---

## 見積書の単価設定

`EstimateSheet.jsx` の先頭:
```js
const LABOR_UNIT_PRICE = 25000 // 人工単価（円/人日）← 変更はここだけ
```

---

## デザイン規則（必ず守れ）

- **CSS変数はすべて `index.css` の `:root` で管理**。ハードコードカラー禁止
- **絵文字は使わない**（SVGアイコンで代替）→ まだ一部残存（未対応）
- **黒背景禁止**。デフォルトはライトテーマ（`--bg: #f5f3ef`）
- CSS Modules（`.module.css`）を全コンポーネントで使用
- モバイル対応: `@media (max-width: 640px)` を各CSSに記述済み

---

## 主要CSS変数（index.css）

```css
--accent: #1a5fd4        /* メインブルー */
--accent-bg: #e8f0fd
--green: #0a7c4e         /* 成功・発注済 */
--green-bg: #e6f7f0
--red: #b91c1c           /* 警告・在庫不足 */
--red-bg: #fef2f2
--amber: #b05e00         /* 注意・原価関連 */
--amber-bg: #fef3e2
--surface: #ffffff
--surface2: #f0ede8      /* サブ背景 */
--bg: #f5f3ef            /* ページ背景 */
--text: #1a1916
--text2: #6b6760
--text3: #9c988f
```

---

## 実装上の注意点（技術メモ）

### FloorMap2D のズーム実装
- Reactの `onWheel` はpassiveなのでpreventDefaultが効かない → `useEffect` で直接 `addEventListener('wheel', fn, { passive: false })` を登録
- stale closure を避けるため、常に最新viewBoxを `vbRef.current` に同期し、wheelハンドラ内は `vbRef` 経由で読む
- ドラッグとクリックの誤作動防止：mousemoveで4px以上動いたら `hasDraggedRef.current = true` にし、onClickで早期リターン

### PdfReader のAPI呼び出し
- Gemini 2.0 Flash は PDF・画像ともに `inlineData` で送信可能（ファイルサイズ上限 20MB）
- MIMEタイプは `file.type` をそのまま渡す（`image/jpeg`, `image/png`, `application/pdf`）
- レスポンスからJSONを抽出する際は `/\{[\s\S]*\}/` でマッチ（コードブロック対応）

### 発注履歴の削除確認UI
- 「履歴をクリア」：`confirmClear` stateで2段階確認
- 個別「✕」削除：`pendingDeleteId` stateで対象エントリを保持、2段階確認
- どちらもキャンセルでstateをリセット → 元のUIに戻る

---

## 今後の実装候補

- [ ] Gemini API 直結（① 図面取込を完全自動化、コスト¥0.3〜2/枚）
- [x] ~~複数案件の管理（プロジェクト一覧画面・切替機能）~~ 2026-05-21 完了
- [x] ~~Supabase 連携（発注履歴・設定をクラウド保存し複数端末対応）~~ 2026-05-21 完了
- [ ] 見積書に会社ロゴ・印鑑画像の挿入
- [ ] 棚の種別・単価マスタを管理画面から編集
- [x] ~~在庫不足アラートのメール通知ボタン~~ 2026-05-19 完了
- [x] ~~Excelフォーマット指定機能~~ 2026-05-19 完了
- [x] ~~原価フィールドの追加~~ 2026-05-19 完了
- [x] ~~2Dフロアマップのズーム・ドラッグ移動~~ 2026-05-19 完了
- [x] ~~資材リストのカテゴリ複数選択フィルター~~ 2026-05-19 完了
- [x] ~~発注履歴の保存（localStorage）~~ 2026-05-19 完了
- [x] ~~手書きPDF読み取り（Gemini Vision API）~~ 2026-05-19 完了

---

## Claude Code での作業開始コマンド

```bash
# このファイルを読んで現状を把握してから作業を続けて
cat sanwa-dx/CLAUDE.md
cd sanwa-dx && npm run dev
```

---

## 注意事項

- `zone.type` に `frozen`/`refrigerated` は**使わない**（三和商研は棚専門、冷凍設備は対象外）
- `FloorMap2D.jsx` の `ZONE_COLORS` に `general` / `fresh` / `daily` の3種類のみ定義
- `SHELF_COLORS` は `SH-1950` / `SH-1500W` のみ
- `parts` に `cost_price: null` の品目が混在しても動作する（原価表示ボタンは `hasCostData` で出し分け）
