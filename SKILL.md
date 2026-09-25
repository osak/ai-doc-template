---
name: ai-doc-template
description: HTML でドキュメントを出力するための共通デザインテンプレート。設計書・仕様書・調査レポート・報告書・議事録・手順書・技術記事などを HTML で書くとき、または既存の文書を HTML 化・整形するときは必ずこの skill を使う。目次の自動生成とスクロール追従、コードのコピーボタン、Mermaid 図、TeX 数式、ライト/ダーク自動切替、A4 印刷に対応し、日本語の可読性を前提に調整済み。ユーザーが「HTML でレポートを」「見やすいドキュメントにして」「設計書を書いて」「report / design doc / spec / documentation as HTML」などと言った場合、HTML 形式が明示されていなくても成果物を Web ページとして渡すなら適用する。単一ファイルでの配布にも対応する。
---

# AI Doc Template

技術ドキュメントとレポートを、一貫したデザインの HTML で出力するためのテンプレート。

**この skill の考え方**: 本文は素のセマンティック HTML で書く。見た目は `assets/doc.css` が
すべて引き受けるので、書き手はクラス名も色も余白も考えない。クラスを覚える負担を最小化してあるのは、
長い文書を書き進めるうちに独自クラスを混ぜ始めても壊れないようにするため。

---

## 手順

1. **配布形態を決める。** 迷ったら分離配置。
   - 分離配置 — 出力先に `assets/` を置き、HTML から `link` / `script` で参照する
   - 単一ファイル — メール添付・チャット貼り付け・アーカイブ用。手順 4 でビルドする
2. **`template.html` をコピーして出力ファイルにする。** ゼロから HTML を書き起こさない。
3. **`<article class="doc-body">` の中だけを書く。** 下の「本文の書き方」に従う。
4. 単一ファイルが必要なら `node scripts/build-standalone.mjs 出力.html` を実行する。

既存 HTML をレビュー対応する作業では、同じディレクトリに `<HTML名>.review.json` があれば
必ず HTML と一緒に読む。`comments[].block.id` を第一候補、`quote`・`textSHA256`・`sectionId` を
補助情報として対象の段落またはリスト項目を照合し、各 `comment` に対処する。レビュー JSON 自体は編集せず、
対応できなかった指摘は成果報告で明示する。

生成後は必ずブラウザか目視で構造を確認する。特に、目次に出したい見出しが `h2` / `h3` に
なっているか、表がヘッダ行を持っているかを見る。

---

## 骨組み

この構造を変えない。`doc.css` のセレクタがこの入れ子を前提にしている。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ドキュメントのタイトル</title>
<link rel="stylesheet" href="assets/doc.css">
</head>
<body>
<a class="doc-skip-link" href="#main">本文へスキップ</a>
<div class="doc-layout">
  <aside class="doc-toc" id="doc-toc"></aside>
  <div class="doc-main" id="main">

    <header class="doc-header">
      <p class="doc-eyebrow">設計書 / DESIGN DOC</p>
      <h1>ドキュメントのタイトル</h1>
      <p class="doc-subtitle">1〜2 文で内容を要約する。</p>
      <dl class="doc-meta">
        <div><dt>作成日</dt><dd>2026-09-06</dd></div>
        <div><dt>バージョン</dt><dd>1.0</dd></div>
        <div><dt>ステータス</dt><dd><span class="badge badge-success">確定</span></dd></div>
      </dl>
    </header>

    <article class="doc-body">
      <p class="lead">冒頭の要約。この文書が何で、誰向けで、読むと何が分かるかを 2〜3 文。</p>

      <h2>セクション</h2>
      <p>本文。</p>
      <h3>小見出し</h3>
      <p>本文。</p>
    </article>

    <footer class="doc-footer">
      <p>ドキュメントのタイトル — v1.0</p>
      <p>最終更新: 2026-09-06</p>
    </footer>

  </div>
</div>
<script src="assets/doc.js" defer></script>
</body>
</html>
```

`aside.doc-toc` は空のまま置く。中身は `doc.js` が `h2` / `h3` から生成する。
目次を HTML に書くと、本文を書き進めるうちに必ず不整合が起きるので書かない。

---

## 本文の書き方

- 見出し・段落・リスト・表・コード・引用は **クラスなしの素の HTML** で書く。
  `<h2>` と書けば見出しになり、`<table>` と書けば表として整う。
- `style` 属性を書かない。`<style>` や独自の `<script>` を足さない。
- 見出しの階層を飛ばさない（`h2` の次に `h4` を置かない）。`h1` はタイトルだけ。
- 数値・日付・単位は半角、単位の前に半角スペースを置く（`48 ms`、`¥182,000`、`2026-09-06`）。
- 断定できない事項は「未解決の論点」として明示する。推測を事実として書かない。
- 表は、短い値を行・列で比較するときだけ使う。セルの内容が 1 フレーズを超える、または
  列が多く横長になる場合は、表ではなく `<dl>` / `<dt>` / `<dd>` の定義リストにする。
- コードは動く最小の断片にする。省略は `…` ではなくコメントで示す。
- 長期間レビューされる文書の重要な段落やリスト項目には、内容由来で安定した `data-review-id` を付けてよい。
  未指定でも見出し・要素種別・位置から自動生成されるため、すべての対象へ機械的に付けない。

### 使ってよいクラス

これ以外のクラスは足さない。HTML の語彙で表現できない意味だけをクラスにしてある。

| クラス | 用途 |
| --- | --- |
| `.lead` | 冒頭の要約段落 |
| `.callout` + `.callout-info\|success\|warn\|danger\|note` | 注意・補足・警告のボックス（`data-title="見出し"`） |
| `.badge` + `.badge-info\|success\|warn\|danger` | ステータスラベル |
| `.card` / `.doc-grid` | カードの並列配置 |
| `.stat` / `.stat-value` / `.stat-label` | 数値ハイライト |
| `.code-block` | ファイル名つきコードブロック（`data-filename="..."`） |
| `.checklist` | チェックリストの `ul` |
| `.num` | 表の数値列（`th` / `td`。右寄せ・等幅数字） |
| `.doc-wide` | 本文幅を超えて広く見せたい表・図 |
| `.page-break` | 印刷時にここで改ページ |

---

## パーツの最小形

```html
<!-- 注意書き -->
<div class="callout callout-warn" data-title="注意"><p>本文。</p></div>

<!-- ステータス -->
<span class="badge badge-success">承認済み</span>

<!-- コード（コピーボタンは JS が自動で付ける） -->
<pre><code class="language-go">func main() {}</code></pre>

<!-- ファイル名つきコード -->
<figure class="code-block" data-filename="internal/event/outbox.go">
<pre><code class="language-go">…</code></pre>
  <figcaption>説明。</figcaption>
</figure>

<!-- 表（横スクロール化は JS が自動で行う） -->
<table>
  <caption>表 1: キャプション</caption>
  <thead><tr><th scope="col">項目</th><th scope="col" class="num">値</th></tr></thead>
  <tbody><tr><th scope="row">Kafka</th><td class="num">¥182,000</td></tr></tbody>
</table>

<!-- カードと数値 -->
<div class="doc-grid">
  <div class="card">
    <span class="stat"><span class="stat-value">3.1s</span><span class="stat-label">配信遅延</span></span>
  </div>
</div>

<!-- チェックリスト -->
<ul class="checklist">
  <li><input type="checkbox" checked disabled> 完了</li>
  <li><input type="checkbox" disabled> 未完了</li>
</ul>

<!-- 図 -->
<div class="mermaid">
flowchart LR
  A[開始] --> B{分岐}
  B -->|Yes| C[処理]
</div>

<!-- 数式: インライン $x^2$、別行立て $$\sum_{i=1}^{n} x_i$$ -->
```

細かい指定（引用・折りたたみ・脚注・定義リスト・図表キャプション・`data-toc-skip` など）は
`references/components.md` に全部ある。パーツで迷ったらそこを読む。

---

## 単一ファイルにする

```bash
node scripts/build-standalone.mjs 出力.html            # → dist/出力.standalone.html
node scripts/build-standalone.mjs 出力.html -o 提出用.html
node scripts/build-standalone.mjs docs/*.html --outdir dist
```

`<link>` が `<style>` に、`<script src>` が `<script>` に展開される。依存パッケージは不要。
Node が使えない環境では、`assets/doc.css` の中身を `<style>` に、`assets/doc.js` の中身を
`<script>` に貼るだけでよい（どちらも外部ファイルを参照していないので、そのまま貼れば動く）。

Mermaid / KaTeX / highlight.js は CDN 参照のまま残る。埋め込むと 1 ファイルが数 MB になるため。

---

## 設定を変えたいとき

`doc.js` を読み込む**前**に `window.DOC_CONFIG` を置く。テーマ固定は `<html data-theme="dark">`、
本文幅は `<html data-doc-width="wide">`、明朝体は `<html data-doc-font="serif">`。

```html
<script>
  window.DOC_CONFIG = {
    highlight:   { enable: true },   // シンタックスハイライト（既定 off）
    themeToggle: { enable: true },   // ライト/ダーク切替ボタン（既定 off）
    review:      { enable: 'auto' }  // data-overmind 接続時だけ段落・リスト項目レビュー
  };
</script>
```

全設定項目・トークンの一覧は `references/config.md`。

---

## やってはいけないこと

- 目次を HTML に手で書く（`doc.js` が生成する）
- `style` 属性・`<style>` ブロック・独自クラスの追加（デザインの一貫性が崩れる）
- `.doc-layout` / `.doc-main` / `.doc-body` の入れ子を変える
- Tailwind など外部 CSS フレームワークの読み込み（単一ファイル配布と両立しない）
- Web フォントの読み込み（オフラインで表示が変わる）
- `<h2>` を飛ばして `<h4>` を使う（目次が崩れる）

---

## 参照ファイル

| ファイル | 読むタイミング |
| --- | --- |
| `references/components.md` | パーツの正確な書式を確認するとき（全パーツの完全版） |
| `references/config.md` | `DOC_CONFIG`・テーマ・トークン・オフライン運用を調べるとき |
| `references/paste-prompt.md` | ファイルを読めないエージェントに指示を貼り付けるとき |
| `example.html` | 実際の組み上がりを見たいとき（全パーツを使った設計書サンプル） |
| `DESIGN.md` | 設計判断の理由を知りたいとき。通常の出力作業では読まなくてよい |
| `README.md` | 人間向けの導入・利用ガイド |
