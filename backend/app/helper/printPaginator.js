/**
 * In-browser auto pagination for printed HR letters.
 *
 * The HTML builders emit one `.page` per manual page-break sheet (marked with
 * data-sheet). hrPaginate() then measures the real rendered content and re-flows it
 * into fixed-size pages for the selected paper size: blocks that overflow move to a
 * new page, wrapper divs and long tables are split, letterhead + header/footer are
 * added per page and page numbers are filled in.
 *
 * KEEP IN SYNC with frontend/src/app/master/document-template/print-paginator.ts
 *
 * cfg = { useImage, lhMax, lhHead, lhFoot, lhTopPad, plainTop, plainBottom, padX,
 *         hf: null | { pages, header: {html, reserve} | null, footer: {html, reserve} | null } }
 */
function hrPaginate(root, cfg) {
  if (!root || root.getAttribute('data-hr-paginated') === '1') return 0;
  var doc = root.ownerDocument;
  var pages = Array.prototype.slice.call(root.children).filter(function (el) {
    return /(^|\s)page(\s|$)/.test(el.className);
  });
  if (!pages.length) return 0;
  var firstBody = pages[0].querySelector('.page-body');
  var bodyClass = firstBody ? firstBody.className : 'page-body';

  // Gather content per manual sheet (pages with the same data-sheet belong together)
  var groups = [];
  var lastKey = null;
  pages.forEach(function (p) {
    var key = p.getAttribute('data-sheet') || '0';
    var b = p.querySelector('.page-body');
    if (!groups.length || key !== lastKey) {
      groups.push([]);
      lastKey = key;
    }
    if (b) while (b.firstChild) groups[groups.length - 1].push(b.removeChild(b.firstChild));
    p.parentNode.removeChild(p);
  });

  var hf = cfg.hf || null;
  var out = [];
  var lhUsed = 0;
  var body = null; // .page-body of the current page
  var cur = null; // insertion container (body, or a split wrapper inside it)
  var stack = []; // wrappers being split — re-created on every new page
  var hasContent = false;
  var autoBroken = false;

  function hfShows(i) {
    if (!hf) return false;
    if (hf.pages === 'first') return i === 0;
    if (hf.pages === 'notFirst') return i > 0;
    return true;
  }

  function newPage(isAuto) {
    var i = out.length;
    var lh = !!cfg.useImage && lhUsed < cfg.lhMax;
    if (lh) lhUsed++;
    var show = hfShows(i);
    var top = Math.max(lh ? cfg.lhHead + (cfg.lhTopPad || 0) : cfg.plainTop, show && hf.header ? hf.header.reserve : 0);
    var bottom = Math.max(lh ? cfg.lhFoot : cfg.plainBottom, show && hf.footer ? hf.footer.reserve : 0);
    var page = doc.createElement('div');
    page.className = 'page ' + (lh ? 'page--lh' : 'page--plain');
    var html = lh
      ? '<div class="page-lh-header"></div><div class="page-lh-footer"></div><div class="page-lh-mask"></div>'
      : '';
    if (show) html += (hf.header ? hf.header.html : '') + (hf.footer ? hf.footer.html : '');
    page.innerHTML = html;
    body = doc.createElement('div');
    body.className = bodyClass;
    body.style.padding = top + 'mm ' + cfg.padX + ' ' + bottom + 'mm';
    page.appendChild(body);
    root.appendChild(page);
    out.push(page);
    cur = body;
    for (var s = 0; s < stack.length; s++) {
      var part = stack[s].cloneNode(false);
      cur.appendChild(part);
      cur = part;
    }
    hasContent = false;
    autoBroken = !!isAuto;
  }

  function overflows() {
    return body.scrollHeight > body.clientHeight + 1;
  }

  function meaningful(n) {
    return n.nodeType === 1 || (n.nodeType === 3 && /\S/.test(n.nodeValue));
  }

  function isBlankBlock(n) {
    if (n.nodeType === 3) return !/\S/.test(n.nodeValue);
    if (n.nodeType !== 1) return true;
    if (/^(IMG|TABLE|HR|SVG|CANVAS)$/.test(n.tagName)) return false;
    if (n.querySelector && n.querySelector('img,table,hr,svg,canvas')) return false;
    return !/\S/.test((n.textContent || '').replace(/ /g, ' '));
  }

  function splittable(n) {
    if (n.nodeType !== 1 || !/^(DIV|SECTION|ARTICLE|MAIN|BLOCKQUOTE)$/.test(n.tagName)) return false;
    var c = 0;
    for (var k = 0; k < n.childNodes.length; k++) if (meaningful(n.childNodes[k])) c++;
    return c > 1;
  }

  /** Split a wrapper element: its children flow across pages inside cloned wrappers. */
  function splitWrapper(w) {
    var kids = Array.prototype.slice.call(w.childNodes);
    var part = w.cloneNode(false);
    cur.appendChild(part);
    stack.push(w);
    cur = part;
    kids.forEach(place);
    stack.pop();
    cur = cur.parentNode;
  }

  /** Split a table across pages row by row. Returns false when it can't be split. */
  function placeTable(table) {
    var rows = Array.prototype.slice.call(table.rows || []);
    if (rows.length < 2) return false;
    var colgroup = table.querySelector('colgroup');
    function startPart() {
      var part = table.cloneNode(false);
      if (colgroup) part.appendChild(colgroup.cloneNode(true));
      var tb = doc.createElement('tbody');
      part.appendChild(tb);
      cur.appendChild(part);
      return tb;
    }
    var had = hasContent;
    var tb = startPart();
    for (var r = 0; r < rows.length; r++) {
      tb.appendChild(rows[r]);
      if (!overflows() || (tb.rows.length === 1 && !had)) {
        hasContent = true;
        continue; // fits (or a single row taller than a page)
      }
      tb.removeChild(rows[r]);
      if (!tb.rows.length) tb.parentNode.parentNode.removeChild(tb.parentNode);
      newPage(true);
      had = false;
      tb = startPart();
      tb.appendChild(rows[r]);
      hasContent = true;
    }
    return true;
  }

  function place(n) {
    if (!meaningful(n)) {
      cur.appendChild(n);
      return;
    }
    // Like Word: no blank lines at the top of an automatically started page
    if (autoBroken && !hasContent && isBlankBlock(n)) return;
    var had = hasContent;
    cur.appendChild(n);
    if (!overflows()) {
      hasContent = true;
      return;
    }
    if (n.nodeType === 1 && n.tagName === 'TABLE') {
      cur.removeChild(n);
      if (placeTable(n)) return;
      cur.appendChild(n);
    } else if (splittable(n)) {
      cur.removeChild(n);
      splitWrapper(n);
      return;
    }
    if (!had) {
      hasContent = true; // single block taller than a page — keep it here
      return;
    }
    cur.removeChild(n);
    newPage(true);
    if (isBlankBlock(n)) return;
    cur.appendChild(n);
    hasContent = true;
  }

  groups.forEach(function (nodes) {
    stack = [];
    newPage(false);
    nodes.forEach(place);
  });

  var total = out.length;
  out.forEach(function (p, i) {
    Array.prototype.forEach.call(p.querySelectorAll('.hr-pg'), function (e) {
      e.textContent = String(i + 1);
    });
    Array.prototype.forEach.call(p.querySelectorAll('.hr-pgs'), function (e) {
      e.textContent = String(total);
    });
  });
  root.setAttribute('data-hr-paginated', '1');
  return total;
}

/** <script> that paginates the document once fonts/images are loaded. */
function paginatorScriptTag(cfg) {
  const json = JSON.stringify(cfg || {}).replace(/</g, '\\u003c');
  return (
    '<script>(function(){var hrPaginate=' +
    hrPaginate.toString() +
    ';var cfg=' +
    json +
    ';function run(){try{hrPaginate(document.querySelector("[data-hr-root]"),cfg);}catch(e){console.error(e);}' +
    'document.body.setAttribute("data-hr-paginated","1");}' +
    'if(document.readyState==="complete")run();else window.addEventListener("load",run);})();</script>'
  );
}

module.exports = { hrPaginate, paginatorScriptTag };
