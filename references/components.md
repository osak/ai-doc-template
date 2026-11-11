# components.md — パーツ完全リファレンス

`SKILL.md` の「パーツの最小形」に載っていない細部はここにある。
実際に組み上がった状態は `example.html` で確認できる。

## 目次

- [文書ヘッダ](#文書ヘッダ)
- [本文の基本要素](#本文の基本要素)
- [コールアウト](#コールアウト)
- [バッジ](#バッジ)
- [コード](#コード)
- [表](#表)
- [カード・数値ハイライト](#カード数値ハイライト)
- [リスト](#リスト)
- [引用・折りたたみ](#引用折りたたみ)
- [図・キャプション](#図キャプション)
- [Mermaid 図](#mermaid-図)
- [数式](#数式)
- [脚注](#脚注)
- [文書フッタ](#文書フッタ)
- [目次の制御](#目次の制御)
- [印刷の制御](#印刷の制御)
- [ユーティリティ](#ユーティリティ)

---

## 文書ヘッダ

```html
<header class="doc-header">
  <p class="doc-eyebrow">設計書 / DESIGN DOC</p>
  <h1>イベント配信基盤のリプレース設計</h1>
  <p class="doc-subtitle">1〜2 文で内容を要約するサブタイトル。</p>

  <dl class="doc-meta">
    <div><dt>作成日</dt><dd>2026-09-06</dd></div>
    <div><dt>バージョン</dt><dd>1.2</dd></div>
    <div><dt>対象読者</dt><dd>バックエンド / SRE</dd></div>
    <div><dt>ステータス</dt><dd><span class="tag is-success is-light">レビュー済み</span></dd></div>
  </dl>
</header>
```

- `.doc-eyebrow` は文書種別。省略可。
- `.doc-meta` は `<div><dt>…</dt><dd>…</dd></div>` でグループ化する。項目数は自由で、
  画面幅に応じて自動的に段組みになる。
- `<h1>` は文書に 1 つだけ。

## 本文の基本要素

すべてクラスなしで書く。

```html
<p class="lead">冒頭の要約段落。大きめ・淡い色で組まれる。</p>

<h2>セクション見出し</h2>
<h3>小見出し</h3>
<h4>さらに下の見出し</h4>

<p>段落。<strong>強調</strong>、<em>斜体</em>、<code>インラインコード</code>、
<a href="https://example.com">リンク</a>、<mark>ハイライト</mark>、
<abbr title="Service Level Objective">SLO</abbr>、
<kbd>Ctrl</kbd> + <kbd>K</kbd> が使える。</p>

<hr>
```

`h2` と `h3` が目次になる。`h4` 以下は目次に出ないが、見出しアンカーは付く。

## コールアウト

```html
<div class="notification is-warning is-light">
  <p><strong>注意</strong><br>本文。</p>
</div>
```

- 種別は `.is-info`、`.is-success`、`.is-warning`、`.is-danger`。淡色の `.is-light` と組み合わせる。
- 印刷でも意味が伝わるように「注意」「補足」などのラベルを `<strong>` に書く。
- 中には複数の段落やリストも入れられる。段落はレビュー対象になる。

## バッジ

```html
<span class="tag">未着手</span>
<span class="tag is-info is-light">レビュー中</span>
<span class="tag is-success is-light">完了</span>
<span class="tag is-warning is-light">要確認</span>
<span class="tag is-danger is-light">停止中</span>
```

表のセル、メタ情報、見出しの横で使う。

## コード

```html
<!-- 基本形。コピーボタンは doc.js が自動で付ける -->
<pre><code class="language-go">func main() {}</code></pre>

<!-- 長い行を折り返す -->
<pre class="wrap"><code>非常に長い一行のログ出力など</code></pre>

<!-- ファイル名とキャプション -->
<figure class="code-block" data-filename="internal/event/outbox.go">
<pre><code class="language-go">func (p *Publisher) Publish(ctx context.Context, ev Event) error {
	return nil
}</code></pre>
  <figcaption>説明文。省略可。</figcaption>
</figure>

<!-- ハイライトを個別に無効化 -->
<pre><code data-no-highlight>そのまま表示したいテキスト</code></pre>
```

- `class="language-xxx"` は highlight.js が言語を判定するために付ける。
  ハイライトを使わない場合でも付けておいて損はない。
- `<pre>` の中は HTML エスケープする（`<` は `&lt;`、`&` は `&amp;`）。
- インデントはタブでもスペースでもよい（表示上は 2 幅）。
- `<figure class="code-block">` の中では `<pre>` を行頭から書く。
  インデントするとコードブロック内に余分な空白が入る。

## 表

表は、短い値を行・列で比較するときだけ使う。セルの内容が 1 フレーズを超える、または
列が多く横長になる場合は、表ではなく後述の `<dl>` / `<dt>` / `<dd>` の定義リストにする。

```html
<table>
  <caption>表 1: 配信基盤候補の比較（2026-08 時点）</caption>
  <thead>
    <tr>
      <th scope="col">候補</th>
      <th scope="col">配信遅延 p99</th>
      <th scope="col" class="num">運用コスト/月</th>
      <th scope="col">評価</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Kafka (MSK)</th>
      <td>48 ms</td>
      <td class="num">¥182,000</td>
      <td><span class="tag is-success is-light">採用</span></td>
    </tr>
  </tbody>
</table>
```

- `doc.js` が横スクロール可能なコンテナで自動的に包む。狭い画面でも崩れない。
- 数値列は `th` / `td` の両方に `class="num"` を付ける（右寄せ・等幅数字）。
- 行見出しには `<th scope="row">` を使う。
- `<caption>` は表の下に出る。表番号を付けると本文から参照しやすい。
- 1 セルの最大幅は 26rem。長い識別子などはセル内で折り返されるが、説明文を収めるための
  上限ではない。
- 本文幅を超える大きな表は `<div class="doc-wide">` で包む。

## カード・数値ハイライト

```html
<h2>結論</h2>
<div class="doc-grid">
  <div class="box">
    <span class="stat">
      <span class="stat-value">3.1 s</span>
      <span class="stat-label">現行の配信遅延（中央値）</span>
    </span>
    <p>5 秒間隔のポーリングが遅延の下限を決める。</p>
  </div>
  <div class="box">
    <span class="stat">
      <span class="stat-value">18</span>
      <span class="stat-label">コンシューマ系統数</span>
    </span>
    <p>各系統がプライマリをポーリングしている。</p>
  </div>
</div>
```

- `.doc-grid` に並べるパネルを置く。高さは行ごとに揃い、幅が足りなくなると自動で折り返す。
- `.stat-value` は単位込みで 8 文字程度、`.stat-label` は数値が何を示すかを書く。
  判断に必要な背景や影響は続く `<p>` に書く。data-overmind ではその段落にコメントできる。
- 数値を伴わないパネルは `.box` に短い見出しと段落を置く。長めのパネルには
  `class="doc-grid doc-grid-2"` で最小幅を 14rem から 16rem に広げられる。

## リスト

```html
<ul><li>箇条書き</li></ul>
<ol><li>手順</li></ol>

<ul class="checklist">
  <li><input type="checkbox" checked disabled> 完了した項目</li>
  <li><input type="checkbox" disabled> 未完了の項目</li>
</ul>

<dl>
  <dt>用語</dt>
  <dd>定義。左に罫線が付く。</dd>
</dl>
```

チェックリストの `input` には `disabled` を付ける（読み物であって入力欄ではない）。

## 引用・折りたたみ

```html
<blockquote>
  <p>引用文。</p>
  <cite>出典・発言者</cite>
</blockquote>

<details>
  <summary>検討したが採用しなかった案</summary>
  <p>折りたたまれる本文。</p>
</details>
```

`<details>` は本筋から外れる補足に使う。重要な結論を畳まない。

## 図・キャプション

```html
<figure>
  <img src="diagram.png" alt="構成図。アプリから Kafka を経由して各コンシューマへ配信される">
  <figcaption>図 1: 全体構成。</figcaption>
</figure>
```

`alt` は必ず書く。図の内容を文で説明する（「構成図」だけでは不足）。

## Mermaid 図

```html
<div class="mermaid">
flowchart LR
  App[アプリケーション] -->|1 トランザクション| DB[(PostgreSQL)]
  DB -->|CDC| K[(Kafka)]
  K --> C1[コンシューマ A]
</div>
```

- `.mermaid` がページにあるときだけライブラリを読み込む。
- 配色はライト / ダークに自動追随する。
- 中身は行頭から書く。インデントすると Mermaid の構文解析が崩れることがある。
- `flowchart` / `sequenceDiagram` / `stateDiagram-v2` / `erDiagram` / `gantt` などが使える。
- 読み込みに失敗してもソースがそのまま表示されるだけで、文書は壊れない。

## 数式

```html
<p>インラインは $E = mc^2$ のように書く。</p>
<p>$$N = \left\lceil \frac{\alpha \cdot T}{T_p} \right\rceil$$</p>
```

- `$…$` `$$…$$` `\(…\)` `\[…\]` に対応。
- `<code>` `<pre>` `<kbd>` の中は対象外。シェル変数 `$HOME` や SQL の `$1` は誤変換されない。
- 数式らしき記法がページにあるときだけ KaTeX を読み込む。

## 脚注

```html
<p>本文<a class="footnote-ref" href="#fn1" id="fnref1">1</a>。</p>

<section class="footnotes">
  <h2 data-toc-skip>脚注</h2>
  <ol>
    <li id="fn1">脚注の本文。<a href="#fnref1">↩</a></li>
  </ol>
</section>
```

脚注セクションの見出しには `data-toc-skip` を付けて目次から外す。

## 文書フッタ

```html
<footer class="doc-footer">
  <p>ドキュメントのタイトル — v1.2</p>
  <p>最終更新: 2026-09-06</p>
</footer>
```

左右に振り分けて表示される。3 つ以上入れると折り返す。

## 目次の制御

- 目次に載るのは `.doc-body` 内の `h2` / `h3`。
- 個別に外すには `<h2 data-toc-skip>脚注</h2>`。
- 見出しが 2 個未満のときは目次要素ごと削除され、1 カラムになる。
- 見出しの `id` は日本語のまま自動生成される（「背景と課題」→ `#背景と課題`）。
  自分で `id` を付けた見出しはその `id` が尊重される。

## 印刷の制御

- 目次・コピーボタン・テーマ切替ボタン・見出しアンカーは印刷されない。
- コードブロック・表・図・コールアウトはページを跨がない。
- 表のヘッダ行はページを跨いで繰り返される。
- 外部リンクは URL が併記される。
- 明示的に改ページしたい位置に `<div class="page-break"></div>` を置く。

## ユーティリティ

| クラス | 効果 |
| --- | --- |
| `.doc-wide` | 本文幅（46rem）を超えて最大 68rem まで広げる |
| `.doc-muted` / `.doc-faint` | 文字色を淡くする |
| `.doc-small` | 文字を小さくする |
| `.doc-center` | 中央寄せ |
| `.doc-nowrap` | 折り返さない |
| `.doc-tnum` | 等幅数字 |
| `.doc-mt-0` / `.doc-mb-0` | 上下の余白を消す |
| `.visually-hidden` | 視覚的に隠す（スクリーンリーダーには読ませる） |

ユーティリティは最後の手段。まず素の HTML で書けないかを考える。

## 既存文書のクラス

これまでの `.doc-body`、`.callout`、`.badge`、`.card` を使った文書も
配布用 `doc.css` で表示できる。既存文書の改稿では、その文書が使っているクラスに合わせる。
