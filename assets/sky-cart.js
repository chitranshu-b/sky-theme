/* Cart drawer: renders from /cart.js, handles qty, remove, note and the offer progress bar. */
(function () {
  var root = document.getElementById('SkyCartDrawer');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  var cfg = {};
  try { cfg = JSON.parse(document.querySelector('[data-cd-config]').textContent); } catch (e) {}
  var $ = function (s) { return root.querySelector(s); };
  var itemsEl = $('[data-cd-items]'), offerEl = $('[data-cd-offer]'), totalEl = $('[data-cd-total]'), noteEl = $('[data-cd-note]');
  var cart = null, busy = false, lastFocus = null;

  function money(c) { return (window.SkyShop && SkyShop.money) ? SkyShop.money(c) : (c / 100).toFixed(2); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function img(u) { if (!u) return ''; return u + (u.indexOf('?') > -1 ? '&' : '?') + 'width=200'; }
  function fill(t, o) { return String(t || '').replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ''; }); }

  /* ---------- open / close ---------- */
  function open() {
    lastFocus = document.activeElement;
    root.setAttribute('aria-hidden', 'false');
    root.classList.add('is-open');
    if (window.Sky && Sky.lockScroll) Sky.lockScroll(); else document.documentElement.style.overflow = 'hidden';
    refresh();
    setTimeout(function () { var c = $('.sk-cd__close'); if (c) c.focus({ preventScroll: true }); }, 50);
  }
  function close() {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    if (rec) { rec.classList.remove('is-visible'); rec.setAttribute('aria-hidden', 'true'); }
    if (window.Sky && Sky.unlockScroll) Sky.unlockScroll(); else document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  window.SkyCart = { open: open, close: close, refresh: function () { return refresh(); } };

  /* ---------- offer bar ---------- */
  function renderOffer(qty) {
    var tiers = (cfg.tiers || []).slice().sort(function (a, b) { return a.qty - b.qty; });
    if (!cfg.offer || !tiers.length) { offerEl.hidden = true; offerEl.innerHTML = ''; return; }
    offerEl.hidden = false;
    var n = tiers.length, p = 0, next = null, i, prevQ = 0;
    for (i = 0; i < n; i++) {
      if (qty >= tiers[i].qty) { p = (i + 1) / n; prevQ = tiers[i].qty; }
      else { next = next || tiers[i]; p = i / n + (qty - prevQ) / (tiers[i].qty - prevQ) / n; break; }
    }
    if (qty <= 0) p = 0;
    var text;
    if (next) {
      var left = next.qty - qty;
      text = fill(qty > 0 ? cfg.textProgress : cfg.textStart, { count: '<strong>' + left + '</strong>', offer: '<strong>' + esc(next.label) + '</strong>' });
    } else {
      text = fill(cfg.textDone, { offer: '<strong>' + esc(tiers[n - 1].label) + '</strong>', count: 0 });
    }
    var goals = tiers.map(function (t, k) {
      return '<span class="sk-cd__goal' + (qty >= t.qty ? ' is-hit' : '') + '" style="--g:' + ((k + 1) / n) + '"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.3 5 8.8l4.5-4.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sk-cd__goal-label">' + esc(t.label) + '</span></span>';
    }).join('');
    var track = offerEl.querySelector('.sk-cd__track');
    if (!track) {
      offerEl.innerHTML = '<div class="sk-cd__offer-card"><div class="sk-cd__offer-text"></div><div class="sk-cd__track"><div class="sk-cd__fill"></div><div data-goals></div></div><div class="sk-cd__goals-pad"></div></div>';
      track = offerEl.querySelector('.sk-cd__track');
    }
    offerEl.querySelector('.sk-cd__offer-text').innerHTML = text;
    track.querySelector('[data-goals]').innerHTML = goals;
    var f = track.querySelector('.sk-cd__fill');
    f.style.setProperty('--p', p.toFixed(4));
    f.style.setProperty('--o', p > 0 ? '12px' : '0px');
  }

  /* ---------- savings bar (discounts + compare-at price drops) ---------- */
  var prodCache = {};
  function getProduct(h) { return prodCache[h] || (prodCache[h] = fetch('/products/' + h + '.js').then(function (r) { return r.json(); }).catch(function () { return null; })); }
  function renderSaved(c) {
    var el = $('[data-cd-saved]'); if (!el) return;
    if (!cfg.saved) { el.hidden = true; return; }
    var handles = {}; c.items.forEach(function (it) { handles[it.handle] = 1; });
    Promise.all(Object.keys(handles).map(getProduct)).then(function (ps) {
      if (c !== cart) return;
      var byH = {}; ps.forEach(function (p) { if (p) byH[p.handle] = p; });
      var save = c.total_discount || 0;
      c.items.forEach(function (it) {
        var p = byH[it.handle]; if (!p) return;
        var v = p.variants.filter(function (x) { return x.id === it.variant_id; })[0];
        if (v && v.compare_at_price > it.original_price) save += (v.compare_at_price - it.original_price) * it.quantity;
      });
      if (save > 0) {
        el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 1.5l2.4 2 3.1-.3 1.1 2.9 2.9 1.1-.3 3.1 2 2.4-2 2.4.3 3.1-2.9 1.1-1.1 2.9-3.1-.3-2.4 2-2.4-2-3.1.3-1.1-2.9-2.9-1.1.3-3.1-2-2.4 2-2.4-.3-3.1 2.9-1.1 1.1-2.9 3.1.3L12 1.5Z" fill="#fff"/><path d="M9 15l6-6" stroke="#4a933d" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="9.2" r="1.3" fill="#4a933d"/><circle cx="15" cy="14.8" r="1.3" fill="#4a933d"/></svg><span>' + fill(esc(cfg.savedText), { amount: '<b>' + money(save) + '</b>' }) + '</span>';
        el.hidden = false;
      } else el.hidden = true;
    });
  }

  /* ---------- render ---------- */
  function render() {
    var empty = !cart || cart.item_count === 0;
    root.classList.toggle('is-empty', empty);
    document.querySelectorAll('[data-cart-count]').forEach(function (e) { e.textContent = cart ? cart.item_count : 0; e.hidden = empty; });
    if (!cart) return;
    itemsEl.innerHTML = cart.items.map(function (it, i) {
      var opts = (it.options_with_values || []).filter(function (o) { return !(o.name === 'Title' && o.value === 'Default Title'); })
        .map(function (o) { return '<span>' + esc(o.value) + '</span>'; }).join('');
      var badges = (it.line_level_discount_allocations || []).map(function (d) { return '<span class="sk-cd__badge">' + esc(d.discount_application.title) + '</span>'; }).join(' ');
      var was = it.original_line_price > it.final_line_price ? '<s>' + money(it.original_line_price) + '</s>' : '';
      return '<div class="sk-cd__item" data-key="' + esc(it.key) + '">' +
        '<a class="sk-cd__img" href="' + esc(it.url) + '">' + (it.image ? '<img src="' + esc(img(it.image)) + '" alt="' + esc(it.featured_image && it.featured_image.alt || it.product_title) + '" loading="lazy">' : '') + '</a>' +
        '<div class="sk-cd__det"><div class="sk-cd__main"><div><a class="sk-cd__ititle" href="' + esc(it.url) + '">' + esc(it.product_title) + '</a>' +
        (opts ? '<div class="sk-cd__opts">' + opts + '</div>' : '') + (badges ? '<div>' + badges + '</div>' : '') + '</div>' +
        '<div class="sk-cd__qty"><button type="button" class="sk-cd__qbtn" data-dec aria-label="Decrease quantity"' + (it.quantity <= 1 ? ' disabled' : '') + '><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>' +
        '<input class="sk-cd__qin" type="number" min="1" value="' + it.quantity + '" aria-label="Quantity">' +
        '<button type="button" class="sk-cd__qbtn" data-inc aria-label="Increase quantity"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2v8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button></div></div>' +
        '<div class="sk-cd__side"><button type="button" class="sk-cd__rm" data-rm aria-label="' + esc(cfg.removeLabel) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<div class="sk-cd__price"><b>' + money(it.final_line_price) + '</b>' + was + '</div></div></div></div>';
    }).join('');
    totalEl.textContent = money(cart.total_price) + (cart.currency ? ' ' + cart.currency : '');
    if (noteEl && document.activeElement !== noteEl) noteEl.value = cart.note || '';
    renderOffer(cart.item_count);
    renderSaved(cart);
  }

  function setCart(c) { cart = c; render(); return c; }
  function refresh() { return fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(setCart); }

  function change(key, qty) {
    if (busy) return; busy = true; root.classList.add('is-loading');
    fetch('/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: key, quantity: qty }) })
      .then(function (r) { return r.json(); }).then(setCart).catch(function () { return refresh(); })
      .then(function () { busy = false; root.classList.remove('is-loading'); });
  }

  /* ---------- events ---------- */
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-cd-close]')) return close();
    var row = e.target.closest('.sk-cd__item'); if (!row) return;
    var key = row.dataset.key, input = row.querySelector('.sk-cd__qin'), q = +input.value || 1;
    if (e.target.closest('[data-inc]')) change(key, q + 1);
    else if (e.target.closest('[data-dec]')) change(key, Math.max(0, q - 1));
    else if (e.target.closest('[data-rm]')) change(key, 0);
  });
  root.addEventListener('change', function (e) {
    var input = e.target.closest('.sk-cd__qin');
    if (input) change(input.closest('.sk-cd__item').dataset.key, Math.max(0, +input.value || 0));
  });
  if (noteEl) noteEl.addEventListener('change', function () {
    fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: noteEl.value }) });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('is-open')) close(); });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sk-cart-open], .sk-hd__cart, a[href="/cart"]');
    if (!t || t.closest('#SkyCartDrawer') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); open();
  });
  document.addEventListener('sky:cart-added', function (e) { if (e.detail && e.detail.cart) setCart(e.detail.cart); });
  document.addEventListener('sky:cart-open', open);


  /* ---------- deals tabs, direct add ---------- */
  function addVariant(id, qty) {
    return fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: +id, quantity: qty || 1 }) })
      .then(function (r) { if (!r.ok) throw new Error('add'); return r.json(); }).then(refresh);
  }
  root.addEventListener('click', function (e) {
    var tab = e.target.closest('.sk-cd__tab');
    if (tab) {
      root.querySelectorAll('.sk-cd__tab').forEach(function (t) { t.classList.toggle('is-active', t === tab); });
      root.querySelectorAll('.sk-cd__tabbody').forEach(function (b) { b.classList.toggle('is-active', b.dataset.panel === tab.dataset.tab); });
      return;
    }
    var add = e.target.closest('[data-add]');
    if (add) { add.classList.add('is-busy'); addVariant(add.dataset.add, 1).catch(function () {}).then(function () { add.classList.remove('is-busy'); }); }
  });

  /* ---------- recommended side panel ---------- */
  var rec = $('[data-cd-rec]');
  function recToggle(on) {
    if (!rec) return;
    rec.classList.toggle('is-visible', on);
    rec.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-cd-rec-open]')) return recToggle(true);
    if (e.target.closest('[data-cd-rec-close]')) return recToggle(false);
    var tg = e.target.closest('[data-rec-toggle]');
    if (tg) openRec(tg.closest('.sk-cd__rec'));
  });
  var recCache = {};
  function openRec(card) {
    var isOpen = card.classList.toggle('is-open');
    card.querySelector('[data-rec-toggle]').setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (!isOpen || card.dataset.ready) return;
    card.dataset.ready = '1';
    var handle = card.dataset.handle, panel = card.querySelector('[data-rec-panel]');
    panel.innerHTML = '<div class="sk-cd__rec-form"><span class="sk-cd__opt-name">Loading…</span></div>';
    (recCache[handle] = recCache[handle] || fetch('/products/' + handle + '.js').then(function (r) { return r.json(); })).then(function (p) { buildRec(panel, p); });
  }
  function buildRec(panel, p) {
    var opts = (p.options || []).map(function (o) { return typeof o === 'string' ? { name: o, values: [] } : o; });
    opts.forEach(function (o, i) { var seen = {}; o.values = []; p.variants.forEach(function (v) { var x = v['option' + (i + 1)]; if (x != null && !seen[x]) { seen[x] = 1; o.values.push(x); } }); });
    var first = p.variants.filter(function (v) { return v.available; })[0] || p.variants[0];
    var chosen = opts.map(function (o, i) { return first['option' + (i + 1)]; });
    var single = p.variants.length === 1;
    function cur() { return p.variants.filter(function (v) { return chosen.every(function (c, i) { return v['option' + (i + 1)] === c; }); })[0]; }
    function draw() {
      var v = cur();
      panel.innerHTML = '<div class="sk-cd__rec-form">' + (single ? '' : opts.map(function (o, i) {
        return '<div><div class="sk-cd__opt-name">' + esc(o.name) + ': <b>' + esc(chosen[i]) + '</b></div><div class="sk-cd__opt-vals">' + o.values.map(function (val) {
          var t = chosen.slice(); t[i] = val;
          var m = p.variants.filter(function (x) { return t.every(function (c, k) { return x['option' + (k + 1)] === c; }); })[0];
          return '<button type="button" class="sk-cd__ov' + (val === chosen[i] ? ' is-on' : '') + (!m || !m.available ? ' is-out' : '') + '" data-i="' + i + '" data-v="' + esc(val) + '">' + esc(val) + '</button>';
        }).join('') + '</div></div>';
      }).join('')) + '<button type="button" class="sk-cd__rec-add"' + (v && v.available ? '' : ' disabled') + '>' + (v && v.available ? 'Add to cart' : 'Sold out') + '</button></div>';
      panel.querySelectorAll('.sk-cd__ov').forEach(function (b) { b.onclick = function () { chosen[+b.dataset.i] = b.dataset.v; draw(); }; });
      var a = panel.querySelector('.sk-cd__rec-add');
      a.onclick = function () { if (!v || !v.available) return; a.disabled = true; a.textContent = 'Adding…'; addVariant(v.id, 1).then(function () { a.textContent = 'Added ✓'; setTimeout(draw, 1200); }).catch(function () { a.textContent = 'Try again'; a.disabled = false; }); };
    }
    draw();
  }

  refresh();
})();
