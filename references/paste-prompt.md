# paste-prompt.md — ファイルを読めないエージェント向けの指示スニペット

skill としてファイルを読み込めないエージェント（他社製ツール、Web の chat UI、
API 経由の自前エージェントなど）向けに、ファイル参照なしで完結する指示文を用意してある。
システムプロンプトやカスタム指示に貼り付けて使う。`template.html` を一緒に添付するとさらに安定する。

Claude Code / Cowork のように skill を読める環境では `SKILL.md` が読まれるので、
このファイルを使う必要はない。

---

## 短縮版（これだけで足りることが多い）

````
HTML でドキュメントを出力するときは、次の骨組みに従うこと。

<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>タイトル</title>
<link rel="stylesheet" href="assets/doc.css">
</head>
<body>
<div class="doc-layout">
  <aside class="doc-toc" id="doc-toc"></aside>
  <div class="doc-main" id="main">
    <header class="doc-header">
      <p class="doc-eyebrow">文書種別</p>
      <h1>タイトル</h1>
      <p class="doc-subtitle">1〜2 文の要約</p>
      <dl class="doc-meta">
        <div><dt>作成日</dt><dd>YYYY-MM-DD</dd></div>
        <div><dt>バージョン</dt><dd>1.0</dd></div>
      </dl>
    </header>
    <article class="doc-body">
      <p class="lead">冒頭の要約。</p>
      <h2>見出し</h2>
      <p>本文。</p>
    </article>
    <footer class="doc-footer">
      <p>タイトル — v1.0</p>
      <p>最終更新: YYYY-MM-DD</p>
    </footer>
  </div>
</div>
<script src="assets/doc.js" defer></script>
</body>
</html>

ルール:
- 本文は <article class="doc-body"> の中だけに書く。
- 見出し・段落・リスト・表・コードは素のセマンティック HTML で書く。
  クラスは付けない。スタイルは CSS 側で当たる。
- 目次は書かない。h2 / h3 から自動生成される。
- 独自の style 属性・class・<style> ブロックを足さない。
- 使ってよい追加クラスは以下だけ:
    .lead                     冒頭の要約段落
    .callout .callout-info|success|warn|danger|note  （data-title="見出し"）
    .badge .badge-info|success|warn|danger           ステータスラベル
    .card / .doc-grid         カードの並列配置
    .code-block               ファイル名つきコードブロック（data-filename="…"）
    .checklist                チェックリストの ul
    .num                      表の数値列（th/td）
- 図は <div class="mermaid"> に Mermaid 記法で書く。
- 数式は $…$（インライン）と $$…$$（別行立て）で書く。
````

---

## 詳細版（パーツの書式を明示する）

````
## 出力形式

技術ドキュメント / レポートは、AI Doc Template の構造に従った HTML で出力する。

### 骨組み

<div class="doc-layout">
  <aside class="doc-toc" id="doc-toc"></aside>
  <div class="doc-main" id="main">
    <header class="doc-header">…</header>
    <article class="doc-body">…本文…</article>
    <footer class="doc-footer">…</footer>
  </div>
</div>

head で assets/doc.css、body 末尾で assets/doc.js を読み込む。

### 本文の書き方

- セクション見出しは <h2>、その下位は <h3>、さらに下は <h4>。h1 はタイトルのみ。
- 段落は <p>。リストは <ul> / <ol>。用語定義は <dl><dt><dd>。
- クラスを付けない。style 属性を書かない。<style> や <script> を足さない。
- 目次は生成しない（h2/h3 から自動生成される）。

### 使えるパーツ

冒頭の要約:
  <p class="lead">この文書が何で、誰向けで、何が分かるかを 2〜3 文。</p>

メタ情報:
  <dl class="doc-meta">
    <div><dt>作成日</dt><dd>2026-09-06</dd></div>
    <div><dt>ステータス</dt><dd><span class="badge badge-success">承認済み</span></dd></div>
  </dl>

注意書き:
  <div class="callout callout-warn" data-title="注意"><p>…</p></div>
  種別: callout-info / callout-success / callout-warn / callout-danger / callout-note

ステータスラベル:
  <span class="badge badge-success">完了</span>
  種別: badge / badge-info / badge-success / badge-warn / badge-danger

コード:
  <pre><code class="language-go">…</code></pre>
  ファイル名を出す場合:
  <figure class="code-block" data-filename="path/to/file.go">
  <pre><code class="language-go">…</code></pre>
    <figcaption>説明。</figcaption>
  </figure>

表（数値列には class="num"）:
  <table>
    <caption>表 1: キャプション</caption>
    <thead><tr><th scope="col">項目</th><th scope="col" class="num">値</th></tr></thead>
    <tbody><tr><th scope="row">A</th><td class="num">1,234</td></tr></tbody>
  </table>

カード・数値:
  <div class="doc-grid">
    <div class="card">
      <span class="stat"><span class="stat-value">3.1s</span>
      <span class="stat-label">説明</span></span>
    </div>
  </div>

チェックリスト:
  <ul class="checklist">
    <li><input type="checkbox" checked disabled> 完了</li>
    <li><input type="checkbox" disabled> 未完了</li>
  </ul>

折りたたみ:
  <details><summary>見出し</summary><p>本文</p></details>

図（Mermaid）:
  <div class="mermaid">
  flowchart LR
    A --> B
  </div>

数式（TeX）:
  インライン $x^2$、別行立て $$\sum_{i=1}^{n} x_i$$

### 書き方の方針

- 見出しの階層を飛ばさない（h2 の次に h4 を置かない）。
- 1 セクションが長くなったら h3 で分割する。
- 数値・日付・単位は本文中でも半角、単位の前に半角スペース（例: 48 ms、¥182,000）。
- 断定できない事項は「未解決の論点」として明示し、推測を事実として書かない。
- 表は比較・一覧に使い、散文の代わりにしない。
- コードは動く最小の断片を示し、省略箇所は … ではなくコメントで示す。
````

---

## 単一ファイルで出力させたい場合

上記の指示に次を追加する。

````
出力は 1 ファイルで完結させる。
<link rel="stylesheet" href="assets/doc.css"> の代わりに
doc.css の内容を <style> に、doc.js の内容を <script> に直接埋め込む。
（doc.css / doc.js は外部ファイルを参照していないので、そのまま貼れば動く）
````

または、分離配置で書かせてからビルドする。

```bash
node scripts/build-standalone.mjs 出力.html
```
