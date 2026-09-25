# AI Doc Template

AI に技術ドキュメントやレポートを **HTML で出力させる**ための共通テンプレート。
このディレクトリ全体が 1 つの **skill パッケージ**になっている。

- CSS / JavaScript / HTML は分離。HTML からは `link` と `script` で読むだけ
- 同じ HTML を **1 ファイルに固めたビルド**も出せる（コピペ配布・メール添付向け）
- ライト / ダーク自動切替、A4 印刷対応、日本語タイポグラフィ前提
- 目次の自動生成・スクロール追従、コードのコピーボタン、Mermaid 図、TeX 数式
- `data-overmind` で開くと、段落・リスト項目のコメントを下書き保存してレビュー JSON として送信

---

## skill として使う

### Claude Code / Cowork

`~/.claude/skills/` 配下に置けば、以後のセッションで自動的に読み込まれる。

```bash
# 個人用（全プロジェクトで使う）
ln -s "$(pwd)" ~/.claude/skills/ai-doc-template

# 特定のプロジェクトだけで使う
ln -s "$(pwd)" /path/to/project/.claude/skills/ai-doc-template
```

symlink を嫌う環境ではディレクトリごとコピーしてもよい。
エージェントは `SKILL.md` を入口として読み、必要に応じて `references/` を追加で読む。

### その他のエージェント（Cursor / Codex / 自作エージェントなど）

`AGENTS.md` が入口になる。リポジトリを参照させるだけでよい。

ファイルを読み込めないエージェントには、`references/paste-prompt.md` の内容を
システムプロンプトやカスタム指示に貼り付ける。

### 人間が手で使う

`template.html` をコピーして本文を書き始めるのが最短ルート。

---

## ファイル構成

```
ai-doc-template/
├── SKILL.md                     skill の入口（エージェントが最初に読む）
├── AGENTS.md                    Claude 以外のエージェント向け入口
├── README.md                    このファイル（人間向け）
├── DESIGN.md                    デザインの設計思想
├── template.html                空のひな形（ここから書き始める）
├── example.html                 全パーツを使ったサンプル文書
├── review-example.html          段落レビュー UI の動作確認用文書
├── assets/
│   ├── doc.css                  スタイル（唯一の見た目の定義）
│   └── doc.js                   目次・コピーボタン・図・数式（任意）
├── references/
│   ├── components.md            パーツ完全リファレンス
│   ├── config.md                DOC_CONFIG・テーマ・トークン・オフライン運用
│   └── paste-prompt.md          ファイル参照なしで完結する指示文
├── scripts/
│   └── build-standalone.mjs     単一 HTML 化スクリプト（依存なし）
└── dist/                        ビルド結果の出力先
```

設計判断の理由は [DESIGN.md](./DESIGN.md)、パーツの詳細は
[references/components.md](./references/components.md) にある。

---

## 使い方

### 1. 分離配置（推奨）

`assets/` を文書と同じ場所に置き、HTML から参照する。

```html
<link rel="stylesheet" href="assets/doc.css">
...
<script src="assets/doc.js" defer></script>
```

複数の文書でスタイルを共有でき、`doc.css` を直せば全文書に反映される。
`template.html` をコピーして本文を書き始めるのが最短ルート。

### 2. 単一ファイル化

配布・添付・アーカイブ用に 1 ファイルへ固める。

```bash
node scripts/build-standalone.mjs example.html
# → dist/example.standalone.html

node scripts/build-standalone.mjs report.html -o 提出用.html
node scripts/build-standalone.mjs docs/*.html --outdir dist
```

`<link>` は `<style>` に、`<script src>` は `<script>` に展開される。
ローカル画像は `data:` URI として埋め込まれる（`--keep-assets` で無効化）。
Mermaid / KaTeX / highlight.js は CDN 参照のまま残る（埋め込むと数 MB になるため）。

### 3. 手でコピペして単一ファイルにする

ビルドを回さない場合は、`doc.css` の中身を `<style>` に、
`doc.js` の中身を `<script>` に貼るだけでよい。両ファイルとも
外部ファイルを参照していないので、貼り付ければそれで完結する。

### 4. 人間のレビューを AI に返す

`data-overmind` の `fileserver` で文書を開くと、各段落とリスト項目の右側に三点リーダーが現れる。
コメントは入力中から `localStorage` に下書き保存され、サイドバーの
**レビューをサブミットする**で元の HTML と同じディレクトリへ保存される。

```text
report.html
report.html.review.json
```

AI にはこの 2 ファイルを一緒に読ませる。レビュー JSON には対象箇所の ID・引用・ハッシュが
含まれるため、AI は指摘箇所を照合できる。`file://` や通常の静的サーバーではレビュー UI は
自動的に出ず、従来どおり閲覧専用の文書として動作する。

長期間更新する文書では、段落やリスト項目に `data-review-id="requirements-auth"` のような安定した ID を
付けると、前段の追加・削除があってもレビュー先を追跡しやすい。未指定時は見出し・要素種別・位置から
自動生成される。

---

## HTML の書き方

### 骨組み

```html
<div class="doc-layout">
  <aside class="doc-toc" id="doc-toc"></aside>   <!-- 中身は JS が生成 -->
  <div class="doc-main" id="main">
    <header class="doc-header"> … タイトルとメタ情報 … </header>
    <article class="doc-body">  … 本文（ここだけ書けばよい） … </article>
    <footer class="doc-footer"> … 出典・更新日 … </footer>
  </div>
</div>
```

**本文は素のセマンティック HTML でよい。**
`<h2>` `<h3>` `<p>` `<ul>` `<table>` `<pre>` `<blockquote>` はクラスなしで整う。
`<h2>` / `<h3>` が自動的に目次になる。

### 覚えるクラスは 5 つだけ

| クラス | 用途 |
| --- | --- |
| `.lead` | 冒頭の要約段落 |
| `.callout` + 種別 | 注意 / 補足 / 警告のボックス |
| `.badge` + 種別 | ステータスラベル |
| `.card` / `.doc-grid` | カードの並列配置 |
| `.doc-meta` | ヘッダのメタ情報リスト |

---

## パーツ早見表

主要なパーツの最小形だけをここに置く。**全パーツの完全な書式は
[references/components.md](./references/components.md)**、実際の組み上がりは
[example.html](./example.html) を見る。

```html
<!-- 冒頭の要約 -->
<p class="lead">この文書が何で、誰向けで、何が分かるか。</p>

<!-- 注意書き（info / success / warn / danger / note） -->
<div class="callout callout-warn" data-title="注意"><p>本文。</p></div>

<!-- ステータス（badge / badge-info / success / warn / danger） -->
<span class="badge badge-success">承認済み</span>

<!-- コード（コピーボタンは自動で付く） -->
<pre><code class="language-go">func main() {}</code></pre>

<!-- ファイル名つきコード -->
<figure class="code-block" data-filename="internal/event/outbox.go">
<pre><code class="language-go">…</code></pre>
  <figcaption>説明。</figcaption>
</figure>

<!-- 表（横スクロール化は自動。数値列に class="num"） -->
<table>
  <caption>表 1: キャプション</caption>
  <thead><tr><th scope="col">項目</th><th scope="col" class="num">値</th></tr></thead>
  <tbody><tr><th scope="row">Kafka</th><td class="num">¥182,000</td></tr></tbody>
</table>

<!-- 説明が長い項目は表にせず定義リストにする -->
<dl>
  <dt>Kafka</dt>
  <dd>採用理由や制約を文章で説明する。</dd>
</dl>

<!-- カードと数値ハイライト -->
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

<!-- Mermaid 図 -->
<div class="mermaid">
flowchart LR
  A[開始] --> B{分岐}
</div>

<!-- 数式: インライン $x^2$、別行立て $$\sum_{i=1}^{n} x_i$$ -->
```

Mermaid と数式は、該当する記法がページにあるときだけライブラリを読みに行く。
`<code>` や `<pre>` の中は数式の対象外なので、`$HOME` や SQL の `$1` は誤変換されない。

表は、短い値を行・列で比較するときだけ使う。セルの内容が 1 フレーズを超える、または
列が多く横長になる場合は、表ではなく `<dl>` / `<dt>` / `<dd>` の定義リストにする。


---

## 設定（任意）

`doc.js` を読み込む**前**に `window.DOC_CONFIG` を定義する。

```html
<script>
  window.DOC_CONFIG = {
    highlight:   { enable: true },   // シンタックスハイライト（既定 off）
    themeToggle: { enable: true }    // ライト/ダーク切替ボタン（既定 off）
  };
</script>
<script src="assets/doc.js" defer></script>
```

よく使う既定値:

| 設定 | 既定 | 説明 |
| --- | --- | --- |
| `toc.enable` | `true` | `#doc-toc` に目次を生成。見出しが 2 個未満なら目次リンクを表示しない |
| `toc.scrollSpy` | `true` | スクロールに応じて現在位置をハイライト |
| `mermaid.enable` | `'auto'` | `.mermaid` があるときだけ読み込む |
| `math.enable` | `'auto'` | 数式らしき記法があるときだけ読み込む |
| `highlight.enable` | `false` | `true` で highlight.js を読み込む。配色は `doc.css` 側で定義済み |
| `themeToggle.enable` | `false` | `true` で右上に切替ボタン。選択は `localStorage` に保存 |
| `review.enable` | `'auto'` | `data-overmind` 接続時だけ段落・リスト項目レビューを有効化 |

**全設定項目・オフライン運用の手順は
[references/config.md](./references/config.md)** にある。

個別の見出しを目次から外したいときは `<h2 data-toc-skip>` を付ける。

### テーマ・本文幅・書体の固定

```html
<html lang="ja" data-theme="light">      <!-- 常にライト（配布・印刷向け） -->
<html lang="ja" data-theme="dark">       <!-- 常にダーク -->
<html lang="ja">                         <!-- OS 設定に追従（既定） -->

<html lang="ja" data-doc-width="wide">   <!-- 46rem → 56rem -->
<html lang="ja" data-doc-width="full">   <!-- 上限なし -->
<html lang="ja" data-doc-font="serif">   <!-- 明朝系 -->
```


---

## 見た目のカスタマイズ

`doc.css` 冒頭の `:root` にあるトークンを書き換えるだけでよい。
CSS 本文に生の色コードは書かれていないので、ここだけで全体が変わる。

```css
:root {
  --doc-c-accent: #1f5fa9;   /* リンク・目次の現在位置・強調 */
  --doc-measure: 46rem;      /* 本文の最大幅 */
  --doc-leading-body: 1.85;  /* 本文の行送り */
  --doc-radius-md: 8px;      /* 角丸 */
}
```

ダークテーマ側は `@media (prefers-color-scheme: dark)` と
`:root[data-theme="dark"]` の 2 か所に同じトークンがあるので、
色を変えるときは両方を揃える。

---

## 印刷 / PDF

ブラウザの印刷（<kbd>Ctrl</kbd>+<kbd>P</kbd> → PDF に保存）でそのまま A4 になる。
目次・コピーボタン・テーマ切替ボタン・レビュー操作は印刷されない。
コードブロック・表・図・コールアウトはページを跨がない。
明示的に改ページしたい位置には `<div class="page-break"></div>` を置く。

---

## 動作環境

- モダンブラウザ全般（Chrome / Edge / Safari / Firefox の現行版）
- `file://` で直接開いても動作する
- JavaScript を無効にしても文書は読める（目次と図・数式が出ないだけ）
- Mermaid / KaTeX / highlight.js を使うときだけネットワークが必要

オフライン環境で図や数式を使う場合は、ライブラリをローカルに置いて
`DOC_CONFIG` の `src` / `js` / `css` をそのパスに向ける。

```js
window.DOC_CONFIG = {
  mermaid: { src: 'vendor/mermaid.min.js' },
  math: { katex: {
    js: 'vendor/katex.min.js',
    autoRender: 'vendor/auto-render.min.js',
    css: 'vendor/katex.min.css'
  } }
};
```

---

## AI に書かせるとき

skill として読み込める環境（Claude Code / Cowork）では、上の「skill として使う」の
手順で置くだけでよい。エージェントが `SKILL.md` を読んで動く。

それ以外の環境では [references/paste-prompt.md](./references/paste-prompt.md) の内容を
システムプロンプトやカスタム指示に貼る。`template.html` を添付し、
「この構造に従って本文だけ書く」と指示すると安定する。
