# Astro Tool

ブラウザだけで完結する占星術ツール集。ビルド不要の静的サイトで、計算はすべてブラウザ内で行われます（チャートデータはサーバーに送信されず、localStorage に保存。エクスポート／インポート対応）。

## ツール

- **Astro Viewer** (`viewer/`) — ネイタル・トランジット・シナストリー・ルナリターン・ソーラーリターンの計算と SVG ホイール表示。テーブル表示・テキストコピー・チャート画像保存に対応
- **Reverse Horoscope** (`reverse/`) — 天体のサイン配置から誕生日候補を逆算する逆引き検索。創作キャラクターの誕生日設定などに
- **Reverse Guide** (`reverse/guide.html`) — キャラクターの性格から天体サインを絞り込むウィザード。結果は逆引き検索へ引き継げます
- **はじめての占星術** (`tutorial/`) — 質問に答えると AI への読み解き依頼文が生成される初心者向けモード

## 動かし方

ビルドは不要ですが、ES Modules と fetch を使うため静的 HTTP サーバーが必要です。

```bash
# リポジトリ直下で
python -m http.server
# http://localhost:8000/ を開く
```

天体計算には Swiss Ephemeris の天文暦ファイルが必要です（`sweph/ephe/` に配置）。

## 構成

```
├── index.html      ツール一覧ランディング
├── viewer/         ホロスコープ計算・表示
├── reverse/        誕生日逆引き・ガイド
├── tutorial/       初心者向けモード
├── shared/         localStorage 管理・都市緯度経度データ
└── sweph/          sweph-wasm ラッパー・WASM 本体・天文暦
```

## ライセンス

[AGPL-3.0](./LICENSE)

天体計算に Swiss Ephemeris（[sweph-wasm](https://github.com/ptprashanttripathi/sweph-wasm)）を利用しているため、本プロジェクトも AGPL-3.0 で公開しています。
