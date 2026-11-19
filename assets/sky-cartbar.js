/* Bottom "added to your cart" bar. Trigger from anywhere with:
   document.dispatchEvent(new CustomEvent('sky:cart-added', { detail: { item: <line item JSON>, cart: <cart JSON> } })) */
(function () {
  var bar = document.querySelector('sky-cart-success');
  if (!bar) return;
  var slot = bar.querySelector('[data-cs-slot]');
  var delay = (+bar.dataset.hideDelay || 5) * 1000, timer = null, hovering = false;
  var cartUrl = bar.dataset.cartUrl || '/cart';

  function money(c) { return (window.SkyShop && SkyShop.money) ? SkyShop.money(c) : '$' + (c / 100).toFixed(2); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  function hide() { clearTimeout(timer); bar.classList.remove('is-visible'); }
  function show(item, cart) {
    if (document.querySelector('.sk-cart.is-open')) return;
    var title = item ? (item.product_title || item.title || '') : '';
    var vt = item && item.variant_title && item.variant_title !== 'Default Title' ? ' - ' + item.variant_title : '';
    var msg = title ? '\u201C' + title + vt + '\u201D has been added to your cart.' : 'Added to your cart.';
    var total = cart && typeof cart.total_price === 'number' ? money(cart.total_price) : '';
    slot.innerHTML =
      '<div class="sk-cs__inner">' +
        '<div class="sk-cs__msg"><span class="sk-cs__ico"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6.6 10.2l2.3 2.3 4.6-4.7" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>' + esc(msg) + '</span></div>' +
        '<div class="sk-cs__act">' + (total ? '<div class="sk-cs__price">' + esc(total) + '</div>' : '') +
          '<a class="sk-cs__btn" data-sk-cart-open href="' + esc(cartUrl) + '">View cart</a></div>' +
      '</div>';
    bar.classList.add('is-visible');
    clearTimeout(timer);
    if (!hovering) timer = setTimeout(hide, delay);
  }

  bar.addEventListener('mouseenter', function () { hovering = true; clearTimeout(timer); });
  bar.addEventListener('mouseleave', function () { hovering = false; if (bar.classList.contains('is-visible')) { clearTimeout(timer); timer = setTimeout(hide, delay); } });

  bar.addEventListener('click', function (e) { if (e.target.closest('[data-sk-cart-open]')) hide(); });

  document.addEventListener('sky:cart-added', function (e) { var d = e.detail || {}; show(d.item, d.cart); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
})();
