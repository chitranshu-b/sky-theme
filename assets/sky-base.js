/* SKY-style theme - base JS (original code). Loaded with defer. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var listeners = [];
  var raf = window.requestAnimationFrame.bind(window);

  /* ---------- scroll bus (works with or without Lenis) ---------- */
  var Sky = (window.Sky = window.Sky || {});
  Sky.onScroll = function (fn) { listeners.push(fn); fn(); };
  var ticking = false;
  function fire() {
    ticking = false;
    for (var i = 0; i < listeners.length; i++) { try { listeners[i](); } catch (e) { console.error(e); } }
  }
  function queue() { if (!ticking) { ticking = true; raf(fire); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);

  /* progress of an element through the viewport: 0 when its top hits the bottom of the screen, 1 when its bottom leaves the top */
  Sky.progress = function (el, startOffset, endOffset) {
    var r = el.getBoundingClientRect(), vh = window.innerHeight;
    var s = vh * (startOffset == null ? 1 : startOffset), e = -r.height * (endOffset == null ? 1 : endOffset);
    return Math.min(1, Math.max(0, (s - r.top) / (s - e)));
  };
  /* progress of a tall wrapper that contains a sticky child: 0 -> 1 while the sticky child is pinned */
  Sky.pinProgress = function (wrap) {
    var r = wrap.getBoundingClientRect(), total = r.height - window.innerHeight;
    return total <= 0 ? 0 : Math.min(1, Math.max(0, -r.top / total));
  };

  /* ---------- smooth scroll (Lenis) ---------- */
  function initLenis() {
    if (reduce || typeof window.Lenis === 'undefined') return;
    if (document.documentElement.hasAttribute('data-no-smooth')) return;
    var lenis = new window.Lenis({ duration: 1.6, lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    window.lenis = lenis;
    lenis.on('scroll', queue);
    (function loop(time) { lenis.raf(time); raf(loop); })(performance.now());
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href') === '#') return;
      var t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -80 }); }
    });
    /* let modals / drawers stop the page scroll */
    Sky.lockScroll = function () { lenis.stop(); document.documentElement.classList.add('sk-locked'); };
    Sky.unlockScroll = function () { lenis.start(); document.documentElement.classList.remove('sk-locked'); };
  }
  Sky.lockScroll = Sky.lockScroll || function () { document.documentElement.style.overflow = 'hidden'; };
  Sky.unlockScroll = Sky.unlockScroll || function () { document.documentElement.style.overflow = ''; };
  Sky.scrollTo = function (y) { if (window.lenis) window.lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); };

  /* ---------- reveal on scroll + word split ---------- */
  function initReveal() {
    document.querySelectorAll('[data-sk-words]').forEach(function (el) {
      if (el.dataset.skSplit) return;
      el.dataset.skSplit = '1';
      el.classList.add('sk-words');
      var i = 0;
      el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w" style="--i:' + (i++) + '">' + w.replace(/[&<>]/g, '') + '</span>'; }).join(' ');
    });
    var els = document.querySelectorAll('[data-sk-reveal], .sk-words');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- sliders (scroll-snap with arrows) ---------- */
  function initSliders(root) {
    (root || document).querySelectorAll('[data-sk-slider]').forEach(function (sl) {
      if (sl.dataset.ready) return; sl.dataset.ready = '1';
      var track = sl.querySelector('.sk-slider__track');
      var prev = sl.querySelector('[data-prev]'), next = sl.querySelector('[data-next]');
      if (!track) return;
      function step() { var c = track.children[0]; return c ? c.getBoundingClientRect().width : track.clientWidth; }
      function upd() {
        if (prev) prev.disabled = track.scrollLeft < 4;
        if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', upd, { passive: true });
      window.addEventListener('resize', upd);
      var start = parseInt(sl.dataset.start || '0', 10);
      if (start) requestAnimationFrame(function () { track.style.scrollBehavior = 'auto'; track.scrollLeft = step() * start; track.style.scrollBehavior = ''; upd(); });
      upd();
    });
  }
  Sky.initSliders = initSliders;

  /* ---------- back to top with progress ring ---------- */
  function initTop() {
    var b = document.querySelector('[data-sk-top]');
    if (!b) return;
    Sky.onScroll(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      b.style.setProperty('--p', (p * 100).toFixed(1));
      b.classList.toggle('is-visible', window.scrollY > 300);
    });
    b.addEventListener('click', function () { Sky.scrollTo(0); });
  }

  /* ---------- marquee helper: duplicates content so the loop is seamless ---------- */
  function initMarquee() {
    document.querySelectorAll('[data-sk-marquee]').forEach(function (m) {
      if (m.dataset.ready) return; m.dataset.ready = '1';
      var inner = m.querySelector('.sk-marquee__inner');
      if (!inner) return;
      var unit = inner.innerHTML;
      var guard = 0;
      while (inner.scrollWidth < m.clientWidth * 2.2 && guard++ < 8) inner.insertAdjacentHTML('beforeend', unit);
      inner.insertAdjacentHTML('beforeend', inner.innerHTML);
      /* speed in px per second, independent of text length */
      var pxs = parseFloat(m.dataset.pxs);
      if (pxs > 0) inner.style.animationDuration = ((inner.scrollWidth / 2) / pxs).toFixed(2) + 's';
    });
  }

  function boot() { initLenis(); initReveal(); initSliders(); initTop(); initMarquee(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', function (e) { initReveal(); initSliders(e.target); initMarquee(); queue(); });
  window.addEventListener('load', function () { initMarquee(); queue(); });
})();
