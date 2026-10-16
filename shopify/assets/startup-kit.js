/* Page behaviour: bike photo, language, steps, accordions, video, scroll reveal.
   Two constraints come from the Apps Script iframe:
   - scroll reveal checks getBoundingClientRect instead of using IntersectionObserver,
     which can stay suspended in some webviews and leave content hidden;
   - nothing relies on 100vh/dvh, which would measure the iframe. */
(function () {
  var PARTS = { u: 4, a: 3, r: 2 };
  var AFTER = { u: 'assemble', a: 'ride', r: 'finish' };
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var st = { open: { u: 0, a: 0, r: 0 }, done: {}, stem: 0, checks: [false, false, false, false, false], faq: -1, grp: -1 };

  function q(s, r) { return (r || document).querySelector(s); }
  function all(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function when(c) { return q('[data-when="' + c + '"]'); }
  function txt(el, s) { if (el) el.textContent = s; }
  function on(el) { if (el) el.hidden = false; }
  function off(el) { if (el) el.hidden = true; }
  function anim(el, cls) {
    if (!el || reduce) return;
    el.classList.remove(cls);
    void el.offsetWidth;            // restart the animation
    el.classList.add(cls);
  }
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function headerOffset() { return (window.innerWidth >= 760 ? 108 : 140); }
  function goTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var y = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - headerOffset();
    try { window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, y); }
  }

  /* ---------------- photos ---------------- */
  var PHOTOS = window.PHOTOS || {};
  all('[data-img]').forEach(function (el) { var n = el.getAttribute('data-img'); if (PHOTOS[n]) el.src = PHOTOS[n]; });

  var BIKE = String((typeof BIKE_ID === 'string' && BIKE_ID) || param('b')).toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(BIKE)) BIKE = '';
  var heroImgs = all('[data-bike-img]');
  // No bike id, or no photo for it: show the fallback photo.
  var FALLBACK = PHOTOS['hero-fallback'];
  function fallback(im) {
    var box = im.closest ? im.closest('[data-bike-slot]') : null;
    if (FALLBACK) { im.src = FALLBACK; im.alt = ''; if (box) box.classList.add('is-fallback'); return; }
    if (box) box.style.visibility = 'hidden';       // no fallback either: keep the white background
  }
  heroImgs.forEach(function (im) {
    if (!BIKE) return fallback(im);
    // -1 is the only photo with a consistent angle (side view, facing right).
    // The CSS mirrors it so the handlebar points at the text.
    im.addEventListener('error', function () { fallback(im); }, { once: true });
    im.src = 'https://storage.googleapis.com/upway-public/images/bikes/' + BIKE + '-1.jpg';
  });

  /* The header is sticky and the hero's top padding already includes its height.
     Pull the hero up by the header height so that space isn't added twice. */
  var hdr = q('header'), hero = document.getElementById('top');
  function tuck() { if (hdr && hero) hero.style.marginTop = -hdr.offsetHeight + 'px'; }
  tuck();
  window.addEventListener('resize', tuck);

  /* ---------------- language ----------------
     Text lives in window.COPY (copy.html). Order: the visitor's earlier choice, ?lang= from
     the QR code (order language), browser languages, English. Missing keys fall back to English. */
  var COPY = window.COPY || {};
  var LANGS = Object.keys(COPY);
  function saved(v) {
    try { if (v) localStorage.setItem('upway-lang', v); else return localStorage.getItem('upway-lang'); } catch (e) {}
    return null;
  }
  function pickLang() {
    var want = [saved(), (typeof FORCED_LANG === 'string' && FORCED_LANG) || param('lang')].concat(navigator.languages || [navigator.language]);
    for (var i = 0; i < want.length; i++) {
      var l = String(want[i] || '').slice(0, 2).toLowerCase();
      if (COPY[l]) return l;
    }
    return 'en';
  }
  var lang = pickLang();
  function T(k) { return (COPY[lang] && COPY[lang][k]) || (COPY.en && COPY.en[k]) || ''; }
  /* The logo links to the local Upway site; Austria and Belgium come from the browser region. */
  var SITES = { de: 'https://upway.de', fr: 'https://upway.fr', nl: 'https://upway.nl', es: 'https://upway.es', it: 'https://upway.it', en: 'https://upway.de' };
  function siteUrl() {
    var region = '';
    (navigator.languages || [navigator.language]).some(function (x) {
      x = String(x || '');
      if (x.slice(0, 2).toLowerCase() === lang && x.length > 3) { region = x.slice(-2).toUpperCase(); return true; }
      return false;
    });
    if (region === 'AT' && lang === 'de') return 'https://upway.at';
    if (region === 'BE' && (lang === 'nl' || lang === 'fr')) return 'https://upway.be';
    return SITES[lang] || SITES.en;
  }

  /* Replaces the native <select> with a listbox menu: arrow keys, Home/End, Enter and
     Escape work, and a click outside closes it. */
  function icon(name, cls) { return '<svg class="' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  var MENUS = [];
  function closeMenus(except) {
    MENUS.forEach(function (m) {
      if (m === except || m.list.hidden) return;
      m.list.hidden = true; m.btn.setAttribute('aria-expanded', 'false');
    });
  }
  function chooseLang(l, m) {
    closeMenus();
    if (l !== lang) { lang = l; saved(lang); applyLang(); ['u', 'a', 'r'].forEach(renderStep); }
    if (m) m.btn.focus();
  }
  all('select').filter(function (s) { return /lang/i.test(s.getAttribute('aria-label') || ''); }).forEach(function (sel) {
    var wrap = document.createElement('div'); wrap.className = 'lang';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'lang__btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = icon('languages') + '<span class="lang__name"></span><span class="lang__code"></span>' + icon('chevron-down', 'lang__chev');
    var list = document.createElement('ul');
    list.className = 'lang__menu'; list.setAttribute('role', 'listbox'); list.hidden = true;
    LANGS.forEach(function (l) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option'); li.setAttribute('data-lang', l); li.lang = l; li.tabIndex = -1;
      li.innerHTML = '<span>' + (COPY[l]['lang.name'] || l) + '</span><span class="lang__tag">' + l.toUpperCase() + '</span>' + icon('check', 'lang__ok');
      list.appendChild(li);
    });
    wrap.appendChild(btn); wrap.appendChild(list);
    sel.parentNode.replaceChild(wrap, sel);
    var m = { btn: btn, list: list };
    MENUS.push(m);
    var items = function () { return [].slice.call(list.children); };
    function open() {
      closeMenus(m);
      list.hidden = false; btn.setAttribute('aria-expanded', 'true');
      (list.querySelector('[aria-selected="true"]') || list.firstChild).focus();
    }
    btn.disabled = LANGS.length < 2;
    btn.addEventListener('click', function () { if (list.hidden) open(); else closeMenus(); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
    list.addEventListener('click', function (e) { var li = e.target.closest('[data-lang]'); if (li) chooseLang(li.getAttribute('data-lang'), m); });
    list.addEventListener('keydown', function (e) {
      var its = items(), i = its.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); its[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); its[its.length - 1].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i >= 0) chooseLang(its[i].getAttribute('data-lang'), m); }
      else if (e.key === 'Escape') { e.preventDefault(); closeMenus(); btn.focus(); }
      else if (e.key === 'Tab') closeMenus();
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.lang')) closeMenus(); });

  /* Numbers stay with the next word ("2 Personen"); short hyphenated words ("contactez-nous", "E-Bike")
     don't break at the hyphen. The fonts have no non-breaking hyphen glyph, hence the .nw span. */
  function keepTogether(el) {
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walk.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var parts = t.data.replace(/(\d) (?=\S)/g, '$1\u00a0').split(/(\p{L}+(?:-\p{L}+)+)/u);
      if (parts.length === 1) { t.data = parts[0]; return; }
      var frag = document.createDocumentFragment();
      parts.forEach(function (p, i) {
        if (i % 2 && p.length <= 18) { var s = document.createElement('span'); s.className = 'nw'; s.textContent = p; frag.appendChild(s); }
        else if (p) frag.appendChild(document.createTextNode(p));
      });
      t.parentNode.replaceChild(frag, t);
    });
  }

  /* A heading that needs more lines than in English shrinks, down to 82% of its size, to the English
     line count or, failing that, one line more. If shrinking doesn't save a line it keeps its size. */
  function lineCount(el) {
    var r = document.createRange(), tops = [];
    r.selectNodeContents(el);
    [].forEach.call(r.getClientRects(), function (b) {
      if (b.width > 0.5 && !tops.some(function (t) { return Math.abs(t - b.top) < 4; })) tops.push(b.top);
    });
    return tops.length;
  }
  function fitHeadings(root) {
    all('h1[data-t], h2[data-t], h3[data-t]', root).forEach(function (el) {
      if (el.dataset.fs == null) el.dataset.fs = el.style.fontSize;
      el.style.fontSize = el.dataset.fs;
      var en = COPY.en && COPY.en[el.getAttribute('data-t')];
      if (lang === 'en' || !en || !el.getClientRects().length) return;
      var html = el.innerHTML;
      el.innerHTML = en;
      var target = lineCount(el);
      el.innerHTML = html;
      var now = lineCount(el);
      if (now <= target) return;
      var base = parseFloat(getComputedStyle(el).fontSize), floor = base * 0.82;
      for (var t = target; t < now; t++) {
        el.style.fontSize = floor + 'px';
        if (lineCount(el) > t) continue;
        var lo = floor, hi = base;       // largest size that still fits in t lines
        while (hi - lo > 0.5) { var mid = (lo + hi) / 2; el.style.fontSize = mid + 'px'; if (lineCount(el) <= t) lo = mid; else hi = mid; }
        el.style.fontSize = lo + 'px';
        return;
      }
      el.style.fontSize = el.dataset.fs;
    });
  }
  var fitWidth = window.innerWidth, fitTimer;
  window.addEventListener('resize', function () {
    if (window.innerWidth === fitWidth) return;  // phones fire resize when the URL bar hides
    fitWidth = window.innerWidth;
    clearTimeout(fitTimer);
    fitTimer = setTimeout(function () { fitHeadings(document); }, 150);
  });
  // Measure again when web fonts finish loading: a heading measured in the fallback font gets the wrong size.
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(function () { fitHeadings(document); });
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { fitHeadings(document); });
  }

  function applyLang() {
    document.documentElement.lang = lang;
    all('[data-t]').forEach(function (el) { var v = T(el.getAttribute('data-t')); if (v) { el.innerHTML = v; keepTogether(el); } });
    [['data-t-alt', 'alt'], ['data-t-label', 'aria-label'], ['data-t-title', 'title']].forEach(function (p) {
      all('[' + p[0] + ']').forEach(function (el) {
        var v = T(el.getAttribute(p[0]));
        if (v) el.setAttribute(p[1], v.replace(/<[^>]+>/g, ''));
      });
    });
    var name = T('lang.name') || lang;
    MENUS.forEach(function (m) {
      m.btn.querySelector('.lang__name').textContent = name;
      m.btn.querySelector('.lang__code').textContent = lang.toUpperCase();
      m.btn.setAttribute('aria-label', T('ui.language') + ': ' + name);
      [].forEach.call(m.list.children, function (li) { li.setAttribute('aria-selected', String(li.getAttribute('data-lang') === lang)); });
      m.list.setAttribute('aria-label', T('ui.language'));
    });
    all('a[data-site]').forEach(function (a) { a.href = siteUrl(); });
    fitHeadings(document);
  }
  if (LANGS.length) applyLang();

  /* ---------------- step parts ---------------- */
  function total(step) { return PARTS[step]; }
  function renderStep(step) {
    for (var i = 0; i < total(step); i++) {
      var key = step + i, isOpen = st.open[step] === i, done = !!st.done[key];
      var card = when(key + '.isOpen'), row = when(key + '.closed');
      if (isOpen) { on(card); anim(card, 'anim-card'); off(row); if (card) fitHeadings(card); }
      else {
        off(card);
        if (row) {
          var wasHidden = row.hidden;
          on(row);
          if (wasHidden) anim(row, 'anim-fade');
          row.setAttribute('data-row', key);
          row.classList.toggle('is-done', done);
          var mark = row.children[0], status = row.children[2];
          txt(mark, done ? '✓' : String(i + 1));
          txt(status, done ? T('ui.done') || 'Done' : T('ui.open') || 'Open');
        }
      }
    }
    renderProgress();
    schedule();                     // a card that was hidden may now need revealing
  }
  function renderProgress() {
    ['u', 'a', 'r'].forEach(function (step) {
      var n = 0;
      for (var i = 0; i < total(step); i++) if (st.done[step + i]) n++;
      var sel = step === 'u' ? '#unbox' : step === 'a' ? '#assemble' : '#ride';
      all('header a[href="' + sel + '"] > span > span').forEach(function (fill) {
        fill.style.width = Math.round(100 * n / total(step)) + '%';
      });
    });
  }
  function openPart(step, i) { st.open[step] = i; renderStep(step); }
  function completePart(step, i) {
    st.done[step + i] = true;
    var next = -1;
    for (var k = i + 1; k < total(step); k++) if (!st.done[step + k]) { next = k; break; }
    st.open[step] = next;
    renderStep(step);
    if (next === -1) setTimeout(function () { goTo(AFTER[step]); }, 60);
    if (step === 'r') checkAllDone();
  }
  function checkAllDone() {
    var every = true;
    for (var i = 0; i < PARTS.r; i++) if (!st.done['r' + i]) every = false;
    var banner = when('allDone');
    if (every) { on(banner); anim(banner, 'anim-zoom'); } else off(banner);
  }

  /* ---------------- stem, tilt, final checks ---------------- */
  function renderStem() {
    for (var i = 0; i < 3; i++) {
      var pill = q('[data-act="st' + i + ':on"]');
      if (pill) { pill.setAttribute('data-seg', ''); pill.classList.toggle('is-sel', st.stem === i); }
      var mark = when('st' + i + '.sel');
      if (mark) mark.hidden = st.stem !== i;
    }
    // each stem option has a second marker (photo + caption) with the same data-when
    all('[data-when^="st"]').forEach(function (el) {
      var n = +el.getAttribute('data-when').charAt(2);
      el.hidden = st.stem !== n;
    });
  }
  function renderChecks() {
    var n = 0;
    for (var i = 0; i < 5; i++) {
      var row = q('[data-act="c' + i + ':toggle"]');
      var tick = when('c' + i + '.on');
      if (st.checks[i]) { n++; on(tick); anim(tick, 'anim-pop'); } else off(tick);
      if (row) row.classList.toggle('is-on', !!st.checks[i]);
    }
    var muted = q('[style*="#B8B4C8"]');
    if (muted && muted.parentNode && muted.parentNode.firstChild) muted.parentNode.firstChild.nodeValue = String(n);
    if (n === 5 && !st.done.r1) completePart('r', 1);
  }

  /* ---------------- accordions: one open per group ---------------- */
  function renderAcc(prefix, openIdx, count) {
    for (var i = 0; i < count; i++) {
      var body = when(prefix + i);
      var btn = q('[data-act="' + prefix + ':' + i + '"]');
      if (body) body.hidden = openIdx !== i;
      if (btn) {
        var sign = btn.children[btn.children.length - 1];
        txt(sign, openIdx === i ? '−' : '+');
      }
    }
  }

  /* ---------------- clicks ---------------- */
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var el = e.target.closest('[data-act]');
    if (el) {
      var act = el.getAttribute('data-act');
      var m = /^([uar])(\d+):(open|next)$/.exec(act);
      if (m) { e.preventDefault(); if (m[3] === 'open') openPart(m[1], +m[2]); else completePart(m[1], +m[2]); return; }
      m = /^st(\d):on$/.exec(act);
      if (m) { st.stem = +m[1]; renderStem(); return; }
      m = /^c(\d):toggle$/.exec(act);
      if (m) { st.checks[+m[1]] = !st.checks[+m[1]]; renderChecks(); return; }
      m = /^(faq|grp):(\d+)$/.exec(act);
      if (m) {
        var k = m[1], i = +m[2];
        st[k] = st[k] === i ? -1 : i;
        renderAcc(k, st[k], k === 'faq' ? 7 : 9);
        return;
      }
      if (act === 'toggleTilt') {
        var body = when('tilt');
        if (body) {
          body.hidden = !body.hidden;
          if (!body.hidden) anim(body, 'anim-card');
          var b = el.children[el.children.length - 1];
          txt(b, body.hidden ? '+' : '−');
        }
        return;
      }
      if (act === 'openVideo') {
        var v = when('video');
        all('[data-video] img[data-src]').forEach(function (im) { if (!im.src) im.src = im.getAttribute('data-src'); }); // load the cover only when the modal opens
        on(v); anim(v, 'anim-fade'); return;
      }
      if (act === 'playVideo') { playVideo(el); return; }
      if (act === 'closeVideo') { closeVideo(); return; }
      if (act === 'stop') { e.stopPropagation(); return; }
      if (act === 'copyEmail') {
        var addr = 'support@upway.shop';
        var label = el.querySelector('span') || el;
        var original = label.textContent;
        var done = function () { label.textContent = T('ui.copied') || 'Copied ✓'; setTimeout(function () { label.textContent = original; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr).then(done, function () {});
        else { try { var t = document.createElement('textarea'); t.value = addr; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); } catch (err) {} }
        return;
      }
    }
    // in-page links: scroll with the header offset
    var a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1) { e.preventDefault(); goTo(a.getAttribute('href').slice(1)); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var v = when('video'); if (v && !v.hidden) closeVideo(); }
  });

  /* ---------------- video ----------------
     The modal shows a cover first. The YouTube player loads only on play and is removed
     on close, which also stops the sound. */
  function playVideo(poster) {
    var box = poster.parentNode;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/cfGxWMMVrYI?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    f.title = T('page.upway-unboxing-video') || 'Upway unboxing video';
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block';
    box.appendChild(f);
    poster.hidden = true;
  }
  function closeVideo() {
    var v = when('video');
    all('[data-video] iframe').forEach(function (f) { f.parentNode.removeChild(f); });
    all('[data-video] .vposter').forEach(function (p) { p.hidden = false; });
    off(v);
  }

  /* ---------------- scroll reveal ---------------- */
  var rise = [];
  all('[data-stagger]').forEach(function (w) {
    [].slice.call(w.children).forEach(function (el, i) {
      el.setAttribute('data-rise', '');
      el.style.setProperty('--i', String(i));
      rise.push(el);
    });
  });
  all('[data-hero] , [data-hero-img]').forEach(function (el) {
    if (el.hasAttribute('data-hero')) {
      [].slice.call(el.children).forEach(function (c, i) { c.style.setProperty('--i', String(i)); });
    }
  });
  var ticking = false;
  function reveal() {
    ticking = false;
    var limit = (window.innerHeight || 800) * 0.9;
    for (var i = rise.length - 1; i >= 0; i--) {
      var r = rise[i].getBoundingClientRect();
      if (r.top < limit && r.bottom > 0) { rise[i].classList.add('is-in'); rise.splice(i, 1); }
    }
  }
  function schedule() {
    if (ticking) return;
    ticking = true;
    if (window.requestAnimationFrame) requestAnimationFrame(reveal); else setTimeout(reveal, 16);
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('load', schedule);
  // show anything still hidden after 6 s
  setTimeout(function () { while (rise.length) rise.pop().classList.add('is-in'); }, 6000);

  /* ---------------- loader ---------------- */
  function startHero() {
    all('[data-hero], [data-hero-img]').forEach(function (el) { el.classList.add('is-in'); });
    reveal();
  }
  (function loader() {
    var ov = q('#loader'), bar = q('#loader-bar');
    if (!ov || reduce) { if (ov) ov.hidden = true; startHero(); return; }
    ov.hidden = false;
    var t0 = Date.now(), fired = false;
    if (bar) { bar.style.transition = 'transform 1.5s cubic-bezier(.2,.7,.2,1)'; setTimeout(function () { bar.style.transform = 'scaleX(.82)'; }, 20); }
    function finish() {
      if (fired) return; fired = true;
      setTimeout(function () {
        if (bar) { bar.style.transition = 'transform .22s ease-out'; bar.style.transform = 'scaleX(1)'; }
        setTimeout(function () {
          ov.classList.add('is-out');
          setTimeout(startHero, 260);
          setTimeout(function () { ov.hidden = true; }, 500);
        }, 200);
      }, Math.max(0, 700 - (Date.now() - t0)));
    }
    var img = heroImgs[0];
    if (img && img.complete && img.naturalWidth) finish();
    else if (img) { img.addEventListener('load', finish, { once: true }); img.addEventListener('error', finish, { once: true }); }
    setTimeout(finish, 2600);
  })();

  /* ---------------- initial state ---------------- */
  ['u', 'a', 'r'].forEach(renderStep);
  renderStem();
  renderChecks();
  renderAcc('faq', -1, 7);
  renderAcc('grp', -1, 9);
  checkAllDone();
})();
