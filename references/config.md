# config.md — 設定リファレンス

出力側で調整できる項目の一覧。テンプレート本体（`assets/doc.css` / `assets/doc.js`）を
書き換えずに済ませられる範囲をここにまとめてある。

## 目次

- [DOC_CONFIG](#doc_config)
- [html 属性による切替](#html-属性による切替)
- [デザイントークン](#デザイントークン)
- [オフライン運用](#オフライン運用)
- [動作環境](#動作環境)

---

## DOC_CONFIG

`assets/doc.js` を読み込む**前**に `window.DOC_CONFIG` を定義する。
指定した項目だけが既定値を上書きする（深いマージ）。

```html
<script>
  window.DOC_CONFIG = {
    highlight:   { enable: true },
    themeToggle: { enable: true }
  };
</script>
<script src="assets/doc.js" defer></script>
```

### 全項目と既定値

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `content` | `'.doc-body'` | 処理対象の本文セレクタ |
| `toc.enable` | `true` | 目次を生成するか |
| `toc.target` | `'#doc-toc'` | 目次の差し込み先 |
| `toc.headings` | `'h2, h3'` | 目次に載せる見出し |
| `toc.title` | `'目次'` | 目次の見出し文字列 |
| `toc.minHeadings` | `2` | これ未満なら目次リンクを表示しない（レビュー欄は利用可能） |
| `toc.scrollSpy` | `true` | スクロールに応じて現在位置をハイライト |
| `anchors.enable` | `true` | 見出しに `#` アンカーを付ける |
| `anchors.headings` | `'h2, h3, h4'` | アンカーを付ける見出し |
| `copyCode.enable` | `true` | コードブロックにコピーボタンを付ける |
| `copyCode.label` | `'コピー'` | ボタンの文言 |
| `tableScroll.enable` | `true` | 表を横スクロール可能なコンテナで包む |
| `mermaid.enable` | `'auto'` | `.mermaid` があるときだけ読み込む |
| `mermaid.src` | jsDelivr の URL | Mermaid の読み込み元 |
| `mermaid.config` | `{}` | `mermaid.initialize()` に渡す設定 |
| `math.enable` | `'auto'` | 数式記法があるときだけ読み込む |
| `math.engine` | `'katex'` | `'katex'` または `'mathjax'` |
| `math.katex.delimiters` | `$$ $ \[ \(` | 数式の区切り記号 |
| `highlight.enable` | `false` | `true` で highlight.js を読み込む |
| `themeToggle.enable` | `false` | `true` で右上にライト/ダーク切替ボタン |
| `themeToggle.storageKey` | `'doc-theme'` | 選択を保存する localStorage のキー |
| `review.enable` | `'auto'` | `data-overmind` のレビュー API があるときだけレビューを有効化。`false` で無効、`true` で接続エラーも表示 |
| `review.contextURL` | `'/_data-overmind/review-context'` | 文書と既存レビューを取得する同一オリジン API |
| `review.submitURL` | `'/_data-overmind/reviews'` | レビューを保存する同一オリジン API |
| `review.selector` | `'p, li'` | 本文内でレビュー対象にする要素のセレクタ |
| `review.storagePrefix` | `'ai-doc-review:v1:'` | 下書き用 localStorage キーの接頭辞 |
| `review.saveDelay` | `300` | 入力後に下書きを保存するまでの待ち時間（ms） |
| `review.labels.*` | 日本語の既定文言 | ボタン、状態、エラー表示の文言 |

`enable` の `'auto'` は「対象要素があるときだけ有効」の意味。
図も数式もない文書では、対応するライブラリを 1 バイトも取得しない。

### 段落・リスト項目レビュー

レビューは HTTP(S) で開いた文書だけで初期化される。既定の `'auto'` ではレビュー API が
見つからない場合に UI を出さないため、一般的な静的ホスティングや単一ファイル配布の挙動を
変えない。`data-overmind` から開いた場合は、入力中のコメントを `localStorage` に保存し、
送信時に `<文書名>.review.json` へ書き出す。

対象の段落やリスト項目には任意で安定 ID を指定できる。

```html
<p data-review-id="requirements-auth">認証要件の本文。</p>
<li data-review-id="requirements-audit">監査ログを 90 日保持する。</li>
```

未指定時は、直前の `h2` / `h3`、要素種別、セクション内の同種要素の位置から ID を生成する。
文書を長期運用し、段落やリスト項目の追加・並べ替えが多い場合は `data-review-id` を推奨する。

`li` の子に `p` がある場合は、同じ文章に操作が二重表示されないよう子の `p` だけを対象にする。
入れ子のリストでは各 `li` が対象になり、親項目の引用には子リストの文章を含めない。

`window.DocTemplate.reviewStatus()` は初期化後の状態（有効可否、コメント数、下書き有無、
レビューのパス）を返す。レビュー内容そのものは返さない。

### `$` を数式として扱いたくない場合

金額表記（`$100`）が多い文書では、インラインの `$…$` を無効にする。

```js
window.DOC_CONFIG = {
  math: { katex: { delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\(', right: '\\)', display: false }
  ] } }
};
```

### 動的にコンテンツを差し替えたとき

`window.DocTemplate.init()` を呼ぶと、目次・コピーボタン・表のラップを再構築できる。

---

## html 属性による切替

```html
<html lang="ja" data-theme="light">      <!-- 常にライト -->
<html lang="ja" data-theme="dark">       <!-- 常にダーク -->
<html lang="ja">                         <!-- OS 設定に追従（既定） -->

<html lang="ja" data-doc-width="wide">   <!-- 本文幅 46rem → 56rem -->
<html lang="ja" data-doc-width="full">   <!-- 上限なし -->

<html lang="ja" data-doc-font="serif">   <!-- 明朝系。報告書向け -->
```

複数を同時に指定してよい（`<html lang="ja" data-theme="light" data-doc-font="serif">`）。

配布・印刷・スクリーンショット共有が前提の文書は `data-theme="light"` を固定すると
相手の環境によらず同じ見た目になる。

---

## デザイントークン

色・余白・タイプスケールはすべて `assets/doc.css` 冒頭の `:root` にある。
CSS 本文には（ハイライト定義を除き）生の色コードが出てこないので、ここだけで全体が変わる。

よく触るもの:

```css
:root {
  --doc-c-accent: #1f5fa9;    /* リンク・目次の現在位置・強調 */
  --doc-measure: 46rem;       /* 本文の最大幅 */
  --doc-leading-body: 1.85;   /* 本文の行送り */
  --doc-radius-md: 8px;       /* 角丸 */
  --doc-toc-width: 17rem;     /* 目次サイドバーの幅 */
}
```

1 文書だけ色を変えたい場合は、その HTML の `<head>` に上書きを置く。

```html
<link rel="stylesheet" href="assets/doc.css">
<style>:root { --doc-c-accent: #7a3b8f; }</style>
```

ダークテーマ側の値は `@media (prefers-color-scheme: dark)` と `:root[data-theme="dark"]` の
2 か所にある。色を変えるときは両方を揃える。

---

## オフライン運用

Mermaid / KaTeX / highlight.js をローカルに置き、`DOC_CONFIG` でそのパスを指す。

```js
window.DOC_CONFIG = {
  mermaid: { src: 'vendor/mermaid.min.js' },
  math: { katex: {
    js:         'vendor/katex.min.js',
    autoRender: 'vendor/auto-render.min.js',
    css:        'vendor/katex.min.css'
  } },
  highlight: { enable: true, src: 'vendor/highlight.min.js' }
};
```

同一オリジンやローカルファイルのときは `crossorigin` 属性を付けないので、
`file://` で直接開いても読み込める。

図も数式もハイライトも使わない文書なら、そもそもネットワークは不要。

---

## 動作環境

- モダンブラウザ全般（Chrome / Edge / Safari / Firefox の現行版）
- `file://` で直接開いても動作する
- JavaScript を無効にしても文書は読める。目次・図・数式が出ないだけで、
  本文・表・コードはそのまま表示される
- 印刷はブラウザの印刷ダイアログから。A4 が既定
