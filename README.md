# 三和商研 DX Platform

スーパーマーケット什器レイアウト図面をAIで解析し、**鋼材算出 → フロアマップ可視化 → 見積書出力 → 発注メール**まで一気通貫で完結するWebアプリ。

## セットアップ

```bash
git clone https://github.com/s-yamanaka-droid/sanwa-dx.git
cd sanwa-dx
npm install
npm run dev
# → http://localhost:5173
```

## 機能概要

| タブ | 機能 |
|---|---|
| 🏠 概要 | プロダクト説明・導入前後比較 |
| ① 図面取込 | 図面アップロード・Gemini/Claude AIプロンプト生成・JSON貼付 |
| ② 2Dフロアマップ | SVGマップ描画・棚クリックで部品詳細 |
| ③ 資材リスト | 全資材一覧・カテゴリフィルタ・**Excel出力** |
| ④ 在庫・発注 | 在庫不足検出・**メール発注**・**Excel出力** |
| ⑤ 見積書 | 税込見積書・**印刷/PDF/メール/Excel出力** |

## 技術スタック

- React + Vite
- CSS Modules
- SheetJS (xlsx) — Excel出力
- AIフロー: Gemini AI Studio / Claude.ai（APIコスト¥0）

## 引き継ぎ・Claude Code での作業

**`CLAUDE.md`** を参照。ディレクトリ構成・データ型・デザイン規則・実装候補がすべて記載されている。

```bash
cat CLAUDE.md
```

## ライセンス

三和商研 様 向け / 株式会社トレプロ 制作
