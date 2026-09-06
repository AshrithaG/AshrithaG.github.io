/* ============================================================
   Project detail page: loads projects/<slug>/<slug>.md and renders it.
   Self-contained markdown renderer, no external dependency.

   Supported: # h1-h6, paragraphs, **bold**, *italic*, `code`,
   [links](url), ![images](src), - and 1. lists (nested one level),
   > blockquotes, --- rules, | tables |, ```fenced code```,
   and raw HTML blocks (a raw HTML block must contain no blank line).
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- inline ---------------- */
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inline(s) {
    var code = [];
    s = s.replace(/`([^`]+)`/g, function (_, c) {
      code.push('<code>' + esc(c) + '</code>');
      return '%%C' + (code.length - 1) + '%%';
    });
    s = s
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
        function (_, alt, src, t) {
          return '<img alt="' + alt + '" src="' + src + '"' + (t ? ' title="' + t + '"' : '') + '>';
        })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, txt, href) {
        var ext = /^(https?:)?\/\//i.test(href) ? ' target="_blank" rel="noopener"' : '';
        return '<a href="' + href + '"' + ext + '>' + txt + '</a>';
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>')
      .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
    return s.replace(/%%C(\d+)%%/g, function (_, i) { return code[+i]; });
  }

  /* ---------------- block helpers ---------------- */
  var RE_HEAD  = /^(#{1,6})\s+(.*)$/;
  var RE_HR    = /^(-{3,}|\*{3,}|_{3,})\s*$/;
  var RE_LI    = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  var RE_HTML  = /^<(?:\/|!)?[a-zA-Z]/;
  var RE_FENCE = /^\s*```/;

  function isBlockStart(l) {
    return RE_HEAD.test(l) || RE_HR.test(l) || RE_LI.test(l) ||
           RE_HTML.test(l) || RE_FENCE.test(l) || /^\s*>/.test(l) || /^\s*\|/.test(l);
  }

  function indentOf(l) {
    return (/^([ \t]*)/.exec(l) || ['', ''])[1].replace(/\t/g, '    ').length;
  }

  function buildList(block) {
    var first = RE_LI.exec(block[0]);
    var base = indentOf(block[0]);
    var ordered = /\d/.test(first[2]);
    var items = [];
    var cur = null;

    block.forEach(function (l) {
      var m = RE_LI.exec(l);
      if (m && indentOf(l) <= base) {
        if (cur) items.push(cur);
        cur = { head: m[3], sub: [] };
      } else if (cur) {
        cur.sub.push(l.replace(/^ {1,4}|^\t/, ''));
      }
    });
    if (cur) items.push(cur);

    var html = items.map(function (it) {
      var body = inline(it.head);
      var rest = it.sub.filter(function (x) { return x.trim() !== ''; });
      if (rest.length) body += blocks(it.sub);
      return '<li>' + body + '</li>';
    }).join('');
    return ordered ? '<ol>' + html + '</ol>' : '<ul>' + html + '</ul>';
  }

  function buildTable(rows, align) {
    function cells(line) {
      return line.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
    }
    var head = cells(rows[0]);
    var body = rows.slice(1).map(cells);
    var h = '<thead><tr>' + head.map(function (c, i) {
      return '<th' + (align[i] ? ' style="text-align:' + align[i] + '"' : '') + '>' + inline(c) + '</th>';
    }).join('') + '</tr></thead>';
    var b = '<tbody>' + body.map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        return '<td' + (align[i] ? ' style="text-align:' + align[i] + '"' : '') + '>' + inline(c) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return '<div class="table-scroll"><table>' + h + b + '</table></div>';
  }

  /* ---------------- block scanner ---------------- */
  function blocks(lines) {
    if (typeof lines === 'string') lines = lines.split('\n');
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (line.trim() === '') { i++; continue; }

      /* fenced code */
      if (RE_FENCE.test(line)) {
        var buf = [];
        i++;
        while (i < lines.length && !RE_FENCE.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }

      /* raw HTML block, runs to the next blank line */
      if (RE_HTML.test(line)) {
        var hb = [];
        while (i < lines.length && lines[i].trim() !== '') { hb.push(lines[i]); i++; }
        out.push(hb.join('\n'));
        continue;
      }

      /* horizontal rule, checked before list so --- is not read as a bullet */
      if (RE_HR.test(line)) { out.push('<hr>'); i++; continue; }

      /* heading */
      var mh = RE_HEAD.exec(line);
      if (mh) {
        var lv = Math.min(mh[1].length, 6);
        out.push('<h' + lv + '>' + inline(mh[2]) + '</h' + lv + '>');
        i++;
        continue;
      }

      /* table */
      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        var align = lines[i + 1].trim().replace(/^\||\|$/g, '').split('|').map(function (c) {
          c = c.trim();
          if (/^:.*:$/.test(c)) return 'center';
          if (/:$/.test(c)) return 'right';
          return '';
        });
        var rows = [lines[i]];
        i += 2;
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        out.push(buildTable(rows, align));
        continue;
      }

      /* blockquote */
      if (/^\s*>/.test(line)) {
        var qb = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          qb.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        out.push('<blockquote>' + blocks(qb) + '</blockquote>');
        continue;
      }

      /* list */
      if (RE_LI.test(line)) {
        var lb = [];
        var base = indentOf(line);
        while (i < lines.length) {
          var l = lines[i];
          if (l.trim() === '') {
            var nxt = lines[i + 1];
            if (nxt && nxt.trim() !== '' && (RE_LI.test(nxt) || indentOf(nxt) > base)) {
              lb.push(''); i++; continue;
            }
            break;
          }
          if (RE_LI.test(l) || indentOf(l) > base) { lb.push(l); i++; continue; }
          break;
        }
        out.push(buildList(lb));
        continue;
      }

      /* paragraph */
      var pb = [];
      while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
        pb.push(lines[i].trim());
        i++;
      }
      if (pb.length) {
        out.push('<p>' + inline(pb.join(' ')) + '</p>');
      } else {
        out.push('<p>' + inline(lines[i].trim()) + '</p>');
        i++;
      }
    }

    return out.join('\n');
  }

  /* ---------------- load ---------------- */
  var slug = new URLSearchParams(location.search).get('p');
  var el = document.getElementById('doc');
  if (!el) return;

  function notFound(msg) {
    el.innerHTML = '<h1>Project not found</h1><p>' + msg +
      ' Back to the <a href="../index.html#projects">projects list</a>.</p>';
  }

  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    notFound('No project was named in the link.');
    return;
  }

  fetch(slug + '/' + slug + '.md')
    .then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    })
    .then(function (md) {
      el.innerHTML = blocks(md.replace(/\r\n?/g, '\n'));

      /* resolve relative media and links against the project folder */
      el.querySelectorAll('img[src], video[src], source[src], iframe[src]').forEach(function (n) {
        var s = n.getAttribute('src');
        if (s && !/^(https?:|data:|\/)/i.test(s) && s.indexOf(slug + '/') !== 0) {
          n.setAttribute('src', slug + '/' + s);
        }
      });
      el.querySelectorAll('a[href]').forEach(function (a) {
        var h = a.getAttribute('href');
        if (!h || /^(https?:|mailto:|tel:|#|\/)/i.test(h)) return;
        if (h.indexOf(slug + '/') === 0 || h.indexOf('../') === 0 || h.indexOf('./') === 0) return;
        a.setAttribute('href', slug + '/' + h);
      });

      var h1 = el.querySelector('h1');
      if (h1) document.title = h1.textContent.trim() + ' | Ashritha Gonuguntla';
    })
    .catch(function () {
      notFound('There is no write-up at "' + esc(slug) + '" yet.');
    });
})();
