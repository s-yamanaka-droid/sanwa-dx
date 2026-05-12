# CLAUDE.md — 三和商研 DX Platform 引き継ぎ書

> 最終更新: 2026-05-12
> 作成: 株式会社トレプロ / 山中秀斗

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
├── src/
│   ├── main.jsx                # Reactエントリポイント
│   ├── App.jsx                 # タブ管理（概要/図面取込/マップ/資材/在庫/見積書）
│   ├── index.css               # グローバルCSS変数（:root で全トークン定義）
│   ├── App.module.css
│   ├── components/
│   │   ├── Landing.jsx         # ① 概要ページ（LP）
│   │   ├── Landing.module.css
│   │   ├── JsonInput.jsx       # ② 図面取込・Gemini/Claudeプロンプト生成
│   │   ├── JsonInput.module.css
│   │   ├── FloorMap2D.jsx      # ③ SVGフロアマップ（クリックで棚詳細）
│   │   ├── FloorMap2D.module.css
│   │   ├── PartsList.jsx       # ④ 資材リスト・Excel出力
│   │   ├── PartsList.module.css
│   │   ├── Inventory.jsx       # ⑤ 在庫照合・発注管理・メール発注・Excel出力
│   │   ├── Inventory.module.css
│   │   ├── EstimateSheet.jsx   # ⑥ 見積書（印刷/PDF/メール/Excel出力）
│   │   └── EstimateSheet.module.css
│   └── data/
│       └── sampleLayout.json   # デモデータ（スーパー什器サンプル）
└── CLAUDE.md                   # ← この引き継ぎ書
```

---

## タブ構成と各コンポーネントの責務

| タブ | コンポーネント | 主な機能 |
|---|---|---|
| 🏠 概要 | `Landing.jsx` | プロダクト説明LP・導入前後比較・CTA |
| ① 図面取込 | `JsonInput.jsx` | 図面アップロード・Gemini/Claude AIプロンプト生成・JSON貼付 |
| ② 2Dフロアマップ | `FloorMap2D.jsx` | SVGマップ描画・棚クリックで部品詳細 |
| ③ 資材リスト | `PartsList.jsx` | 全資材一覧・カテゴリフィルタ・Excel出力 |
| ④ 在庫・発注 | `Inventory.jsx` | 在庫不足検出・チェック選択・メール発注・Excel出力 |
| ⑤ 見積書 | `EstimateSheet.jsx` | 資材費+施工費集計・税込見積書・印刷/PDF/メール/Excel |

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
    "name": "string",          // 表示名
    "type": "general|fresh|daily",   // ※ frozen/refrigeratedは三和商研対象外
    "color": "#hex",
    "x": number, "y": number, "w": number, "h": number
  }],
  "shelves": [{
    "id": "S001",
    "zone": "zone-xxx",
    "x": number, "y": number, "w": number, "h": number,
    "type": "SH-1950|SH-1500W",  // 棚の品番
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
    "unit_price": number       // 単価（円）
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

## AIフロー（コスト¥0運用）

```
現場で図面確定
  → ① 図面取込タブ で図面アップロード
  → 「プロンプトをコピー」
  → Gemini AI Studio（無料）or Claude.ai に貼り付け送信
  → 返ってきた JSON をテキストエリアに貼り付け
  → 「マップ生成」ボタン
  → ②〜⑤ タブで確認・見積書出力・発注
```

**Gemini API 自動化（将来実装）:**
```js
// JsonInput.jsx に以下を追加すれば完全自動化
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT_TEMPLATE }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }] }]
    })
  }
)
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
--green: #0a7c4e         /* 成功・発注済 */
--red: #b91c1c           /* 警告・在庫不足 */
--surface: #ffffff
--surface2: #f0ede8      /* サブ背景 */
--bg: #f5f3ef            /* ページ背景 */
--text: #1a1916
--text2: #6b6760
--text3: #9c988f
```

---

## Excel出力（SheetJS）

3タブでExcelファイルを出力できる。

| タブ | 出力ファイル | シート構成 |
|---|---|---|
| ③ 資材リスト | `三和商研_資材リスト_YYYY-MM-DD.xlsx` | 資材明細＋合計行 |
| ④ 在庫・発注 | `三和商研_発注リスト_YYYY-MM-DD.xlsx` | 選択発注品＋合計 |
| ⑤ 見積書 | `三和商研_見積書_YYYY-MM-DD.xlsx` | 「見積書」「明細」2シート |

---

## 見積書の単価設定

`EstimateSheet.jsx` の先頭:
```js
const LABOR_UNIT_PRICE = 25000 // 人工単価（円/人日）← 変更はここだけ
```

---

## 今後の実装候補

- [ ] Gemini API 直結（図面→JSON自動変換、コスト¥0.3〜2/枚）
- [ ] 複数案件の管理（プロジェクト一覧画面）
- [ ] 発注履歴の保存（LocalStorage or Supabase）
- [ ] 見積書に会社ロゴ・印鑑画像の挿入
- [ ] 棚の種別・単価マスタを管理画面から編集

---

## Claude Code での作業開始コマンド

```bash
# このファイルを読んで現状を把握してから作業を続けて
cat ~/path/to/sanwa-dx/CLAUDE.md
npm run dev
```

---

## 注意事項

- `zone.type` に `frozen`/`refrigerated` は**使わない**（三和商研は棚専門、冷凍設備は対象外）
- `FloorMap2D.jsx` の `ZONE_COLORS` に `general` / `fresh` / `daily` の3種類のみ定義
- `SHELF_COLORS` は `SH-1950` / `SH-1500W` のみ
