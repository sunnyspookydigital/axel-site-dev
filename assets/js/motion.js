/* Axel Construction Training: scroll motion (GSAP + ScrollTrigger + Lenis).
   Home hero: the film starts as a framed panel, opens to full screen and is scrubbed by the scroll.
   Everywhere else: quiet reveals, image wipes, light parallax. Falls back to a static page if anything is missing. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop = window.matchMedia("(min-width: 900px)").matches;
  var touch = window.matchMedia("(pointer: coarse)").matches;
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function revealAll() { $$("[data-reveal]").forEach(function (el) { el.classList.add("in"); }); }

  var stage = document.querySelector(".stage");
  var video = stage && stage.querySelector(".stage-video");
  // pick the right film: every-frame-seekable for desktop scrubbing, light loop for phones
  if (video) {
    video.muted = true;
    video.preload = "auto";
    if (desktop && !reduced && window.fetch && window.URL) {
      // load the whole film into memory so every frame can be sought instantly, on any host
      fetch(video.dataset.desk).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (b) { video.src = URL.createObjectURL(b); video.load(); })
        .catch(function () { video.src = video.dataset.desk; video.load(); });
    } else {
      video.src = video.dataset.mobile;
      video.load();
    }
  }

  // Without GSAP or with reduced motion: show everything, let the film loop quietly.
  if (!window.gsap || !window.ScrollTrigger || reduced) {
    revealAll();
    if (video && !reduced) { video.loop = true; video.autoplay = true; video.play().catch(function () {}); }
    return;
  }
  doc.classList.add("motion");
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  /* ---------- smooth scrolling (desktop pointer only) ---------- */
  if (window.Lenis && !touch) {
    var lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a && a.getAttribute("href").length > 1) {
        var t = document.querySelector(a.getAttribute("href"));
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -80 }); }
      }
    });
  }

  /* ---------- home hero ---------- */
  if (stage) {
    var media = stage.querySelector(".stage-media"), shade = stage.querySelector(".stage-shade"),
        copy = stage.querySelector(".stage-copy"), trust = stage.querySelector(".stage-trust"),
        cue = stage.querySelector(".scroll-cue"), poster = stage.querySelector(".stage-poster");

    if (desktop) {
      stage.classList.add("is-scroll");
      var state = { open: 0, film: 0 };
      var paint = function () {
        var o = state.open, inset = 1 - o;
        // framed panel on the right -> full bleed
        media.style.clipPath = "inset(" + (9 * inset) + "% " + (4 * inset) + "% " + (9 * inset) + "% " + (55 * inset) + "% round " + (22 * inset) + "px)";
        shade.style.opacity = o;
      };
      paint();
      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: 0.6 }
      });
      tl.to(state, { open: 1, duration: 0.35, onUpdate: paint }, 0)
        .to(copy, { yPercent: -6, duration: 0.35 }, 0)
        .to(cue, { autoAlpha: 0, duration: 0.1 }, 0)
        .to(state, { film: 1, duration: 0.65 }, 0.35)
        .fromTo(trust, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.2 }, 0.4)
        .to(copy, { autoAlpha: 0.0, y: -60, duration: 0.2 }, 0.8);
      if (poster) tl.fromTo(poster, { scale: 1.12 }, { scale: 1, duration: 1 }, 0);

      // scrub the film with the scroll
      if (video) {
        var ready = false, target = 0, current = 0;
        video.pause();
        var onReady = function () { ready = true; video.classList.add("ready"); };
        if (video.readyState >= 2) onReady(); else video.addEventListener("loadeddata", onReady, { once: true });
        gsap.ticker.add(function () {
          if (!ready || !video.duration) return;
          target = state.film * (video.duration - 0.05);
          current += (target - current) * 0.18;
          if (Math.abs(video.currentTime - current) > 0.01) video.currentTime = current;
        });
      }
    } else if (video) {
      // phones: just let the film play
      video.loop = true; video.muted = true; video.autoplay = true;
      video.addEventListener("loadeddata", function () { video.classList.add("ready"); }, { once: true });
      video.play().catch(function () {});
    }

    // count the stats up once
    $$("[data-count]", stage).forEach(function (el) {
      var end = parseFloat(el.dataset.count), obj = { v: 0 };
      ST.create({ trigger: desktop ? stage : el, start: desktop ? "top+=" + (innerHeight * 0.45) + " top" : "top 90%", once: true, onEnter: function () {
        gsap.to(obj, { v: end, duration: 1.6, ease: "power3.out", onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString("en-GB"); } });
      } });
    });
  }

  /* ---------- section reveals ---------- */
  ST.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: function (els) { gsap.fromTo(els, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, onStart: function () { els.forEach(function (e) { e.classList.add("in"); }); } }); }
  });

  /* ---------- course cards: image wipe up, title follows ---------- */
  $$("[data-cards]").forEach(function (grid) {
    var cards = $$(".ccard", grid);
    gsap.set(cards, { autoAlpha: 0, y: 24 });
    ST.batch(cards, {
      start: "top 92%",
      once: true,
      onEnter: function (els) {
        gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.07 });
        gsap.fromTo(els.map(function (e) { return e.querySelector(".img"); }), { clipPath: "inset(18% 0 0 0 round 12px)" }, { clipPath: "inset(0% 0 0 0 round 12px)", duration: 1.1, ease: "power3.out", stagger: 0.07 });
      }
    });
  });

  /* ---------- the route: steps fill in order as you scroll ---------- */
  $$("[data-steps]").forEach(function (wrap) {
    var steps = $$(":scope > div", wrap);
    gsap.set(steps, { autoAlpha: 0.25 });
    steps.forEach(function (s, i) {
      ST.create({ trigger: wrap, start: "top " + (80 - i * 10) + "%", once: true, onEnter: function () { gsap.to(s, { autoAlpha: 1, duration: 0.6, ease: "power2.out" }); s.classList.add("lit"); } });
    });
  });

  /* ---------- gentle parallax on big photos ---------- */
  $$("[data-parallax]").forEach(function (box) {
    var img = box.querySelector("img");
    if (!img) return;
    gsap.fromTo(img, { yPercent: -5, scale: 1.1 }, { yPercent: 5, scale: 1.1, ease: "none", scrollTrigger: { trigger: box, start: "top bottom", end: "bottom top", scrub: true } });
  });

  addEventListener("load", function () { ST.refresh(); });
})();
