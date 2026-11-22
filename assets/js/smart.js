/* Axel Construction Training: course finder, shortlist, smart header, magnetic buttons, page-transition hand-off */
(function () {
  "use strict";
  var COURSES = window.AXEL_COURSES || [];
  var BY_SLUG = {};
  COURSES.forEach(function (c) { c.slug = c.url.replace(/\.html$/, ""); BY_SLUG[c.slug] = c; });
  var fine = window.matchMedia("(pointer: fine)").matches;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function track(e, p) { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: e }, p || {})); } catch (x) {} }

  /* ---------- shortlist (kept in this browser only) ---------- */
  var KEY = "axel-shortlist", list = [];
  try { list = JSON.parse(localStorage.getItem(KEY) || "[]").filter(function (s) { return BY_SLUG[s]; }); } catch (e) { list = []; }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  var pill = $(".sl-pill"), drawer = $(".sl-drawer"), slList = $(".sl-list");
  function has(slug) { return list.indexOf(slug) > -1; }
  function render() {
    $$("[data-save]").forEach(function (b) { b.setAttribute("aria-pressed", has(b.dataset.save)); });
    if (pill) { pill.hidden = list.length === 0; $("[data-sl-count]", pill).textContent = list.length; }
    if (slList) {
      slList.innerHTML = list.map(function (s) {
        var c = BY_SLUG[s];
        return '<li><img src="' + c.img + '" alt=""><a href="' + c.url + '">' + esc(c.name) + "<small>" + c.scheme + " · " + c.code + '</small></a><button type="button" data-sl-remove="' + s + '" aria-label="Remove ' + esc(c.name) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></li>';
      }).join("") || '<li style="border:0;color:var(--muted)">Nothing saved yet. Tap the bookmark on any course.</li>';
    }
    $$(".sl-chips").forEach(function (box) {
      box.hidden = list.length === 0;
      $("div", box).innerHTML = list.map(function (s) { return "<span>" + esc(BY_SLUG[s].code + " " + BY_SLUG[s].name) + "</span>"; }).join("");
    });
  }
  function toggle(slug, btn) {
    if (has(slug)) list.splice(list.indexOf(slug), 1);
    else { list.push(slug); track("shortlist_add", { course: slug }); }
    persist(); render();
    if (btn && !reduced) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
    if (pill && !reduced) { pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump"); }
  }
  window.AxelShortlist = {
    items: function () { return list.map(function (s) { return BY_SLUG[s].scheme + " " + BY_SLUG[s].code + " " + BY_SLUG[s].name; }); },
    add: function (slugs) { slugs.forEach(function (s) { if (!has(s)) list.push(s); }); persist(); render(); },
    clear: function () { list = []; persist(); render(); }
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-save]");
    if (b) { e.preventDefault(); toggle(b.dataset.save, b); return; }
    var r = e.target.closest("[data-sl-remove]");
    if (r) { toggle(r.dataset.slRemove); return; }
    if (e.target.closest("[data-sl-open]")) { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); return; }
    if (e.target.closest("[data-sl-close]") || e.target === drawer) { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer) { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); } });
  render();

  /* ---------- course finder ---------- */
  var RULES = {
    excavators: /excavator|dragline/i,
    dumpers: /dumper|dump truck/i,
    handlers: /telescopic|forklift|lift truck|reach truck|side loader|skip handler|log handler/i,
    cranes: /crane|hoist|lifting|slinger|signaller|lorry loader|knuckle|supervisor/i,
    earthmoving: /roller|dozer|grader|shovel|scraper|compactor|paver|planer|stabiliser|trencher|skid steer|tractor/i,
    access: /mewp|mast|harness/i,
    safety: /marshal|safety|night|hitch|securer|cable|vehicle/i
  };
  var TIPS = {
    "new": ["Start with full training and the test.", "Course length depends on the machine. For example, the A02 Crawler Crane and N202 Excavator 360 courses run over 10 days. We offer weekend and evening options so you can train around your job."],
    exp: ["You may only need the test.", "Experienced operators can often go straight to a shorter test. Tell us your experience and we'll recommend the quickest route to your card."],
    nvq: ["The NVQ gets you the Blue card.", "Complete a relevant NVQ with on-site experience to move from the Red Trained Operator card to the Blue Competent Operator card, valid for 5 years. You'll need a valid CITB Health, Safety & Environment Test certificate."]
  };
  var cf = $("[data-finder]");
  if (cf) {
    var panels = $$(".cf-panel", cf), dots = $$(".cf-steps li", cf), pick = { type: null, exp: null }, matches = [];
    var box = $(".cf-panels", cf);
    var go = function (n) {
      // glide the box to the new step's height instead of jumping
      var from = box.offsetHeight;
      panels.forEach(function (p, i) { p.classList.toggle("on", i === n - 1); p.classList.toggle("left", i < n - 1); });
      var to = panels[n - 1].offsetHeight;
      if (!reduced && from !== to) {
        box.style.height = from + "px";
        void box.offsetHeight;
        box.style.height = to + "px";
        setTimeout(function () { box.style.height = ""; }, 480);
      }
      if (n > 1) { var top = cf.getBoundingClientRect().top; if (top < 0 || top > innerHeight * 0.5) cf.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); }
      dots.forEach(function (d, i) { d.classList.toggle("on", i === n - 1); d.classList.toggle("done", i < n - 1); });
      var first = panels[n - 1].querySelector("button, a");
      if (first && n > 1) setTimeout(function () { first.focus({ preventScroll: true }); }, 50);
    };
    var result = function () {
      var rx = RULES[pick.type];
      matches = rx ? COURSES.filter(function (c) { return rx.test(c.name); }) : [];
      var tip = TIPS[pick.exp], box = $(".cf-result", cf);
      var items = matches.slice(0, 8).map(function (c, i) {
        return '<li style="animation-delay:' + (i * 0.04) + 's"><a href="' + c.url + '"><img src="' + c.img + '" alt="" loading="lazy"><span><b>' + esc(c.name) + "</b><small>" + c.scheme + " · " + c.code + "</small></span></a></li>";
      }).join("");
      var more = matches.length > 8 ? '<p class="cf-tip" style="margin-top:12px">Plus ' + (matches.length - 8) + ' more. <button class="link" type="button" data-search>See them all</button></p>' : "";
      var nvqLink = pick.exp === "nvq" ? '<a class="btn secondary" href="nvq.html">About the NVQ</a>' : "";
      box.innerHTML = "<h3>" + tip[0] + "</h3><p class=\"cf-tip\">" + tip[1] + "</p>" +
        (items ? '<ul class="cf-list">' + items + "</ul>" + more : '<p class="cf-tip" style="margin-top:12px">Tell us what you operate and an advisor will find the right category.</p>') +
        '<div class="cf-actions"><button class="btn" type="button" data-cf-enquire>' + (items ? "Enquire about these" : "Ask an advisor") + "</button>" + nvqLink + "</div>";
      track("finder_complete", { type: pick.type, experience: pick.exp, results: matches.length });
      go(3);
    };
    cf.addEventListener("click", function (e) {
      var t = e.target.closest("[data-type]"), x = e.target.closest("[data-exp]");
      if (t) { pick.type = t.dataset.type; go(2); return; }
      if (x) { pick.exp = x.dataset.exp; result(); return; }
      if (e.target.closest("[data-back]")) { go(1); return; }
      if (e.target.closest("[data-restart]")) { pick = { type: null, exp: null }; go(1); return; }
      if (e.target.closest("[data-cf-enquire]")) {
        window.AxelShortlist.add(matches.slice(0, 8).map(function (c) { return c.slug; }));
        var lvl = { "new": "New to this machine", exp: "Experienced, need the test", nvq: "Renewal or card upgrade" }[pick.exp];
        try { sessionStorage.setItem("axel-level", lvl); } catch (err) {}
        location.href = "contactus.html#enquire";
      }
    });
  }
  // carry the finder's experience answer into the enquiry form
  try {
    var lvl = sessionStorage.getItem("axel-level");
    if (lvl) $$("select[name=level]").forEach(function (s) { s.value = lvl; });
  } catch (e) {}

  /* ---------- header: tuck away on the way down, back on the way up ---------- */
  var nav = $(".nav"), lastY = window.scrollY, ticking = false;
  if (nav) addEventListener("scroll", function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (Math.abs(y - lastY) > 6) { nav.classList.toggle("away", y > lastY && y > 140 && !nav.classList.contains("open")); lastY = y; }
      ticking = false;
    });
  }, { passive: true });

  /* ---------- magnetic buttons (mouse only) ---------- */
  if (fine && !reduced) $$("[data-magnetic]").forEach(function (b) {
    b.addEventListener("pointermove", function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18) + "px," + ((e.clientY - r.top - r.height / 2) * 0.28) + "px)";
    });
    b.addEventListener("pointerleave", function () { b.style.transform = ""; });
  });

  /* ---------- course photo flows into the next page's header ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest(".ccard-link");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    $$(".ccard .img img").forEach(function (i) { i.style.viewTransitionName = ""; });
    var img = a.querySelector(".img img");
    if (img) img.style.viewTransitionName = "course-photo";
  });
  addEventListener("pageshow", function () { $$(".ccard .img img").forEach(function (i) { i.style.viewTransitionName = ""; }); });
})();
