// Whitepaper TOC behavior — vanilla JS, no dependencies.
// 1. Desktop keeps the <details> TOC open; mobile starts it collapsed and
//    closes it again after a link is tapped.
// 2. Scrollspy: the TOC entry for the section currently in view gets .active.
//    Computed directly in the scroll handler (time-throttled) rather than via
//    requestAnimationFrame, which stalls entirely in backgrounded tabs.
(function () {
  "use strict";

  var toc = document.getElementById("toc");
  if (!toc) return;

  var mobile = window.matchMedia("(max-width: 860px)");

  function syncDisclosure() {
    // Desktop: always open (summary is hidden by CSS). Mobile: start closed.
    toc.open = !mobile.matches;
  }
  syncDisclosure();
  mobile.addEventListener("change", syncDisclosure);

  // Collapse the mobile disclosure after navigating to a section.
  toc.addEventListener("click", function (e) {
    if (mobile.matches && e.target.closest("a")) toc.open = false;
  });

  // ----- Scrollspy -----
  var links = {};
  toc.querySelectorAll("a[href^='#']").forEach(function (a) {
    links[a.getAttribute("href").slice(1)] = a;
  });
  var headings = Array.prototype.filter.call(
    document.querySelectorAll(".article h1[id], .article h2[id]"),
    function (h) { return links[h.id]; }
  );
  if (headings.length === 0) return;

  var current = null;
  function setActive(id) {
    if (current === id) return;
    if (current && links[current]) links[current].classList.remove("active");
    current = id;
    if (links[id]) {
      links[id].classList.add("active");
      // keep the active entry visible inside the scrolling sidebar
      if (!mobile.matches && links[id].scrollIntoView) {
        links[id].scrollIntoView({ block: "nearest" });
      }
    }
  }

  function spy() {
    // the heading most recently scrolled past a 120px band from the top wins
    var y = 120;
    var active = headings[0];
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= y) active = headings[i];
      else break;
    }
    setActive(active.id);
  }

  // Throttle by timestamp (~10 checks/sec is plenty for a reading page).
  var last = 0;
  window.addEventListener("scroll", function () {
    var now = Date.now();
    if (now - last > 100) { last = now; spy(); }
  }, { passive: true });
  window.addEventListener("hashchange", spy);
  spy();
})();
