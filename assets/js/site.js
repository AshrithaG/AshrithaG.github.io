/* shared: theme, nav, scroll progress, go-top, project filters */
(function () {
  'use strict';

  /* ---------- theme ---------- */
  var root = document.documentElement;
  var KEY = 'ag-theme';
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var saved = stored();
  var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', saved || (sysDark ? 'dark' : 'light'));

  var SUN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function paint(btn) {
    if (btn) btn.innerHTML = root.getAttribute('data-theme') === 'dark' ? SUN : MOON;
  }

  var toggle = document.querySelector('.nav__toggle');
  paint(toggle);
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      save(next);
      paint(toggle);
    });
  }

  /* ---------- mobile nav ---------- */
  var burger = document.querySelector('.nav__burger');
  var menu = document.querySelector('.nav__right');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') menu.classList.remove('open');
    });
  }

  /* ---------- scroll progress + go-top ---------- */
  var bar = document.querySelector('.scrollbar');
  var top = document.querySelector('.gotop');
  var ticking = false;

  function onScroll() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY || window.pageYOffset;
    if (bar) bar.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
    if (top) top.classList.toggle('show', y > 550);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (top) {
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- card video hover ---------- */
  document.querySelectorAll('.card__media video').forEach(function (v) {
    var card = v.closest('.card');
    if (!card) return;
    card.addEventListener('mouseenter', function () { v.play().catch(function () {}); });
    card.addEventListener('mouseleave', function () { v.pause(); v.currentTime = 0; });
  });

  /* ---------- project filters ---------- */
  var filters = document.querySelectorAll('.filter');
  var cards = document.querySelectorAll('.grid .card');
  if (filters.length && cards.length) {
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        filters.forEach(function (o) { o.classList.remove('on'); });
        f.classList.add('on');
        var want = f.dataset.filter;
        cards.forEach(function (c) {
          var tags = (c.dataset.tags || '').split('|');
          c.style.display = (want === 'all' || tags.indexOf(want) !== -1) ? '' : 'none';
        });
      });
    });
  }
})();

/* ---------- scrambled email: reveal on click ----------
   The address ships reversed so simple scrapers get nothing useful. */
(function () {
  var btn = document.querySelector('.unscram');
  var el = document.querySelector('.scram');
  if (!btn || !el) return;
  btn.addEventListener('click', function () {
    var real = (el.dataset.rev || '').split('').reverse().join('');
    var a = document.createElement('a');
    a.href = 'mailto:' + real;
    a.textContent = real;
    el.replaceWith(a);
    btn.remove();
  });
})();

/* ---------- portrait: fall back to the placeholder until profile.jpg exists ---------- */
(function () {
  var img = document.querySelector('.hero__img');
  var ph = document.querySelector('.hero__photo .hero__ph');
  if (!img || !ph) return;
  function fallback() { img.hidden = true; ph.hidden = false; }
  img.addEventListener('error', fallback);
  if (img.complete && img.naturalWidth === 0) fallback();
})();
