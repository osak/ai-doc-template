# CDN 向けリリース手順

`assets/doc.css` と `assets/doc.js` を GitHub の同じリリースタグから jsDelivr で配信する。
この手順は、リリースを依頼された担当者と AI Agent が使う。
HTML の生成だけを依頼された場合はリリースを行わない。

## 配信の約束

- 配信元は公開 GitHub リポジトリ `osak/ai-doc-template`。非公開の場合は jsDelivr の
  GitHub URL を使わず、公開用リポジトリなど別の配信元を決める。
- タグは `vMAJOR.MINOR.PATCH` 形式とする（例: `v0.1.0`）。タグは公開後に動かさない。
  内容を修正するときは新しいバージョンを発行する。
- ひとつの文書では CSS と JS に同じタグを指定する。既存の文書は URL を更新するまで
  その版を使い続ける。`@main` やタグ省略の URL は配布用に使わない。
- `template.html` と単一ファイル化の元 HTML はローカルの `assets/` 参照を維持する。
  CDN URL は配布先の HTML で指定する。単一ファイル化スクリプトは外部 URL を埋め込まない。

jsDelivr は GitHub のタグ、コミット、ブランチを参照できる。固定バージョンのファイルは
長期間キャッシュされるため、公開済みタグの差し替えでは利用者側の内容を更新できない。
仕様: [GitHub URL](https://github.com/jsdelivr/jsdelivr#github)・
[キャッシュ](https://github.com/jsdelivr/jsdelivr#caching)。

## 1. リリース候補を準備する

1. リリース対象の変更をレビューし、`main` に取り込む。未コミットの変更を勝手に
   リリースへ含めない。リリース担当の作業ツリーに未コミットの変更がある場合は、
   その扱いを決めてから続ける。
2. GitHub 上でリポジトリが公開されていることを確認する。`gh` を使える場合は
   `gh repo view osak/ai-doc-template --json visibility` で確認できる。
3. `git fetch origin main --tags` の後、作業ツリーがクリーンで、現在の `main` が
   `origin/main` と一致することを確認する。リリース候補のコミット SHA を記録する。
   確認には `git status --porcelain`、`git branch --show-current`、
   `git rev-parse HEAD`、`git rev-parse origin/main` を使える。一致しない場合は
   リモートの変更を確認し、最新の `main` から準備をやり直す。
4. 既存タグと変更内容を確認し、次の `vMAJOR.MINOR.PATCH` を決める。
   互換性を壊す変更は major、互換性のある機能追加は minor、修正は patch を目安とする。
   `0.x` の間は破壊的変更を minor に含める場合があるので、その場合はリリースの説明に明記する。
   候補タグがローカルにもリモートにも存在しないことを `git tag --list vX.Y.Z` と
   `git ls-remote --tags origin refs/tags/vX.Y.Z` で確認する。
5. 前回タグがある場合は `git diff --check <前回タグ> HEAD` でリリース差分の
   空白エラーを確認する。続けて少なくとも次を実行する。失敗したらタグを作らず修正する。

```bash
node --check assets/doc.js
node scripts/build-standalone.mjs example.html
```

生成された `dist/example.standalone.html` に `doc.css` と `doc.js` が埋め込まれ、
CDN の URL に置き換わっていないことを確認する。必要な場合は変更内容に応じて
表示やレビュー機能も確認する。

## 2. タグを公開する

公開の指示がある場合に限り、検証した `main` のコミットへ注釈付きタグを作る。
`vX.Y.Z` は決めたバージョンに置き換える。

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

タグの push が失敗した場合は、原因を確認してから再試行する。公開済みタグを
`--force` で更新しない。必要な修正は新しいバージョンとして公開する。

## 3. CDN を検証して利用者へ案内する

タグの公開後、次の 2 つの URL が取得でき、内容がタグ内のファイルと一致することを確認する。

```text
https://cdn.jsdelivr.net/gh/osak/ai-doc-template@vX.Y.Z/assets/doc.css
https://cdn.jsdelivr.net/gh/osak/ai-doc-template@vX.Y.Z/assets/doc.js
```

例えば `vX.Y.Z` を実際のタグに置き換え、以下を実行する。途中で失敗した場合も
検証成功として扱わない。

```bash
(
  set -e
  release_tag=vX.Y.Z
  release_check_dir=$(mktemp -d)
  trap 'rm -rf "$release_check_dir"' EXIT
  for asset in doc.css doc.js; do
    curl -fLsS "https://cdn.jsdelivr.net/gh/osak/ai-doc-template@${release_tag}/assets/${asset}" \
      -o "${release_check_dir}/${asset}"
    git show "${release_tag}:assets/${asset}" | cmp - "${release_check_dir}/${asset}"
  done
)
```

取得失敗や不一致があれば、成功として案内せず原因を調べる。公開直後に取得できない場合は
少し待って再確認する。タグ内の内容が誤っている場合はタグを動かさず、新しい版を発行する。

確認後、タグ名、対象コミット、CSS と JS の URL、実施した検証を利用者へ伝える。
文書を新しい版へ移すときは、両方の URL のタグを同時に変更して表示を確認する。
