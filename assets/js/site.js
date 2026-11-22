/* Axel Construction Training: menu, search, course filter, enquiry forms, lead tracking */
(function () {
  "use strict";
  var CFG = window.AXEL_CONFIG || {};
  var COURSES = window.AXEL_COURSES || [];
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

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
  });

  /* ---------- menu + mobile bar ---------- */
  var nav = $(".nav"), burger = $(".burger"), mbar = $(".mbar");
  function closeMenu() { if (!nav) return; nav.classList.remove("open"); document.body.classList.remove("menu-open"); if (burger) burger.setAttribute("aria-expanded", "false"); }
  if (burger) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open);
    });
    $$(".nav-links a").forEach(function (a) { a.addEventListener("click", closeMenu); });
  }
  function onScroll() { if (mbar) mbar.classList.toggle("show", (window.scrollY || 0) > 400); }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- listing filter ---------- */
  var grid = $("[data-grid]");
  if (grid) {
    var q = $("#course-filter"), countEl = $("[data-count-label]"), empty = $(".empty"), jump = $(".jump");
    var cards = $$(".ccard", grid), groups = $$("[data-group-sec]", grid);
    q.addEventListener("input", function () {
      var words = (q.value || "").trim().toLowerCase().split(/\s+/).filter(Boolean), n = 0;
      cards.forEach(function (c) {
        var ok = words.every(function (w) { return c.dataset.q.indexOf(w) > -1; });
        c.classList.toggle("hide", !ok);
        if (ok) { n++; c.style.opacity = 1; c.style.visibility = "visible"; c.style.transform = "none"; }
      });
      groups.forEach(function (g) { g.classList.toggle("hide", !$(".ccard:not(.hide)", g)); });
      if (countEl) countEl.textContent = n + (n === 1 ? " course" : " courses");
      if (empty) empty.hidden = n !== 0;
      if (jump) jump.hidden = words.length > 0;
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  }

  /* ---------- search palette ---------- */
  var pal = $(".palette"), pin = $("#pal-input"), plist = $(".pal-list"), sel = 0, results = [];
  function hl(text, term) {
    if (!term) return esc(text);
    var i = text.toLowerCase().indexOf(term);
    return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + term.length)) + "</mark>" + esc(text.slice(i + term.length));
  }
  function score(c, words) {
    var hay = (c.code + " " + c.name + " " + c.scheme + " " + c.group).toLowerCase(), s = 0;
    for (var i = 0; i < words.length; i++) {
      var k = hay.indexOf(words[i]);
      if (k < 0) return -1;
      s += (c.code.toLowerCase() === words[i] ? 50 : 0) + (k === 0 ? 10 : 0) + (hay.indexOf(" " + words[i]) > -1 ? 4 : 0);
    }
    return s;
  }
  function renderPal() {
    var words = (pin.value || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    results = COURSES.map(function (c) { return { c: c, s: words.length ? score(c, words) : 0 }; })
      .filter(function (r) { return r.s >= 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 40).map(function (r) { return r.c; });
    sel = 0;
    if (!results.length) { plist.innerHTML = '<div class="none">No course matches that. <a class="link" href="contactus.html#enquire">Ask an advisor</a></div>'; return; }
    plist.innerHTML = results.map(function (c, i) {
      return '<a href="' + c.url + '" role="option"' + (i === 0 ? ' class="sel"' : "") + '><img src="' + c.img + '" alt="" loading="lazy" width="52" height="40"><span><span class="t">' + hl(c.name, words[0] || "") + '</span><span class="s">' + c.scheme + " · " + c.code + " · " + esc(c.group) + "</span></span></a>";
    }).join("");
  }
  function openPal() { pal.classList.add("open"); pal.setAttribute("aria-hidden", "false"); pin.value = ""; renderPal(); pin.focus(); track("search_open"); }
  function closePal() { pal.classList.remove("open"); pal.setAttribute("aria-hidden", "true"); }
  if (pal) {
    $$("[data-search]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openPal(); }); });
    pal.addEventListener("click", function (e) { if (e.target === pal) closePal(); });
    pin.addEventListener("input", renderPal);
    pin.addEventListener("keydown", function (e) {
      var items = $$("a", plist);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!items.length) return;
        items[sel].classList.remove("sel");
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[sel].classList.add("sel"); items[sel].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && items[sel]) { location.href = items[sel].getAttribute("href"); }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { e.preventDefault(); openPal(); }
      if (e.key === "Escape") { closePal(); closeMenu(); }
    });
  }

  /* ---------- enquiry forms ---------- */
  var preCourse = new URLSearchParams(location.search).get("course");
  $$("form[data-enquiry]").forEach(function (form) {
    var sel2 = $("select[name=course]", form);
    if (sel2 && preCourse && $$("option", sel2).some(function (o) { return o.value === preCourse; })) sel2.value = preCourse;
    var phone = $("input[name=phone]", form);
    if (phone) phone.addEventListener("input", function () { phone.value = phone.value.replace(/[^0-9]/g, "").slice(0, 11); });
    var started = false;
    form.addEventListener("input", function () { if (!started) { started = true; track("form_start", { form: form.dataset.enquiry }); } });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fb = $(".feedback", form), btn = $("button[type=submit]", form);
      if ($(".hp input", form).value) return;
      var bad = $$("[required]", form).filter(function (i) { return !i.checkValidity(); })[0];
      if (bad) {
        fb.hidden = false; fb.className = "feedback error";
        fb.textContent = bad.name === "phone" ? "Enter an 11-digit mobile number starting with 07." : bad.name === "email" ? "Enter a valid email address." : "Please enter your name.";
        bad.focus(); return;
      }
      var fd = new FormData(form), extra = [];
      if (fd.get("course")) extra.push("Course: " + fd.get("course"));
      if (fd.get("level")) extra.push("Experience: " + fd.get("level"));
      var sl = window.AxelShortlist ? window.AxelShortlist.items() : [];
      if (sl.length) extra.push("Shortlist: " + sl.join("; "));
      extra.push("Page: " + document.title);
      var payload = {
        name: String(fd.get("name") || "").trim(), email: String(fd.get("email") || "").trim(), phone: String(fd.get("phone") || "").trim(),
        message: (String(fd.get("message") || "").trim() + "\n\n" + extra.join("\n")).trim()
      };
      btn.disabled = true; btn.textContent = "Sending…"; fb.hidden = true;
      var send = CFG.demo
        ? new Promise(function (r) { setTimeout(function () { r({ ok: true }); }, 700); })
        : fetch(CFG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      send.then(function (r) { if (!r.ok) throw new Error("server"); })
        .then(function () {
          track("generate_lead", { form: form.dataset.enquiry, course: fd.get("course") || "", shortlist: sl.length });
          if (window.AxelShortlist) window.AxelShortlist.clear();
          form.innerHTML = '<div class="form-success"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h3>Enquiry received</h3><p>Thanks ' + esc(payload.name.split(" ")[0]) + ', your enquiry has been submitted successfully. An advisor will be in touch shortly.</p></div>';
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = "Send enquiry";
          fb.hidden = false; fb.className = "feedback error";
          fb.innerHTML = "We couldn't send that just now. Please try again, or call <a href=\"tel:" + CFG.phoneTel + "\" style=\"text-decoration:underline\">" + CFG.phoneDisplay + "</a>.";
        });
    });
  });

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
