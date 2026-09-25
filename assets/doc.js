/*!
 * AI Doc Template — doc.js
 * 依存なし。<script src="assets/doc.js" defer></script> でも、
 * <script>…中身をそのまま貼り付け…</script> でも動く。
 *
 * 提供する機能:
 *   - 見出しへの id 付与と目次の自動生成 + スクロール追従
 *   - 見出しアンカー（#リンク）
 *   - コードブロックのコピーボタン
 *   - 幅の広い表を横スクロール可能にラップ
 *   - Mermaid 図の描画（必要なときだけ CDN から遅延ロード）
 *   - TeX 数式の描画（KaTeX / MathJax、必要なときだけ遅延ロード）
 *   - highlight.js によるシンタックスハイライト（任意・既定は無効）
 *   - ライト/ダーク切替ボタン（任意・既定は無効）
 *   - data-overmind 接続時の段落・リスト項目レビューと下書き保存（任意・既定は自動検出）
 *
 * 設定は読み込み前に window.DOC_CONFIG を定義して上書きする。
 *   <script>window.DOC_CONFIG = { toc: { enable: false } };</script>
 *   <script src="assets/doc.js" defer></script>
 */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     既定設定
     enable: true | false | 'auto'（'auto' = 対象要素があるときだけ有効）
     ---------------------------------------------------------------------- */
  var DEFAULTS = {
    content: '.doc-body',

    toc: {
      enable: true,
      target: '#doc-toc',
      headings: 'h2, h3',
      title: '目次',
      minHeadings: 2,
      scrollSpy: true
    },

    anchors: { enable: true, headings: 'h2, h3, h4', symbol: '#' },

    copyCode: {
      enable: true,
      label: 'コピー',
      copiedLabel: 'コピーしました',
      failedLabel: '失敗しました'
    },

    tableScroll: { enable: true },

    mermaid: {
      enable: 'auto',
      selector: '.mermaid',
      src: 'https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js',
      config: {}
    },

    math: {
      enable: 'auto',
      engine: 'katex', // 'katex' | 'mathjax'
      katex: {
        js: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js',
        autoRender: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/contrib/auto-render.min.js',
        css: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css',
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '$', right: '$', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
      },
      mathjax: {
        js: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js'
      }
    },

    highlight: {
      enable: false,
      src: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js'
    },

    themeToggle: {
      enable: false,
      storageKey: 'doc-theme',
      lightLabel: 'ライトテーマに切り替え',
      darkLabel: 'ダークテーマに切り替え'
    },

    review: {
      enable: 'auto',
      contextURL: '/_data-overmind/review-context',
      submitURL: '/_data-overmind/reviews',
      selector: 'p, li',
      storagePrefix: 'ai-doc-review:v1:',
      saveDelay: 300,
      labels: {
        menuTitle: 'レビュー',
        openComment: 'この箇所にコメントする',
        editComment: 'この箇所のコメントを編集する',
        commentLabel: 'レビューコメント',
        commentPlaceholder: 'この箇所への指摘や修正案を入力してください',
        deleteComment: 'コメントを削除',
        closeComment: '閉じる',
        submit: 'レビューをサブミットする',
        submitting: '送信中…',
        saved: 'ローカルに保存済み',
        saving: '入力を保存中…',
        storageFailed: 'ローカル保存に失敗しました',
        submitted: 'レビューを保存しました',
        conflict: '文書またはレビューが更新されています。入力は保持されています。再読み込みしてください。',
        submitFailed: 'レビューを保存できませんでした。入力はローカルに保持されています。',
        unavailable: 'レビュー機能に接続できません',
        staleReview: '保存済みレビューは以前の文書に対するものです。',
        mergedDraft: '別の保存内容とローカル下書きを統合しました。確認してから送信してください。'
      }
    }
  };

  /* ----------------------------------------------------------------------
     ユーティリティ
     ---------------------------------------------------------------------- */

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function merge(base, override) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    if (!isPlainObject(override)) return out;
    Object.keys(override).forEach(function (k) {
      out[k] = isPlainObject(base[k]) && isPlainObject(override[k])
        ? merge(base[k], override[k])
        : override[k];
    });
    return out;
  }

  var CFG = merge(DEFAULTS, window.DOC_CONFIG || {});

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function enabled(flag, hasTargets) {
    if (flag === 'auto') return !!hasTargets;
    return !!flag;
  }

  // 同一オリジンや file:// のローカル配置では crossorigin を付けない
  // （付けると file:// で CORS エラーになり読めなくなる）
  function isCrossOrigin(url) {
    if (!/^https?:\/\//i.test(url)) return false;
    try { return new URL(url, location.href).origin !== location.origin; }
    catch (e) { return true; }
  }

  var scriptCache = {};
  function loadScript(src) {
    if (scriptCache[src]) return scriptCache[src];
    scriptCache[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      if (isCrossOrigin(src)) s.crossOrigin = 'anonymous';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('failed to load ' + src)); };
      document.head.appendChild(s);
    });
    return scriptCache[src];
  }

  function loadStyle(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    if (isCrossOrigin(href)) l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  }

  function warn(msg, err) {
    if (window.console && console.warn) console.warn('[doc.js] ' + msg, err || '');
  }

  function prefersDark() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /* ----------------------------------------------------------------------
     見出し id（日本語をそのまま残す安全なスラッグ）
     ---------------------------------------------------------------------- */

  function slugify(text) {
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/[\s　]+/g, '-')
      .replace(/[!"#$%&'()*+,./:;<=>?@[\]^`{|}~。、，．・「」『』（）〔〕【】〈〉《》！？：；]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function ensureHeadingIds(headings) {
    var used = {};
    $$('[id]').forEach(function (el) { used[el.id] = true; });

    headings.forEach(function (h, i) {
      if (h.id) { used[h.id] = true; return; }
      var base = slugify(h.textContent) || ('section-' + (i + 1));
      var id = base;
      var n = 2;
      while (used[id]) { id = base + '-' + n; n += 1; }
      used[id] = true;
      h.id = id;
    });
  }

  /* ----------------------------------------------------------------------
     目次 + スクロール追従
     ---------------------------------------------------------------------- */

  function buildToc(content) {
    var host = $(CFG.toc.target);
    if (!host) return null;

    var headings = $$(CFG.toc.headings, content).filter(function (h) {
      return h.dataset.tocSkip === undefined;
    });

    if (headings.length < CFG.toc.minHeadings) {
      // レビュー機能が後からこの領域を使うことがあるため、空要素として残す。
      // CSS の :empty により、何も追加されなければ従来どおり幅を取らない。
      while (host.firstChild) host.removeChild(host.firstChild);
      return null;
    }

    ensureHeadingIds(headings);

    var scroller = document.createElement('div');
    scroller.className = 'doc-toc-scroller';

    var rootList = document.createElement('ul');
    var currentSub = null;

    headings.forEach(function (h) {
      var level = Number(h.tagName.charAt(1));
      var li = document.createElement('li');
      li.dataset.level = String(level);

      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/^#\s*/, '').trim();
      li.appendChild(a);

      if (level <= 2 || !rootList.lastElementChild) {
        rootList.appendChild(li);
        currentSub = null;
      } else {
        if (!currentSub) {
          currentSub = document.createElement('ul');
          rootList.lastElementChild.appendChild(currentSub);
        }
        currentSub.appendChild(li);
      }
    });

    scroller.appendChild(rootList);

    var nav = document.createElement('nav');
    nav.setAttribute('aria-label', CFG.toc.title || '目次');

    // 広い画面では常に開いたサイドバー、狭い画面では畳めるアコーディオンにする
    var details = document.createElement('details');
    details.className = 'doc-toc-details';

    var summary = document.createElement('summary');
    summary.className = 'doc-toc-title';
    summary.textContent = CFG.toc.title || '目次';

    details.appendChild(summary);
    details.appendChild(scroller);
    nav.appendChild(details);
    host.appendChild(nav);

    var wide = window.matchMedia('(min-width: 60rem)');
    var syncOpen = function () { details.open = wide.matches; };
    syncOpen();
    if (wide.addEventListener) wide.addEventListener('change', syncOpen);
    else if (wide.addListener) wide.addListener(syncOpen);

    return { host: host, headings: headings, links: $$('a', rootList) };
  }

  function setupScrollSpy(toc) {
    if (!toc || !CFG.toc.scrollSpy) return;

    var linkById = {};
    toc.links.forEach(function (a) {
      linkById[decodeURIComponent(a.getAttribute('href').slice(1))] = a;
    });

    var active = null;
    var ticking = false;

    function update() {
      ticking = false;
      var offset = 100;
      var current = toc.headings[0];

      for (var i = 0; i < toc.headings.length; i += 1) {
        if (toc.headings[i].getBoundingClientRect().top <= offset) {
          current = toc.headings[i];
        } else {
          break;
        }
      }

      // 最下部まで来たら最後の見出しを選択状態にする
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        current = toc.headings[toc.headings.length - 1];
      }

      var link = current && linkById[current.id];
      if (link === active) return;
      if (active) active.removeAttribute('aria-current');
      if (link) {
        link.setAttribute('aria-current', 'true');
        // サイドバー内で見えるようにスクロール
        var box = toc.host.getBoundingClientRect();
        var lb = link.getBoundingClientRect();
        if (lb.top < box.top || lb.bottom > box.bottom) {
          link.scrollIntoView({ block: 'nearest' });
        }
      }
      active = link || null;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ----------------------------------------------------------------------
     見出しアンカー
     ---------------------------------------------------------------------- */

  function addHeadingAnchors(content) {
    var headings = $$(CFG.anchors.headings, content);
    ensureHeadingIds(headings);
    headings.forEach(function (h) {
      if ($('.heading-anchor', h)) return;
      var a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = '#' + h.id;
      a.textContent = CFG.anchors.symbol;
      a.setAttribute('aria-label', h.textContent.trim() + ' へのリンク');
      h.insertBefore(a, h.firstChild);
    });
  }

  /* ----------------------------------------------------------------------
     コードのコピーボタン
     ---------------------------------------------------------------------- */

  function addCopyButtons(content) {
    $$('pre > code', content).forEach(function (code) {
      var pre = code.parentElement;
      var host = pre.closest('.code-block');

      if (!host) {
        // .code-block でくるまれていない場合は相対配置のラッパを足す
        host = document.createElement('div');
        host.className = 'doc-copy-wrap';
        pre.parentNode.insertBefore(host, pre);
        host.appendChild(pre);
      }
      if ($('.doc-copy-btn', host)) return;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'doc-copy-btn';
      btn.textContent = CFG.copyCode.label;
      btn.setAttribute('aria-label', 'コードをコピー');

      btn.addEventListener('click', function () {
        var text = code.innerText;
        var done = function (ok) {
          btn.textContent = ok ? CFG.copyCode.copiedLabel : CFG.copyCode.failedLabel;
          btn.dataset.copied = ok ? 'true' : 'false';
          window.setTimeout(function () {
            btn.textContent = CFG.copyCode.label;
            delete btn.dataset.copied;
          }, 1600);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); },
            function () { done(fallbackCopy(text)); });
        } else {
          done(fallbackCopy(text));
        }
      });

      host.appendChild(btn);
    });
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  /* ----------------------------------------------------------------------
     表の横スクロール化
     ---------------------------------------------------------------------- */

  function wrapTables(content) {
    $$('table', content).forEach(function (table) {
      if (table.closest('.doc-table-scroll')) return;
      var wrap = document.createElement('div');
      wrap.className = 'doc-table-scroll';
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('role', 'region');
      var cap = $('caption', table);
      wrap.setAttribute('aria-label', cap ? cap.textContent.trim() : '表');
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  /* ----------------------------------------------------------------------
     Mermaid
     ---------------------------------------------------------------------- */

  function initMermaid(nodes) {
    return loadScript(CFG.mermaid.src).then(function () {
      if (!window.mermaid) throw new Error('mermaid not available');
      var cfg = merge({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: prefersDark() ? 'dark' : 'default',
        fontFamily: getComputedStyle(document.body).fontFamily
      }, CFG.mermaid.config);
      window.mermaid.initialize(cfg);
      return window.mermaid.run({ nodes: nodes });
    }).catch(function (e) {
      warn('Mermaid の描画に失敗しました。ソースをそのまま表示します。', e);
      nodes.forEach(function (n) { n.setAttribute('data-processed', 'failed'); });
    });
  }

  /* ----------------------------------------------------------------------
     数式（KaTeX / MathJax）
     ---------------------------------------------------------------------- */

  var MATH_PATTERN = /(\$\$[\s\S]+?\$\$)|(\\\([\s\S]+?\\\))|(\\\[[\s\S]+?\\\])|(\$[^$\n]+\$)/;

  function hasMath(content) {
    if ($('.math, [data-math]', content)) return true;
    // code / pre の中の $1, $HOME などを数式と誤検出しないよう除外して判定する
    var clone = content.cloneNode(true);
    $$('pre, code, kbd, samp, script, style', clone).forEach(function (el) { el.remove(); });
    return MATH_PATTERN.test(clone.textContent || '');
  }

  function renderMathKatex(content) {
    var k = CFG.math.katex;
    loadStyle(k.css);
    return loadScript(k.js)
      .then(function () { return loadScript(k.autoRender); })
      .then(function () {
        if (!window.renderMathInElement) throw new Error('KaTeX auto-render not available');
        window.renderMathInElement(content, {
          delimiters: k.delimiters,
          ignoredTags: k.ignoredTags,
          throwOnError: false
        });
      })
      .catch(function (e) { warn('KaTeX の読み込みに失敗しました。', e); });
  }

  function renderMathMathjax() {
    window.MathJax = merge({
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
      },
      options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }
    }, window.MathJax || {});
    return loadScript(CFG.math.mathjax.js)
      .catch(function (e) { warn('MathJax の読み込みに失敗しました。', e); });
  }

  /* ----------------------------------------------------------------------
     シンタックスハイライト（任意）
     ---------------------------------------------------------------------- */

  function initHighlight(content) {
    return loadScript(CFG.highlight.src).then(function () {
      if (!window.hljs) throw new Error('highlight.js not available');
      $$('pre > code', content).forEach(function (block) {
        if (block.dataset.noHighlight !== undefined) return;
        window.hljs.highlightElement(block);
      });
    }).catch(function (e) { warn('highlight.js の読み込みに失敗しました。', e); });
  }

  /* ----------------------------------------------------------------------
     段落・リスト項目レビュー（data-overmind と同一オリジンで開いたときだけ有効）
     ---------------------------------------------------------------------- */

  var reviewState = null;
  var reviewInitialization = null;

  function reviewEnabled() {
    if (CFG.review.enable === false) return false;
    return location.protocol === 'http:' || location.protocol === 'https:';
  }

  function reviewURL(base) {
    var url = new URL(base, location.href);
    url.searchParams.set('document', location.pathname);
    return url.toString();
  }

  function reviewError(response, body) {
    var error = new Error((body && body.error && body.error.message) || ('HTTP ' + response.status));
    error.status = response.status;
    error.code = body && body.error && body.error.code;
    error.details = body && body.error && body.error.details;
    return error;
  }

  function readReviewResponse(response) {
    return response.json().catch(function () { return null; }).then(function (body) {
      if (!response.ok) throw reviewError(response, body);
      return body;
    });
  }

  function fetchReviewContext() {
    return window.fetch(reviewURL(CFG.review.contextURL), {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    }).then(readReviewResponse);
  }

  function normalizedReviewText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function utf8Length(value) {
    return encodeURIComponent(value).replace(/%[0-9A-F]{2}/gi, 'x').length;
  }

  function clipReviewText(value, maxBytes) {
    value = String(value || '');
    if (utf8Length(value) <= maxBytes) return value;
    var output = '';
    var used = 0;
    for (var i = 0; i < value.length; i += 1) {
      var character = value.charAt(i);
      var code = value.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < value.length) {
        character += value.charAt(i + 1);
        i += 1;
      }
      var bytes = utf8Length(character);
      if (used + bytes > maxBytes) break;
      output += character;
      used += bytes;
    }
    return output;
  }

  function clippedReviewID(value) {
    var id = clipReviewText(normalizedReviewText(value), 220);
    return id || 'preamble';
  }

  function createReviewID() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'comment-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function reviewTimestamp() { return new Date().toISOString(); }

  function reviewElementText(element) {
    if (element.tagName !== 'LI') return element.textContent;
    var clone = element.cloneNode(true);
    $$('ol, ul', clone).forEach(function (nestedList) { nestedList.remove(); });
    return clone.textContent;
  }

  function createReviewBlocks(content) {
    var requested = $$(CFG.review.selector, content).filter(function (element) {
      // A list item containing paragraphs is represented by those paragraphs,
      // avoiding two controls for the same visible text.
      return element.tagName !== 'LI' || !element.querySelector('p');
    });
    var allowed = [];
    var requestedSet = requested;
    var currentSection = 'preamble';
    var sectionIndexes = {};
    var usedBlockIDs = {};

    $$('h2, h3, ' + CFG.review.selector, content).forEach(function (element) {
      if (element.matches('h2, h3')) {
        currentSection = clippedReviewID(element.id || element.textContent);
        sectionIndexes = {};
        return;
      }
      if (requestedSet.indexOf(element) < 0) return;
      var paragraphIndex = requestedSet.indexOf(element);
      var elementType = element.tagName.toLowerCase();
      var sectionIndex = sectionIndexes[elementType] || 0;
      var explicit = element.getAttribute('data-review-id');
      var baseBlockID = explicit ? clippedReviewID(explicit) : clippedReviewID(currentSection + '::' + elementType + '-' + sectionIndex);
      var blockID = baseBlockID;
      var duplicate = 2;
      while (usedBlockIDs[blockID]) {
        blockID = clippedReviewID(baseBlockID + '-' + duplicate);
        duplicate += 1;
      }
      usedBlockIDs[blockID] = true;
      allowed.push({
        element: element,
        anchor: {
          id: blockID,
          sectionId: currentSection,
          paragraphIndex: paragraphIndex,
          sectionParagraphIndex: sectionIndex,
          quote: clipReviewText(normalizedReviewText(reviewElementText(element)), 32000),
          textSHA256: ''
        },
        trigger: null,
        panel: null,
        textarea: null
      });
      sectionIndexes[elementType] = sectionIndex + 1;
    });
    return allowed.filter(function (block) { return block.anchor.quote !== ''; });
  }

  function reviewStorageKey(context) {
    return CFG.review.storagePrefix + encodeURIComponent(context.source.url || location.pathname) + ':' + context.source.sha256;
  }

  function getLocalReviewDraft(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      var draft = JSON.parse(raw);
      if (!draft || draft.schemaVersion !== 1 || !Array.isArray(draft.comments)) return null;
      return draft;
    } catch (e) {
      return null;
    }
  }

  function reviewCommentMap(comments) {
    var result = {};
    (comments || []).forEach(function (comment) {
      if (!comment || !comment.id || !comment.block || !comment.block.id) return;
      result[comment.id] = comment;
    });
    return result;
  }

  function mergeReviewComments(serverComments, draftComments) {
    var merged = reviewCommentMap(serverComments);
    Object.keys(reviewCommentMap(draftComments)).forEach(function (id) {
      var draft = reviewCommentMap(draftComments)[id];
      var saved = merged[id];
      if (!saved || String(draft.updatedAt || '') >= String(saved.updatedAt || '')) merged[id] = draft;
    });
    return merged;
  }

  function commentsForReviewState(state) {
    return Object.keys(state.comments).map(function (id) { return state.comments[id]; })
      .filter(function (comment) { return normalizedReviewText(comment.comment) !== ''; })
      .sort(function (a, b) {
        return a.block.paragraphIndex - b.block.paragraphIndex || a.createdAt.localeCompare(b.createdAt);
      });
  }

  function commentForBlock(state, blockID) {
    var found = null;
    Object.keys(state.comments).some(function (id) {
      if (state.comments[id].block.id !== blockID) return false;
      found = state.comments[id];
      return true;
    });
    return found;
  }

  function setReviewStatus(state, text, kind) {
    state.status.textContent = text || '';
    if (kind) state.status.dataset.status = kind;
    else delete state.status.dataset.status;
  }

  function syncReviewMenu(state) {
    var count = commentsForReviewState(state).length;
    state.count.textContent = count + ' 件のコメント';
    state.submit.disabled = state.submitting || (count === 0 && !state.context.review.revision);
    state.submit.textContent = state.submitting ? CFG.review.labels.submitting : CFG.review.labels.submit;
  }

  function flushReviewDraft(state) {
    if (state.saveTimer) {
      window.clearTimeout(state.saveTimer);
      state.saveTimer = null;
    }
    if (!state.dirty) {
      syncReviewMenu(state);
      return;
    }
    var draft = {
      schemaVersion: 1,
      sourceSHA256: state.context.source.sha256,
      baseRevision: state.context.review.revision,
      comments: commentsForReviewState(state),
      updatedAt: reviewTimestamp()
    };
    try {
      window.localStorage.setItem(state.storageKey, JSON.stringify(draft));
      state.dirty = false;
      state.storageFailed = false;
      setReviewStatus(state, CFG.review.labels.saved, 'saved');
    } catch (e) {
      state.storageFailed = true;
      setReviewStatus(state, CFG.review.labels.storageFailed, 'error');
    }
    syncReviewMenu(state);
  }

  function scheduleReviewDraft(state) {
    if (state.saveTimer) window.clearTimeout(state.saveTimer);
    setReviewStatus(state, CFG.review.labels.saving, 'saving');
    state.saveTimer = window.setTimeout(function () { flushReviewDraft(state); }, CFG.review.saveDelay);
  }

  function syncReviewTrigger(state, block) {
    var comment = commentForBlock(state, block.anchor.id);
    var hasComment = !!(comment && normalizedReviewText(comment.comment));
    block.trigger.dataset.hasComment = hasComment ? 'true' : 'false';
    block.trigger.setAttribute('aria-label', hasComment ? CFG.review.labels.editComment : CFG.review.labels.openComment);
    block.trigger.title = block.trigger.getAttribute('aria-label');
  }

  function closeReviewPanel(state, block, restoreFocus) {
    if (!block || !block.panel || block.panel.hidden) return;
    block.panel.hidden = true;
    block.trigger.setAttribute('aria-expanded', 'false');
    if (state.openBlock === block) state.openBlock = null;
    if (restoreFocus) block.trigger.focus();
  }

  function openReviewPanel(state, block) {
    if (state.openBlock && state.openBlock !== block) closeReviewPanel(state, state.openBlock, false);
    var comment = commentForBlock(state, block.anchor.id);
    block.textarea.value = comment ? comment.comment : '';
    block.panel.hidden = false;
    block.trigger.setAttribute('aria-expanded', 'true');
    state.openBlock = block;
    block.textarea.focus();
  }

  function upsertReviewComment(state, block, text) {
    var existing = commentForBlock(state, block.anchor.id);
    var normalized = normalizedReviewText(text);
    if (!normalized) {
      if (existing) delete state.comments[existing.id];
    } else if (existing) {
      existing.comment = text;
      existing.block = block.anchor;
      existing.updatedAt = reviewTimestamp();
    } else {
      var now = reviewTimestamp();
      var id = createReviewID();
      state.comments[id] = {
        id: id,
        block: block.anchor,
        comment: text,
        createdAt: now,
        updatedAt: now
      };
    }
    state.dirty = true;
    syncReviewTrigger(state, block);
    syncReviewMenu(state);
    scheduleReviewDraft(state);
  }

  function createReviewPanel(state, block, index) {
    var wrapper;
    if (block.element.tagName === 'LI') {
      wrapper = block.element;
      wrapper.classList.add('doc-review-block', 'doc-review-list-item');
    } else {
      wrapper = document.createElement('div');
      wrapper.className = 'doc-review-block';
      block.element.parentNode.insertBefore(wrapper, block.element);
      wrapper.appendChild(block.element);
    }

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'doc-review-trigger';
    trigger.textContent = '…';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'doc-review-panel-' + index);
    wrapper.appendChild(trigger);

    var panel = document.createElement('div');
    panel.className = 'doc-review-panel';
    panel.id = 'doc-review-panel-' + index;
    panel.hidden = true;

    var quote = document.createElement('p');
    quote.className = 'doc-review-quote';
    quote.textContent = '「' + block.anchor.quote.slice(0, 160) + (block.anchor.quote.length > 160 ? '…' : '') + '」';
    panel.appendChild(quote);

    var label = document.createElement('label');
    label.className = 'doc-review-label';
    label.htmlFor = 'doc-review-text-' + index;
    label.textContent = CFG.review.labels.commentLabel;
    panel.appendChild(label);

    var textarea = document.createElement('textarea');
    textarea.id = 'doc-review-text-' + index;
    textarea.className = 'doc-review-textarea';
    textarea.rows = 4;
    textarea.maxLength = 16384;
    textarea.placeholder = CFG.review.labels.commentPlaceholder;
    panel.appendChild(textarea);

    var actions = document.createElement('div');
    actions.className = 'doc-review-panel-actions';
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'doc-review-delete';
    remove.textContent = CFG.review.labels.deleteComment;
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'doc-review-close';
    close.textContent = CFG.review.labels.closeComment;
    actions.appendChild(remove);
    actions.appendChild(close);
    panel.appendChild(actions);
    wrapper.appendChild(panel);

    block.trigger = trigger;
    block.panel = panel;
    block.textarea = textarea;

    trigger.addEventListener('click', function () {
      if (panel.hidden) openReviewPanel(state, block);
      else closeReviewPanel(state, block, true);
    });
    textarea.addEventListener('input', function () {
      var clipped = clipReviewText(textarea.value, 16384);
      if (clipped !== textarea.value) textarea.value = clipped;
      upsertReviewComment(state, block, textarea.value);
    });
    textarea.addEventListener('blur', function () { flushReviewDraft(state); });
    textarea.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    textarea.addEventListener('keyup', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        flushReviewDraft(state);
        closeReviewPanel(state, block, false);
        window.setTimeout(function () { block.trigger.focus(); }, 100);
      }
    });
    close.addEventListener('click', function () {
      flushReviewDraft(state);
      closeReviewPanel(state, block, true);
    });
    remove.addEventListener('click', function () {
      textarea.value = '';
      upsertReviewComment(state, block, '');
      closeReviewPanel(state, block, true);
    });
    syncReviewTrigger(state, block);
  }

  function createReviewMenu(state) {
    var host = $(CFG.toc.target);
    if (!host) return false;

    var menu = document.createElement('section');
    menu.className = 'doc-review-menu';
    var title = document.createElement('h2');
    title.className = 'doc-review-menu-title';
    title.textContent = CFG.review.labels.menuTitle;
    var count = document.createElement('p');
    count.className = 'doc-review-count';
    var status = document.createElement('p');
    status.className = 'doc-review-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    var submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'doc-review-submit';

    menu.appendChild(title);
    menu.appendChild(count);
    menu.appendChild(status);
    menu.appendChild(submit);
    host.appendChild(menu);
    state.menu = menu;
    state.count = count;
    state.status = status;
    state.submit = submit;
    submit.addEventListener('click', function () { submitReview(state); });
    syncReviewMenu(state);
    return true;
  }

  function showReviewUnavailable(message) {
    var host = $(CFG.toc.target);
    if (!host) return;
    var menu = document.createElement('section');
    menu.className = 'doc-review-menu';
    var title = document.createElement('h2');
    title.className = 'doc-review-menu-title';
    title.textContent = CFG.review.labels.menuTitle;
    var status = document.createElement('p');
    status.className = 'doc-review-status';
    status.dataset.status = 'error';
    status.textContent = message || CFG.review.labels.unavailable;
    menu.appendChild(title);
    menu.appendChild(status);
    host.appendChild(menu);
  }

  function submitReview(state) {
    if (state.submitting || state.submit.disabled) return;
    flushReviewDraft(state);
    state.submitting = true;
    syncReviewMenu(state);

    var payload = {
      schemaVersion: 1,
      sourceSHA256: state.context.source.sha256,
      baseRevision: state.context.review.revision,
      documentTitle: clipReviewText(document.title, 1000),
      comments: commentsForReviewState(state)
    };

    window.fetch(reviewURL(CFG.review.submitURL), {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Data-Overmind-Review': '1'
      },
      body: JSON.stringify(payload)
    }).then(readReviewResponse).then(function (context) {
      state.context = context;
      state.comments = reviewCommentMap(context.review.document ? context.review.document.comments : []);
      state.dirty = false;
      try { window.localStorage.removeItem(state.storageKey); } catch (e) { /* noop */ }
      state.blocks.forEach(function (block) { syncReviewTrigger(state, block); });
      setReviewStatus(state, CFG.review.labels.submitted + ': ' + context.review.path, 'success');
    }).catch(function (error) {
      if (error.status === 409) setReviewStatus(state, CFG.review.labels.conflict, 'error');
      else setReviewStatus(state, CFG.review.labels.submitFailed, 'error');
      warn('レビューの保存に失敗しました。', error);
    }).then(function () {
      state.submitting = false;
      syncReviewMenu(state);
    });
  }

  function initReview(content) {
    if (reviewState) return Promise.resolve(reviewState);
    if (reviewInitialization) return reviewInitialization;
    if (!reviewEnabled() || typeof window.fetch !== 'function') {
      if (CFG.review.enable === true) showReviewUnavailable(CFG.review.labels.unavailable);
      return Promise.resolve(null);
    }

    reviewInitialization = fetchReviewContext().then(function (context) {
      var savedDocument = context.review.document;
      var serverComments = [];
      var stale = false;
      if (savedDocument && savedDocument.source && savedDocument.source.sha256 === context.source.sha256) {
        serverComments = savedDocument.comments || [];
      } else if (savedDocument) {
        stale = true;
      }
      var storageKey = reviewStorageKey(context);
      var draft = getLocalReviewDraft(storageKey);
      var draftMatchesRevision = !!draft && (draft.baseRevision || null) === (context.review.revision || null);
      var state = {
        context: context,
        storageKey: storageKey,
        comments: draftMatchesRevision
          ? reviewCommentMap(draft.comments)
          : mergeReviewComments(serverComments, draft ? draft.comments : []),
        blocks: createReviewBlocks(content),
        menu: null,
        count: null,
        status: null,
        submit: null,
        submitting: false,
        dirty: false,
        storageFailed: false,
        saveTimer: null,
        openBlock: null
      };
      reviewState = state;
      if (!createReviewMenu(state)) return null;
      state.blocks.forEach(function (block, index) { createReviewPanel(state, block, index); });
      if (stale) setReviewStatus(state, CFG.review.labels.staleReview, 'error');
      else if (draft && !draftMatchesRevision) setReviewStatus(state, CFG.review.labels.mergedDraft, 'error');
      else if (draft) setReviewStatus(state, CFG.review.labels.saved, 'saved');
      else if (context.review.revision) setReviewStatus(state, CFG.review.labels.submitted, 'success');
      else setReviewStatus(state, CFG.review.labels.saved, 'saved');
      syncReviewMenu(state);

      window.addEventListener('pagehide', function () {
        if (state.dirty) flushReviewDraft(state);
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden' && state.dirty) flushReviewDraft(state);
      });
      return state;
    }).catch(function (error) {
      if (CFG.review.enable === true) showReviewUnavailable(CFG.review.labels.unavailable);
      if (CFG.review.enable === true || (error && error.status && error.status !== 404)) {
        warn('レビュー機能の初期化に失敗しました。', error);
      }
      return null;
    }).then(function (state) {
      reviewInitialization = null;
      return state;
    });
    return reviewInitialization;
  }

  function getReviewStatus() {
    if (!reviewState) return { active: false };
    return {
      active: true,
      sourcePath: reviewState.context.source.path,
      reviewPath: reviewState.context.review.path,
      commentCount: commentsForReviewState(reviewState).length,
      submitting: reviewState.submitting,
      storageFailed: reviewState.storageFailed
    };
  }

  /* ----------------------------------------------------------------------
     テーマ切替（任意）
     ---------------------------------------------------------------------- */

  function initThemeToggle() {
    var key = CFG.themeToggle.storageKey;
    var stored = null;
    try { stored = window.localStorage.getItem(key); } catch (e) { /* noop */ }
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'doc-theme-toggle';
    btn.textContent = '◐';

    function sync() {
      var dark = prefersDark();
      btn.setAttribute('aria-label', dark ? CFG.themeToggle.lightLabel : CFG.themeToggle.darkLabel);
      btn.title = btn.getAttribute('aria-label');
    }

    btn.addEventListener('click', function () {
      var next = prefersDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { window.localStorage.setItem(key, next); } catch (e) { /* noop */ }
      sync();
    });

    sync();
    document.body.appendChild(btn);
  }

  /* ----------------------------------------------------------------------
     起動
     ---------------------------------------------------------------------- */

  function init() {
    var content = $(CFG.content) || document.body;

    if (CFG.anchors.enable) {
      try { addHeadingAnchors(content); } catch (e) { warn('見出しアンカー', e); }
    }
    if (CFG.toc.enable) {
      try { setupScrollSpy(buildToc(content)); } catch (e) { warn('目次', e); }
    }
    if (CFG.tableScroll.enable) {
      try { wrapTables(content); } catch (e) { warn('表のラップ', e); }
    }
    if (CFG.copyCode.enable) {
      try { addCopyButtons(content); } catch (e) { warn('コピーボタン', e); }
    }
    if (CFG.themeToggle.enable) {
      try { initThemeToggle(); } catch (e) { warn('テーマ切替', e); }
    }
    if (CFG.review.enable !== false) {
      initReview(content);
    }

    var mermaidNodes = $$(CFG.mermaid.selector, content);
    if (enabled(CFG.mermaid.enable, mermaidNodes.length)) {
      initMermaid(mermaidNodes);
    }

    if (enabled(CFG.math.enable, hasMath(content))) {
      if (CFG.math.engine === 'mathjax') renderMathMathjax();
      else renderMathKatex(content);
    }

    if (CFG.highlight.enable) {
      initHighlight(content);
    }

    document.documentElement.setAttribute('data-doc-ready', 'true');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 動的にコンテンツを差し替えたときに再実行できるよう公開しておく
  window.DocTemplate = { init: init, config: CFG, reviewStatus: getReviewStatus };
})();
