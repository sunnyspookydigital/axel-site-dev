/* Axel Construction Training — site behaviour (no dependencies) */
(function () {
  "use strict";
  var CFG = window.AXEL_CONFIG || {};
  var COURSES = window.AXEL_COURSES || [];
  var doc = document.documentElement;
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  doc.classList.add("js");

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }

  /* ---------- analytics (GA4 / GTM ready) ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    try {
      var p = params || {};
      window.dataLayer.push(Object.assign({ event: event }, p));
      if (typeof window.gtag === "function") window.gtag("event", event, p);
    } catch (e) {}
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (h.indexOf("tel:") === 0) track("phone_click", { location: a.dataset.loc || "page" });
    else if (h.indexOf("mailto:") === 0) track("email_click", { location: a.dataset.loc || "page" });
    else if (/tiktok|instagram/.test(h)) track("social_click", { network: /tiktok/.test(h) ? "tiktok" : "instagram" });
  });

  /* ---------- nav ---------- */
  var nav = $(".nav"), burger = $(".burger"), bar = $(".progress"), mbar = $(".mbar");
  function onScroll() {
    var y = window.scrollY || 0;
    if (nav) nav.classList.toggle("scrolled", y > 20);
    if (bar) {
      var h = doc.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
    }
    if (mbar) mbar.classList.toggle("show", y > 380);
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (burger) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open);
    });
    $$(".nav-links a").forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); document.body.classList.remove("menu-open"); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") nav.classList.remove("open"); });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add("in"); else io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
  // stagger helper
  $$("[data-stagger]").forEach(function (wrap) {
    var step = parseFloat(wrap.dataset.stagger) || 0.08;
    $$("[data-reveal]", wrap).forEach(function (el, i) { el.style.setProperty("--d", (i % 8) * step + "s"); });
  });

  /* ---------- counters ---------- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "", dur = 1600, t0 = null;
    var fmt = function (v) { return Math.round(v).toLocaleString("en-GB"); };
    if (reduced) { el.textContent = fmt(target); return; }
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { countUp(x.target); cio.unobserve(x.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- spotlight + tilt ---------- */
  $$(".qual").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--mx", x + "px"); card.style.setProperty("--my", y + "px");
      if (!reduced && e.pointerType === "mouse") {
        var rx = ((y / r.height) - 0.5) * -6, ry = ((x / r.width) - 0.5) * 6;
        card.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-6px)";
      }
    });
    card.addEventListener("pointerleave", function () { card.style.transform = ""; });
  });

  /* ---------- horizontal rail ---------- */
  $$("[data-rail]").forEach(function (wrap) {
    var rail = $(".rail", wrap.parentNode) || $(".rail", wrap);
    var prev = $("[data-prev]", wrap), next = $("[data-next]", wrap);
    if (!rail) return;
    function by(d) { rail.scrollBy({ left: d * Math.min(rail.clientWidth * 0.8, 620), behavior: reduced ? "auto" : "smooth" }); }
    if (prev) prev.addEventListener("click", function () { by(-1); });
    if (next) next.addEventListener("click", function () { by(1); });
    var down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener("pointermove", function (e) {
      if (!down) return; var dx = e.clientX - sx; moved = Math.abs(dx);
      if (moved > 5) rail.classList.add("dragging");
      rail.scrollLeft = sl - dx;
    });
    addEventListener("pointerup", function () { down = false; setTimeout(function () { rail.classList.remove("dragging"); }, 0); });
  });

  /* ---------- listing filter (CPCS / NPORS) ---------- */
  var grid = $("[data-grid]");
  if (grid) {
    var cards = $$(".ccard", grid), q = $("#course-filter"), countEl = $("[data-count-label]"), empty = $(".empty");
    var group = "all";
    function apply() {
      var term = (q && q.value || "").trim().toLowerCase(), n = 0;
      cards.forEach(function (c) {
        var ok = (group === "all" || c.dataset.group === group) && (!term || c.dataset.search.indexOf(term) > -1);
        c.classList.toggle("hide", !ok);
        if (ok) n++;
      });
      if (countEl) countEl.textContent = n + (n === 1 ? " course" : " courses");
      if (empty) empty.hidden = n !== 0;
    }
    if (q) q.addEventListener("input", apply);
    $$(".filters button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".filters button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        group = b.dataset.group; apply();
        track("course_filter", { group: group });
      });
    });
    var resetBtn = $("[data-reset]");
    if (resetBtn) resetBtn.addEventListener("click", function () { if (q) q.value = ""; var all = $('.filters button[data-group="all"]'); if (all) all.click(); else apply(); });
    apply();
  }

  /* ---------- table of contents scroll-spy ---------- */
  var tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var tio = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (x.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove("active"); });
          var a = map[x.target.id]; if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) tio.observe(s); });
  }

  /* ---------- search palette ---------- */
  var pal = $(".palette"), pin = $("#pal-input"), plist = $(".pal-list"), sel = 0, results = [];
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hl(text, term) {
    if (!term) return esc(text);
    var i = text.toLowerCase().indexOf(term);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + term.length)) + "</mark>" + esc(text.slice(i + term.length));
  }
  function score(c, words) {
    var hay = (c.code + " " + c.name + " " + c.scheme + " " + c.group).toLowerCase(), s = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i], k = hay.indexOf(w);
      if (k < 0) return -1;
      s += (c.code.toLowerCase() === w ? 50 : 0) + (k === 0 ? 10 : 0) + (hay.indexOf(" " + w) > -1 ? 4 : 0);
    }
    return s;
  }
  function renderPal() {
    var term = (pin.value || "").trim().toLowerCase(), words = term.split(/\s+/).filter(Boolean);
    results = COURSES.map(function (c) { return { c: c, s: words.length ? score(c, words) : 0 }; })
      .filter(function (r) { return r.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, 40).map(function (r) { return r.c; });
    sel = 0;
    if (!results.length) {
      plist.innerHTML = '<div class="none">No course matches “' + esc(pin.value) + '”. <a class="accent" href="contactus.html">Ask us, we can probably help →</a></div>';
      return;
    }
    plist.innerHTML = results.map(function (c, i) {
      return '<a href="' + c.url + '" role="option"' + (i === 0 ? ' class="sel"' : "") + '><img src="' + c.img + '" alt="" loading="lazy" width="52" height="40"><span><span class="t">' + hl(c.name, words[0] || "") + '</span><span class="s">' + c.scheme + " · " + c.code + " · " + esc(c.group) + "</span></span></a>";
    }).join("");
  }
  function openPal() {
    if (!pal) return;
    pal.classList.add("open"); pal.setAttribute("aria-hidden", "false");
    pin.value = ""; renderPal(); pin.focus();
    track("search_open");
  }
  function closePal() { if (!pal) return; pal.classList.remove("open"); pal.setAttribute("aria-hidden", "true"); }
  if (pal) {
    $$("[data-search]").forEach(function (b) { b.addEventListener("click", openPal); });
    pal.addEventListener("click", function (e) { if (e.target === pal) closePal(); });
    pin.addEventListener("input", renderPal);
    pin.addEventListener("keydown", function (e) {
      var items = $$("a", plist);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!items.length) return;
        items[sel] && items[sel].classList.remove("sel");
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[sel].classList.add("sel"); items[sel].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && items[sel]) {
        track("search_select", { term: pin.value, course: results[sel] && results[sel].code });
        location.href = items[sel].getAttribute("href");
      }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { e.preventDefault(); openPal(); }
      if (e.key === "Escape") closePal();
    });
  }

  /* ---------- hero typed search hint ---------- */
  var typed = $(".hero-search .typed");
  if (typed && !reduced) {
    var samples = ["A40 Slinger Signaller", "360 Excavator", "Telescopic Handler", "Forward Tipping Dumper", "MEWP Boom", "Plant Marshaller"], si = 0, ci = 0, del = false;
    (function tick() {
      var s = samples[si];
      typed.textContent = s.slice(0, ci);
      if (!del && ci < s.length) ci++;
      else if (!del) { del = true; return setTimeout(tick, 1600); }
      else if (ci > 0) ci--;
      else { del = false; si = (si + 1) % samples.length; }
      setTimeout(tick, del ? 35 : 75);
    })();
  }

  /* ---------- enquiry forms ---------- */
  var params = new URLSearchParams(location.search);
  var preCourse = params.get("course");
  $$("form[data-enquiry]").forEach(function (form) {
    var sel2 = $("select[name=course]", form);
    if (sel2 && preCourse) {
      var opt = $$("option", sel2).filter(function (o) { return o.value === preCourse; })[0];
      if (opt) sel2.value = preCourse;
    }
    var phone = $("input[name=phone]", form);
    if (phone) phone.addEventListener("input", function () { phone.value = phone.value.replace(/[^0-9]/g, "").slice(0, 11); });
    var started = false;
    form.addEventListener("input", function () { if (!started) { started = true; track("form_start", { form: form.dataset.enquiry }); } });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fb = $(".feedback", form), btn = $("button[type=submit]", form);
      if ($(".hp input", form) && $(".hp input", form).value) return; // bot
      var fd = new FormData(form);
      var extra = [];
      if (fd.get("course")) extra.push("Course: " + fd.get("course"));
      if (fd.get("level")) extra.push("Experience: " + fd.get("level"));
      if (fd.get("people")) extra.push("Number of people: " + fd.get("people"));
      extra.push("Page: " + document.title);
      var payload = {
        name: (fd.get("name") || "").toString().trim(),
        email: (fd.get("email") || "").toString().trim(),
        phone: (fd.get("phone") || "").toString().trim(),
        message: ((fd.get("message") || "").toString().trim() + "\n\n" + extra.join("\n")).trim()
      };
      btn.disabled = true; var label = btn.innerHTML; btn.innerHTML = "Sending…";
      if (fb) { fb.hidden = true; fb.className = "feedback"; }
      var send = CFG.demo
        ? new Promise(function (r) { setTimeout(function () { r({ ok: true, json: function () { return Promise.resolve({}); } }); }, 700); })
        : fetch(CFG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      send
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j && res.j.error || "server");
          track("generate_lead", { form: form.dataset.enquiry, course: payload.message.match(/Course: (.*)/) ? RegExp.$1 : "" });
          form.innerHTML = '<div class="form-success"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h3>Enquiry received</h3><p class="sub">Thanks ' + esc(payload.name.split(" ")[0] || "") + ', your enquiry has been submitted successfully. One of our advisors will be in touch shortly.</p></div>';
        })
        .catch(function () {
          btn.disabled = false; btn.innerHTML = label;
          if (fb) {
            fb.hidden = false; fb.className = "feedback error";
            fb.innerHTML = "We couldn't send that just now. Please try again, or call us on <a href=\"tel:" + CFG.phoneTel + "\" style=\"text-decoration:underline\">" + CFG.phoneDisplay + "</a>.";
          }
        });
    });
  });

  /* ---------- year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
