/* Quick view sheet: fetches /products/<handle>.js and renders gallery, options, quantity and add to cart */
(function () {
  var root = document.querySelector('[data-qv-root]');
  if (!root) return;
  var body = root.querySelector('[data-qv-body]');
  var lastTrigger = null, state = null;

  function money(cents) {
    var f = (window.SkyShop && SkyShop.moneyFormat) || '${{amount}}';
    var n = cents / 100;
    function fmt(v, dec, thou, point) {
      var s = v.toFixed(dec).split('.');
      s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, thou);
      return s[0] + (s[1] ? point + s[1] : '');
    }
    return f.replace(/\{\{\s*(\w+)\s*\}\}/, function (m, k) {
      if (k === 'amount_no_decimals') return fmt(n, 0, ',', '.');
      if (k === 'amount_with_comma_separator') return fmt(n, 2, '.', ',');
      if (k === 'amount_no_decimals_with_comma_separator') return fmt(n, 0, '.', ',');
      if (k === 'amount_with_apostrophe_separator') return fmt(n, 2, "'", '.');
      return fmt(n, 2, ',', '.');
    });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function img(u, w) { return u ? u + (u.indexOf('?') > -1 ? '&' : '?') + 'width=' + w : ''; }
  function imgSrc(i) { return typeof i === 'string' ? i : (i && i.src) || ''; }

  var ICON = {
    prev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8H3M7 4L3 8l4 4"/></svg>',
    next: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
    minus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 8h9"/></svg>',
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 8h9M8 3.5v9"/></svg>'
  };

  function open() {
    root.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-open'); }); });
    if (window.Sky && Sky.lockScroll) Sky.lockScroll(); else document.documentElement.style.overflow = 'hidden';
    var c = root.querySelector('.sk-qv__close'); if (c) c.focus();
  }
  function close() {
    root.classList.remove('is-open');
    setTimeout(function () { root.hidden = true; body.innerHTML = ''; state = null; }, 400);
    if (window.Sky && Sky.unlockScroll) Sky.unlockScroll(); else document.documentElement.style.overflow = '';
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  }

  function isColorOption(name) { return /^(colou?rs?)$/i.test(name || ''); }
  function swatchColor(val, map) {
    if (map && map[val]) return map[val];
    var last = String(val).toLowerCase().split(/[\s/-]+/).pop();
    return (window.CSS && CSS.supports('color', last)) ? last : '#bbb';
  }

  function optionsOf(p) {
    var out = [];
    (p.options || []).forEach(function (o, i) {
      var name = typeof o === 'string' ? o : o.name, vals = [];
      p.variants.forEach(function (v) { var x = v['option' + (i + 1)]; if (x != null && vals.indexOf(x) < 0) vals.push(x); });
      out.push({ name: name, values: vals });
    });
    return out;
  }

  function render(p, swatches, stock) {
    var opts = optionsOf(p);
    var sel = (p.variants.filter(function (v) { return v.available; })[0] || p.variants[0]);
    state = { p: p, opts: opts, swatches: swatches, stock: stock || {}, chosen: opts.map(function (o, i) { return sel['option' + (i + 1)]; }), qty: 1, idx: 0 };
    var urls = (p.images || []).map(imgSrc);
    var desc = (p.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, '') + '…';
    var multi = !(p.variants.length === 1 && /default/i.test(p.variants[0].title));

    var html = '<div class="sk-qv__card sk-qv__media">' +
      '<div class="sk-qv__view"><div class="sk-qv__gallery" data-qv-gallery>' +
        urls.map(function (u, i) { return '<img src="' + esc(img(u, 900)) + '" alt="' + esc(p.title) + '"' + (i ? ' loading="lazy"' : '') + '>'; }).join('') +
      '</div></div>' +
      (urls.length > 1 ? '<div class="sk-qv__arrows"><button type="button" class="sk-qv__arrow" data-qv-prev aria-label="Previous image">' + ICON.prev + '</button><button type="button" class="sk-qv__arrow" data-qv-next aria-label="Next image">' + ICON.next + '</button></div>' : '') +
    '</div>' +
    '<div class="sk-qv__card sk-qv__group1">' +
      '<a class="sk-qv__title" href="' + esc(p.url) + '">' + esc(p.title) + '</a>' +
      (desc ? '<p class="sk-qv__desc">' + esc(desc) + '</p>' : '') +
      '<div class="sk-qv__price" data-qv-price></div>' +
    '</div>' +
    '<div class="sk-qv__card sk-qv__group2">' +
      (multi ? opts.map(function (o, i) {
        var isC = isColorOption(o.name);
        return '<fieldset class="sk-qv__opt" data-opt="' + i + '"><legend><b>' + esc(o.name) + ':</b> <span data-opt-val>' + esc(state.chosen[i]) + '</span></legend><div class="sk-qv__vals">' +
          o.values.map(function (v) {
            return isC
              ? '<button type="button" class="sk-qv__sw" data-val="' + esc(v) + '" title="' + esc(v) + '" aria-label="' + esc(v) + '"><span style="background:' + esc(swatchColor(v, swatches)) + '"></span></button>'
              : '<button type="button" class="sk-qv__pill" data-val="' + esc(v) + '">' + esc(v) + '</button>';
          }).join('') + '</div></fieldset>';
      }).join('') : '') +
      '<p class="sk-qv__stock" data-qv-stock></p>' +
      whBlock() +
      '<div class="sk-qv__buy">' +
        '<div class="sk-qv__qty"><button type="button" data-qv-minus aria-label="Decrease quantity">' + ICON.minus + '</button><input type="number" min="1" value="1" data-qv-qty aria-label="Quantity"><button type="button" data-qv-plus aria-label="Increase quantity">' + ICON.plus + '</button></div>' +
        '<button type="button" class="sk-qv__atc" data-qv-atc>Add to cart</button>' +
      '</div>' +
      '<p class="sk-qv__msg" data-qv-msg role="status"></p>' +
      '<a class="sk-qv__full" href="' + esc(p.url) + '">View full details</a>' +
    '</div>';
    body.innerHTML = html;
    sync(true);
  }

  function whBlock() { var t = root.parentNode.querySelector('[data-qv-wh-block]'); return t ? t.innerHTML : ''; }
  function stockLine(v) {
    var el = body.querySelector('[data-qv-stock]'); if (!el) return;
    var q = v ? state.stock[String(v.id)] : undefined;
    var low = +(root.dataset.low || 0), cls = 'ok', txt = '';
    if (!v) { el.textContent = ''; el.className = 'sk-qv__stock'; return; }
    if (q == null || q < 0) txt = v.available ? 'In stock, Get yours today!' : 'Out of stock';
    else if (q > 0) txt = (low && q <= low) ? 'Only ' + q + ' left in stock, order soon!' : q + ' in stock, Get yours today!';
    else txt = v.available ? 'In stock, Get yours today!' : 'Out of stock';
    if (!v.available) cls = 'out'; else if (q != null && q > 0 && low && q <= low) cls = 'low';
    el.className = 'sk-qv__stock is-' + cls;
    el.innerHTML = '<i></i><span>' + esc(txt) + '</span>';
  }
  function currentVariant() {
    var c = state.chosen;
    return state.p.variants.filter(function (v) { return c.every(function (x, i) { return v['option' + (i + 1)] === x; }); })[0];
  }
  function go(i) {
    var g = body.querySelector('[data-qv-gallery]'); if (!g) return;
    var n = g.children.length; state.idx = (i + n) % n;
    g.style.transform = 'translateX(' + (-100 * state.idx) + '%)';
  }
  function sync(initial) {
    var v = currentVariant();
    body.querySelectorAll('.sk-qv__opt').forEach(function (f) {
      var i = +f.dataset.opt;
      f.querySelector('[data-opt-val]').textContent = state.chosen[i];
      f.querySelectorAll('[data-val]').forEach(function (b) {
        var on = b.dataset.val === state.chosen[i];
        b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
        // is a variant with this value available (keeping other selections)?
        var test = state.chosen.slice(); test[i] = b.dataset.val;
        var m = state.p.variants.filter(function (x) { return test.every(function (t, k) { return x['option' + (k + 1)] === t; }); })[0];
        b.classList.toggle('is-out', !m || !m.available);
      });
    });
    stockLine(v);
    var price = body.querySelector('[data-qv-price]');
    if (v) {
      price.innerHTML = '<b>' + money(v.price) + '</b>' + (v.compare_at_price > v.price ? ' <s>' + money(v.compare_at_price) + '</s>' : '');
      var atc = body.querySelector('[data-qv-atc]');
      atc.disabled = !v.available; atc.textContent = v.available ? 'Add to cart' : 'Sold out';
      var fi = v.featured_image && imgSrc(v.featured_image);
      if (fi && !initial || (fi && initial)) {
        var urls = (state.p.images || []).map(imgSrc);
        var base = function (u) { return String(u).split('?')[0]; };
        var k = urls.map(base).indexOf(base(fi)); if (k > -1) go(k);
      }
    } else {
      price.textContent = '';
      var a2 = body.querySelector('[data-qv-atc]'); a2.disabled = true; a2.textContent = 'Unavailable';
    }
  }

  function updateCount() {
    fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (c) {
      document.querySelectorAll('[data-cart-count]').forEach(function (e) { e.textContent = c.item_count; e.hidden = !c.item_count; });
    }).catch(function () {});
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-qv]');
    if (t) {
      e.preventDefault(); lastTrigger = t;
      var swatches = {}, stock = {}; try { swatches = JSON.parse(t.dataset.swatches || '{}'); } catch (x) {} try { stock = JSON.parse(t.dataset.stock || '{}'); } catch (x) {}
      body.innerHTML = '<div class="sk-qv__loading">Loading…</div>';
      open();
      fetch('/products/' + t.dataset.qv + '.js', { headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (p) { render(p, swatches, stock); })
        .catch(function () { body.innerHTML = '<div class="sk-qv__loading">Could not load this product. <a href="/products/' + esc(t.dataset.qv) + '">Open product page</a></div>'; });
      return;
    }
    if (e.target.closest('[data-wh-open]')) { whOpen(); return; }
    if (e.target.closest('[data-wh-close]')) { whClose(); return; }
    if (e.target.closest('[data-qv-close]')) { close(); return; }
    if (!state || root.hidden) return;
    var b;
    if ((b = e.target.closest('.sk-qv__opt [data-val]'))) {
      state.chosen[+b.closest('.sk-qv__opt').dataset.opt] = b.dataset.val; sync(); return;
    }
    if (e.target.closest('[data-qv-prev]')) { go(state.idx - 1); return; }
    if (e.target.closest('[data-qv-next]')) { go(state.idx + 1); return; }
    var q = body.querySelector('[data-qv-qty]');
    if (e.target.closest('[data-qv-minus]')) { q.value = Math.max(1, (+q.value || 1) - 1); return; }
    if (e.target.closest('[data-qv-plus]')) { q.value = (+q.value || 1) + 1; return; }
    if ((b = e.target.closest('[data-qv-atc]'))) {
      var v = currentVariant(); if (!v || !v.available) return;
      var msg = body.querySelector('[data-qv-msg]'); b.disabled = true; msg.textContent = '';
      fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: v.id, quantity: Math.max(1, +q.value || 1) }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'Could not add'); return j; }); })
        .then(function () { b.textContent = 'Added ✓'; msg.textContent = ''; updateCount(); setTimeout(function () { if (state) { b.disabled = false; b.textContent = 'Add to cart'; } }, 1600); })
        .catch(function (err) { b.disabled = false; msg.textContent = err.message; });
    }
  });
  var wh = document.querySelector('[data-wh-root]');
  function whOpen() { if (!wh) return; wh.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { wh.classList.add('is-open'); }); }); }
  function whClose() { if (!wh) return; wh.classList.remove('is-open'); setTimeout(function () { wh.hidden = true; }, 400); }
  document.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (wh && !wh.hidden) whClose(); else if (!root.hidden) close(); });
})();
