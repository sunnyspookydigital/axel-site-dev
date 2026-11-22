/* Axel Construction Training: scroll motion (desktop and phone).
   Every effect moves with transform/opacity only, so the browser never repaints while you scroll.
   Hero: a canvas image sequence; the scroll picks the frame. Phones get a portrait frame set.
   Native scrolling throughout. Falls back to a still page if anything is missing or motion is reduced. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop = window.matchMedia("(min-width: 900px)").matches;
  var NAV = desktop ? 76 : 68;
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function revealAll() { $$("[data-reveal]").forEach(function (el) { el.classList.add("in"); }); }

  var stage = document.querySelector(".stage");
  if (!window.gsap || !window.ScrollTrigger || reduced) {
    revealAll();
    var v = stage && stage.querySelector(".stage-video");
    if (v && !reduced) { v.src = v.dataset.src; v.muted = true; v.loop = true; v.play().catch(function () {}); v.addEventListener("loadeddata", function () { v.classList.add("ready"); }, { once: true }); }
    return;
  }
  doc.classList.add("motion");
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true }); // the phone address bar showing/hiding must not restart anything
  var EASE = "power3.out";

  // a "window" that opens from a framed panel to full screen: outer scales, inner counter-scales (no repaint)
  function opener(outer, inner, F) {
    return function (p) {
      var sx = F.w + (1 - F.w) * p, sy = F.h + (1 - F.h) * p, tx = F.x * (1 - p) * 100, ty = F.y * (1 - p) * 100;
      outer.style.transform = "translate(" + tx + "%," + ty + "%) scale(" + sx + "," + sy + ")";
      inner.style.transform = "scale(" + (1 / sx) + "," + (1 / sy) + ") translate(" + (-tx) + "%," + (-ty) + "%)";
    };
  }

  /* ---------- home hero ---------- */
  if (stage) {
    var pin = stage.querySelector(".stage-pin"), win = stage.querySelector(".stage-media"),
        inner = stage.querySelector(".stage-inner"), canvas = stage.querySelector(".stage-canvas"),
        shade = stage.querySelector(".stage-shade"), trust = stage.querySelector(".stage-trust"),
        cue = stage.querySelector(".scroll-cue");
    var ctx = canvas.getContext("2d");
    var N = parseInt(canvas.dataset.count, 10), base = desktop ? canvas.dataset.base : canvas.dataset.baseM;
    var frames = new Array(N), loaded = new Array(N), W = 0, H = 0, lastW = 0, current = -1, want = 0;
    stage.classList.add("is-scroll");

    var draw = function (i) {
      var k = i; while (k > 0 && !loaded[k]) k--;   // nearest frame that has arrived
      if (!loaded[k] || k === current) return;
      current = k;
      var img = frames[k], iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
      var s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
      ctx.drawImage(img, (W - dw) * (desktop ? 0.62 : 0.5), (H - dh) / 2, dw, dh);
    };
    var size = function () {
      var r = pin.getBoundingClientRect();
      if (lastW && Math.abs(r.width - lastW) < 2) return; // ignore height-only changes (phone toolbars)
      lastW = r.width;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // fewer pixels to fill per frame on dense phone screens
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      canvas.width = W; canvas.height = H; current = -1; draw(want);
    };
    var ready = function (i, pic) {
      frames[i] = pic; loaded[i] = true;
      if (i === 0 || i <= want) { current = -1; draw(want); }
      if (i === 0) canvas.classList.add("ready");
    };
    var load = function (i) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        // decode off the main thread so no frame stalls the scroll the first time it's shown
        if (window.createImageBitmap) createImageBitmap(img).then(function (bmp) { ready(i, bmp); }, function () { ready(i, img); });
        else if (img.decode) img.decode().then(function () { ready(i, img); }, function () { ready(i, img); });
        else ready(i, img);
      };
      img.src = base + String(i + 1).padStart(3, "0") + ".webp";
    };
    load(0);
    var later = window.requestIdleCallback ? function (f) { window.requestIdleCallback(f, { timeout: 800 }); } : function (f) { setTimeout(f, 300); };
    later(function () { for (var i = 1; i < N; i++) load(i); });
    size();
    addEventListener("resize", size);

    // desktop: panel on the right of the headline; phone: card under the headline
    var open = opener(win, inner, desktop ? { x: 0.55, y: 0.09, w: 0.41, h: 0.82 } : { x: 0.05, y: 0.5, w: 0.9, h: 0.38 });
    var paint = function (p) {
      var o = Math.min(1, p / 0.42);
      open(o);
      shade.style.opacity = o;
      want = Math.min(N - 1, Math.round(Math.max(0, (p - 0.08) / 0.92) * (N - 1)));
      draw(want);
      cue.style.opacity = p > 0.03 ? 0 : 1;
      var t = Math.min(1, Math.max(0, (p - 0.5) / 0.3));
      trust.style.transform = "translate3d(0," + (100 - t * 100) + "%,0)";
      trust.style.opacity = t;
    };
    paint(0);
    // phones get a short glide on top of the finger so the film flows instead of stepping frame to frame
    var hero = { p: 0 };
    gsap.to(hero, { p: 1, ease: "none", onUpdate: function () { paint(hero.p); },
      scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: desktop ? true : 0.45,
        onToggle: function (self) { document.body.classList.toggle("in-hero", self.isActive); } } });
    document.body.classList.add("in-hero");

    $$("[data-count]", stage).forEach(function (el) {
      var end = parseFloat(el.dataset.count), obj = { v: 0 }, done = false;
      ST.create({ trigger: stage, start: "top+=" + Math.round(innerHeight * 0.35) + " top", onEnter: function () {
        if (done) return; done = true;
        gsap.to(obj, { v: end, duration: 1.4, ease: EASE, onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString("en-GB"); } });
      } });
    });
  }

  /* ---------- headings: words rise out of a mask, same feel as the hero ---------- */
  $$(".head h2, .page-head h1, .course-head h1, .enquire h2, .enquire h1, .csec h2, .two h3").forEach(function (h) {
    if (h.children.length) return;
    var text = h.textContent.trim();
    h.setAttribute("aria-label", text);
    h.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="w" aria-hidden="true"><span>' + w.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</span></span>"; }).join(" ");
    h.classList.add("wsplit");
    var words = $$(".w > span", h);
    gsap.set(words, { yPercent: 115 });
    ST.create({ trigger: h, start: "top 92%", once: true, onEnter: function () { gsap.to(words, { yPercent: 0, duration: 0.95, ease: EASE, stagger: 0.035 }); } });
  });

  /* ---------- Our Qualifications ---------- */
  var routes = document.querySelector("[data-routes]");
  if (routes) {
    var track = routes.querySelector(".routes-track"), panels = $$(".rt", track);
    if (desktop) {
      // pinned film strip: the panels slide sideways as you scroll down
      routes.classList.add("is-pinned");
      var counter = routes.querySelector("[data-routes-i]");
      var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
      var slide = gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: routes, start: "top top", pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
          end: function () { return "+=" + Math.round(dist() * 0.6); },
          onUpdate: function (self) { if (counter) counter.textContent = "0" + Math.min(panels.length, Math.round(self.progress * (panels.length - 1)) + 1); }
        }
      });
      panels.forEach(function (p) {
        gsap.fromTo(p.querySelector(".rt-media img"), { xPercent: -6 }, { xPercent: 6, ease: "none", scrollTrigger: { trigger: p, containerAnimation: slide, start: "left right", end: "right left", scrub: true } });
      });
    }
    // phones: a plain list of cards. No pinning, swiping or scroll-driven motion: the page just scrolls.
  }

  /* ---------- contact band: framed photo opens to full screen as you arrive (bookends the hero) ---------- */
  $$("[data-band]").forEach(function (band) {
    var bs = band.querySelector(".band-shade");
    band.classList.add("is-scroll");
    var openBand = opener(band.querySelector(".band-media"), band.querySelector(".band-inner"),
      desktop ? { x: 0.52, y: 0.1, w: 0.44, h: 0.8 } : { x: 0.05, y: 0.04, w: 0.9, h: 0.3 });
    var run = function (p) { openBand(p); bs.style.opacity = 0.35 + 0.65 * p; };
    run(0);
    ST.create({ trigger: band, start: "top 90%", end: desktop ? "top 15%" : "top 10%", scrub: true, onUpdate: function (self) { run(self.progress); } });
  });

  /* ---------- section reveals ---------- */
  ST.batch("[data-reveal]", {
    start: "top 90%", once: true,
    onEnter: function (els) { els.forEach(function (e) { e.classList.add("in"); }); gsap.fromTo(els, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE, stagger: 0.06, clearProps: "transform" }); }
  });
  $$("[data-cards]").forEach(function (grid) {
    var cards = $$(".ccard", grid);
    gsap.set(cards, { autoAlpha: 0, y: 28 });
    ST.batch(cards, { start: "top 95%", once: true, onEnter: function (els) {
      gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE, stagger: desktop ? 0.05 : 0.08, clearProps: "transform" });
      gsap.fromTo(els.map(function (e) { return e.querySelector(".img img"); }), { scale: 1.18 }, { scale: 1, duration: 1.2, ease: EASE, stagger: desktop ? 0.05 : 0.08, clearProps: "transform" });
    } });
  });

  /* ---------- the route: steps light in order; the card flips Red -> Blue with the scroll ---------- */
  $$("[data-route]").forEach(function (route) {
    var steps = $$(".steps > div", route), flip = route.querySelector(".flip");
    gsap.set(steps, { autoAlpha: 0.35 });
    steps.forEach(function (s) {
      ST.create({ trigger: s, start: "top 70%", once: true, onEnter: function () { s.classList.add("lit"); gsap.to(s, { autoAlpha: 1, duration: 0.5, ease: EASE, overwrite: true }); } });
    });
    if (!flip) return;
    var st = desktop
      ? { trigger: steps[1] || route, start: "top 70%", endTrigger: steps[3] || route, end: "top 45%", scrub: 0.4 }
      : { trigger: flip, start: "top 80%", end: "top 25%", scrub: 0.4 };
    gsap.fromTo(flip, { rotateY: 0, rotateX: 10 }, { rotateY: 180, rotateX: 0, ease: "none", scrollTrigger: st });
  });

  /* ---------- The Axel Advantage: each point lights up as it crosses the middle; the photo and counter follow ---------- */
  $$("[data-adv]").forEach(function (sec) {
    var items = $$(".why-list > div", sec), imgs = $$(".adv-media img", sec), num = sec.querySelector("[data-adv-n]");
    var set = function (i) {
      items.forEach(function (el, k) { el.classList.toggle("active", k === i); });
      imgs.forEach(function (im, k) { im.classList.toggle("on", k === i); });
      if (num) num.textContent = "0" + (i + 1);
    };
    set(0);
    items.forEach(function (el, i) {
      ST.create({ trigger: el, start: "top 62%", end: "bottom 62%", onToggle: function (self) { if (self.isActive) set(i); } });
    });
  });

  /* ---------- paragraphs ink in word by word as you read ---------- */
  $$("[data-ink], .csec:first-child .prose > p:first-child").forEach(function (p) {
    if (p.children.length) return;
    var words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map(function (w) { return '<span class="iw">' + w.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</span>"; }).join(" ");
    p.classList.add("ink");
    gsap.to($$(".iw", p), { opacity: 1, ease: "none", stagger: 0.08, scrollTrigger: { trigger: p, start: "top 88%", end: desktop ? "top 55%" : "top 45%", scrub: true } });
  });

  /* ---------- reviews: quote mark swings in, stars pop one by one ---------- */
  $$(".review").forEach(function (r) {
    var q = r.querySelector(".qmark"), stars = $$(".stars svg", r);
    gsap.set(stars, { scale: 0 });
    if (q) gsap.set(q, { scale: 0.4, rotate: -18, opacity: 0 });
    ST.create({ trigger: r, start: "top 85%", once: true, onEnter: function () {
      gsap.to(stars, { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.07, delay: 0.15 });
      if (q) gsap.to(q, { scale: 1, rotate: 0, opacity: 0.18, duration: 0.9, ease: EASE });
    } });
  });

  /* ---------- course pages: bullets rise in with their ticks popping; reading bar along the top ---------- */
  $$(".csec .prose ul").forEach(function (ul) {
    var lis = $$(":scope > li", ul);
    gsap.set(lis, { autoAlpha: 0, y: 16 });
    ST.batch(lis, { start: "top 92%", once: true, onEnter: function (els) {
      els.forEach(function (li, k) { setTimeout(function () { li.classList.add("pop"); }, k * 70 + 120); });
      gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE, stagger: 0.07, clearProps: "transform" });
    } });
  });
  var body = document.querySelector(".course-body");
  if (body) {
    var bar = document.createElement("div");
    bar.className = "readbar"; bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    ST.create({ trigger: body, start: "top 20%", end: "bottom bottom", onUpdate: function (self) { bar.style.transform = "scaleX(" + self.progress.toFixed(4) + ")"; } });
  }

  /* ---------- gentle parallax on big photos ---------- */
  $$("[data-parallax]").forEach(function (box) {
    var img = box.querySelector("img");
    if (img) gsap.fromTo(img, { yPercent: -4, scale: 1.08 }, { yPercent: 4, scale: 1.08, ease: "none", scrollTrigger: { trigger: box, start: "top bottom", end: "bottom top", scrub: true } });
  });

  addEventListener("load", function () { ST.refresh(); });
})();
