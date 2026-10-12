# AGENTS.md

このファイルは **AI Doc Template リポジトリを開発・保守する Agent** 向けの指示です。
このテンプレートを使って HTML 文書を生成する手順は [SKILL.md](./SKILL.md) にあります。

## リポジトリ内の役割

| ファイル | 役割 |
| --- | --- |
| `assets/doc.css` | 見た目の定義 |
| `assets/doc.js` | 目次、図・数式、レビュー UI などの任意機能 |
| `template.html` | 文書生成の元になる HTML |
| `scripts/build-standalone.mjs` | ローカルの CSS / JS を単一 HTML へ埋め込む |
| `SKILL.md`、`references/` | HTML を生成する Agent 向けの使い方 |
| `DESIGN.md` | 実装上の設計判断と制約 |
| `RELEASING.md` | CDN 向けリリースの準備、公開、検証 |

## 変更時に守ること

- `assets/doc.css` または `assets/doc.js` を変更する前に [DESIGN.md](./DESIGN.md) を読む。
- 見た目の値は CSS の `:root` のカスタムプロパティに置く。CSS 本文に生の色コードを増やさない。
- `doc.css` / `doc.js` に自作資産への相対パス依存を追加しない。単一ファイル化の前提を保つ。
  Mermaid・KaTeX・highlight.js などの任意ライブラリは実行時に別途読み込む。
- JavaScript が読み込めない場合も本文を読める状態を保つ。
- `template.html` はローカルの `assets/` 参照を維持する。CDN URL は配布する文書側で指定する。
  外部 URL は単一ファイル化スクリプトでは埋め込まれない。
- HTML の使い方を変えたら、`README.md`、`SKILL.md`、該当する `references/` の説明も揃える。

## 検証

変更後は少なくとも次を実行する。

```bash
node --check assets/doc.js
node scripts/build-standalone.mjs example.html
```

生成された `dist/example.standalone.html` に自作の CSS / JS が埋め込まれることも確認する。
ブラウザでのライト・ダーク・印刷プレビュー確認は、ユーザーから明示的に求められた場合だけ行う。

## CDN 向けリリース

リリースを依頼された場合は [RELEASING.md](./RELEASING.md) に従う。
HTML 生成や文書の編集だけの依頼ではタグ作成・push を行わない。
公開済みタグは移動・上書きせず、修正は新しいバージョンで発行する。
