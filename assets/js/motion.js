/* Axel Construction Training: scroll motion.
   Home hero (desktop): the film is a canvas image sequence; the scroll picks the frame directly.
   The panel opens with transforms only (GPU), so nothing is repainted while you scroll.
   Native scrolling throughout. Falls back to a still image if anything is missing. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop = window.matchMedia("(min-width: 900px)").matches;
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function revealAll() { $$("[data-reveal]").forEach(function (el) { el.classList.add("in"); }); }

  var stage = document.querySelector(".stage");
  var video = stage && stage.querySelector(".stage-video");

  // phones (and reduced motion): a light looping film, no scrubbing
  if (video && (!desktop || reduced)) {
    if (!reduced) {
      video.src = video.dataset.src; video.muted = true; video.loop = true; video.autoplay = true;
      video.addEventListener("loadeddata", function () { video.classList.add("ready"); }, { once: true });
      video.play().catch(function () {});
    }
  }

  if (!window.gsap || !window.ScrollTrigger || reduced) { revealAll(); return; }
  doc.classList.add("motion");
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  /* ---------- home hero (desktop) ---------- */
  if (stage && desktop) {
    var pin = stage.querySelector(".stage-pin"), win = stage.querySelector(".stage-media"),
        inner = stage.querySelector(".stage-inner"), canvas = stage.querySelector(".stage-canvas"),
        shade = stage.querySelector(".stage-shade"), trust = stage.querySelector(".stage-trust"),
        cue = stage.querySelector(".scroll-cue");
    var ctx = canvas.getContext("2d");
    var N = parseInt(canvas.dataset.count, 10), base = canvas.dataset.base, frames = new Array(N), loaded = new Array(N);
    var W = 0, H = 0, current = -1, want = 0;
    stage.classList.add("is-scroll");

    function draw(i) {
      // nearest frame that has arrived
      var k = i; while (k > 0 && !loaded[k]) k--;
      if (!loaded[k] || k === current) return;
      current = k;
      var img = frames[k], s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (W - dw) * 0.62, (H - dh) / 2, dw, dh); // bias right so the machine stays in shot
    }
    function size() {
      var r = pin.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      canvas.width = W; canvas.height = H; current = -1; draw(want);
    }
    function load(i) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () { loaded[i] = true; if (i === 0 || i <= want) { current = -1; draw(want); } if (i === 0) canvas.classList.add("ready"); };
      img.src = base + String(i + 1).padStart(3, "0") + ".webp";
      frames[i] = img;
    }
    load(0);
    // fetch the rest once the page has settled, in order
    var later = window.requestIdleCallback ? function (f) { window.requestIdleCallback(f, { timeout: 800 }); } : function (f) { setTimeout(f, 300); };
    later(function () { for (var i = 1; i < N; i++) load(i); });
    size();
    addEventListener("resize", size);

    // window opens from a framed panel to full screen (scale + counter-scale: no repaint)
    var P = { x: 0.55, y: 0.09, w: 0.41, h: 0.82 };
    function open(p) {
      var sx = P.w + (1 - P.w) * p, sy = P.h + (1 - P.h) * p, tx = P.x * (1 - p) * 100, ty = P.y * (1 - p) * 100;
      win.style.transform = "translate(" + tx + "%," + ty + "%) scale(" + sx + "," + sy + ")";
      // exact inverse: the picture stays still on screen while the window opens around it
      inner.style.transform = "scale(" + (1 / sx) + "," + (1 / sy) + ") translate(" + (-tx) + "%," + (-ty) + "%)";
      shade.style.opacity = p;
    }
    open(0);

    ST.create({
      trigger: stage, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: function (self) {
        var p = self.progress;
        open(Math.min(1, p / 0.45));
        want = Math.min(N - 1, Math.round(Math.max(0, (p - 0.1) / 0.9) * (N - 1)));
        draw(want);
        cue.style.opacity = p > 0.03 ? 0 : 1;
        var t = Math.min(1, Math.max(0, (p - 0.5) / 0.3));
        trust.style.transform = "translateY(" + (100 - t * 100) + "%)";
        trust.style.opacity = t;
      }
    });

    $$("[data-count]", stage).forEach(function (el) {
      var end = parseFloat(el.dataset.count), obj = { v: 0 }, done = false;
      ST.create({ trigger: stage, start: "top+=" + Math.round(innerHeight * 0.35) + " top", onEnter: function () {
        if (done) return; done = true;
        gsap.to(obj, { v: end, duration: 1.4, ease: "power3.out", onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString("en-GB"); } });
      } });
    });
  } else if (stage) {
    $$("[data-count]", stage).forEach(function (el) { el.textContent = Number(el.dataset.count).toLocaleString("en-GB"); });
  }

  var EASE = "power3.out";

  /* ---------- headings: words rise out of a mask, same feel as the hero ---------- */
  $$(".head h2, .page-head h1, .course-head h1, .enquire h2").forEach(function (h) {
    if (h.children.length) return; // only plain-text headings
    var text = h.textContent.trim();
    h.setAttribute("aria-label", text);
    h.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="w" aria-hidden="true"><span>' + w.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</span></span>"; }).join(" ");
    h.classList.add("wsplit");
    var words = $$(".w > span", h);
    gsap.set(words, { yPercent: 115 });
    ST.create({ trigger: h, start: "top 90%", once: true, onEnter: function () { gsap.to(words, { yPercent: 0, duration: 0.95, ease: EASE, stagger: 0.035 }); } });
  });

  /* ---------- qualifications: pinned film strip (desktop) ---------- */
  var routes = document.querySelector("[data-routes]");
  if (routes && desktop) {
    routes.classList.add("is-pinned");
    var track = routes.querySelector(".routes-track"), panels = $$(".rt", track), counter = routes.querySelector("[data-routes-i]");
    var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
    var slide = gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: {
        trigger: routes, start: "top top", pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
        end: function () { return "+=" + Math.round(dist() * 0.6); }, // the strip moves faster than the page: less scrolling
        onUpdate: function (self) { if (counter) counter.textContent = "0" + Math.min(panels.length, Math.round(self.progress * (panels.length - 1)) + 1); }
      }
    });
    // depth: each photo drifts against the slide
    panels.forEach(function (p) {
      gsap.fromTo(p.querySelector(".rt-media img"), { xPercent: -6 }, { xPercent: 6, ease: "none", scrollTrigger: { trigger: p, containerAnimation: slide, start: "left right", end: "right left", scrub: true } });
    });
  }

  /* ---------- enquiry band: framed photo opens to full screen as you arrive ---------- */
  $$("[data-band]").forEach(function (band) {
    if (!desktop) return;
    var bm = band.querySelector(".band-media"), bi = band.querySelector(".band-inner"), bs = band.querySelector(".band-shade");
    band.classList.add("is-scroll");
    var F = { x: 0.52, y: 0.1, w: 0.44, h: 0.8 };
    var openBand = function (p) {
      var sx = F.w + (1 - F.w) * p, sy = F.h + (1 - F.h) * p, tx = F.x * (1 - p) * 100, ty = F.y * (1 - p) * 100;
      bm.style.transform = "translate(" + tx + "%," + ty + "%) scale(" + sx + "," + sy + ")";
      bi.style.transform = "scale(" + (1 / sx) + "," + (1 / sy) + ") translate(" + (-tx) + "%," + (-ty) + "%)";
      bs.style.opacity = 0.35 + 0.65 * p;
    };
    openBand(0);
    ST.create({ trigger: band, start: "top 85%", end: "top 15%", scrub: true, onUpdate: function (self) { openBand(self.progress); } });
  });

  /* ---------- section reveals (opacity + transform only) ---------- */
  ST.batch("[data-reveal]", {
    start: "top 90%", once: true,
    onEnter: function (els) { els.forEach(function (e) { e.classList.add("in"); }); gsap.fromTo(els, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.06, clearProps: "transform" }); }
  });
  $$("[data-cards]").forEach(function (grid) {
    var cards = $$(".ccard", grid);
    gsap.set(cards, { autoAlpha: 0, y: 20 });
    ST.batch(cards, { start: "top 94%", once: true, onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.05, clearProps: "transform" }); } });
  });
  // the route: each step lights as it reaches the middle of the screen; the card flips Red -> Blue across the steps
  $$("[data-route]").forEach(function (route) {
    var steps = $$(".steps > div", route), flip = route.querySelector(".flip");
    gsap.set(steps, { autoAlpha: 0.35 });
    steps.forEach(function (s) {
      ST.create({ trigger: s, start: "top 66%", once: true, onEnter: function () { s.classList.add("lit"); gsap.to(s, { autoAlpha: 1, duration: 0.5, ease: "power2.out", overwrite: true }); } });
    });
    if (flip && desktop) {
      gsap.fromTo(flip, { rotateY: 0, rotateX: 8 }, { rotateY: 180, rotateX: 0, ease: "none", scrollTrigger: { trigger: steps[1] || route, start: "top 70%", endTrigger: steps[3] || route, end: "top 45%", scrub: 0.4 } });
    } else if (flip) {
      ST.create({ trigger: route, start: "bottom 85%", once: true, onEnter: function () { gsap.to(flip, { rotateY: 180, duration: 1, ease: "power2.inOut" }); } });
    }
  });
  $$("[data-parallax]").forEach(function (box) {
    var img = box.querySelector("img");
    if (img) gsap.fromTo(img, { yPercent: -4, scale: 1.08 }, { yPercent: 4, scale: 1.08, ease: "none", scrollTrigger: { trigger: box, start: "top bottom", end: "bottom top", scrub: true } });
  });
  addEventListener("load", function () { ST.refresh(); });
})();
