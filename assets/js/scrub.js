/* Прорисовка листов по прокрутке (scroll-scrub), полоса чтения, появление карточек, полноэкранный лист */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  if (!reduce) root.classList.add("js-scrub");
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const sheets = [];

  function prepare(sec) {
    const svg = sec.querySelector(".sheet__draw svg");
    if (!svg || sec._ready) return;
    const vb = svg.viewBox && svg.viewBox.baseVal;
    if (vb && vb.width && vb.height / vb.width > 1.1) sec.classList.add("scrub--tall");   // высокие схемы не закрепляем
    const box = svg.getBoundingClientRect();
    if (!box.width) return;
    const area = box.width * box.height;
    const skip = "defs *, marker *, pattern *, clipPath *, mask *, symbol *";
    const items = [];
    svg.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse, text, foreignObject").forEach((el) => {
      if (el.matches(skip) || el.closest(".pkt")) return;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      if (r.width * r.height > area * 0.6) return;            // фон и рамка листа остаются на месте
      if (el.classList.contains("s-draw") || el.classList.contains("s-fade")) {   // уже размечен
        items.push({ el, kind: el.classList.contains("s-draw") ? "draw" : "fade", x: r.left - box.left, y: r.top - box.top });
        return;
      }
      const cs = getComputedStyle(el);
      const isText = el.matches("text, foreignObject");
      const dashed = cs.strokeDasharray && cs.strokeDasharray !== "none";
      const stroked = cs.stroke && cs.stroke !== "none" && parseFloat(cs.strokeWidth) > 0;
      const kind = !isText && stroked && !dashed ? "draw" : "fade";
      if (kind === "draw") { el.setAttribute("pathLength", "1"); el.classList.add("s-draw"); }
      else el.classList.add("s-fade");
      items.push({ el, kind, x: r.left - box.left, y: r.top - box.top });
    });
    const wide = box.width > box.height * 1.15;
    items.sort((a, b) => (wide ? a.x + a.y * 0.25 - (b.x + b.y * 0.25) : a.y + a.x * 0.25 - (b.y + b.x * 0.25)));
    const n = items.length || 1;
    const dur = Math.max(0.05, Math.min(0.3, 8 / n));
    items.forEach((it, i) => { it.start = (i / n) * (1 - dur); it.dur = dur; it.last = -1; });
    sec._items = items;
    sec._ready = true;
    sec._full = false;
    paint(sec, sec._p ?? 0, true);
  }

  function paint(sec, p, force) {
    const items = sec._items;
    if (!items) return;
    if (!force && Math.abs((sec._p ?? -1) - p) < 0.002) return;
    sec._p = p;
    const fig = sec.querySelector(".sheet");
    fig.style.setProperty("--p", p.toFixed(3));
    fig.classList.toggle("is-drawn", p >= 1);
    for (const it of items) {
      const t = clamp((p - it.start) / it.dur);
      const q = Math.round(t * 100) / 100;
      if (q === it.last) continue;
      it.last = q;
      if (it.kind === "draw") {
        it.el.style.setProperty("--t", q);
        it.el.style.fillOpacity = q;
        it.el.style.opacity = Math.min(1, q * 8);
      } else it.el.style.setProperty("--o", q);
    }
  }

  function progress(sec, vh) {
    const r = sec.getBoundingClientRect();
    const pinned = !sec.classList.contains("scrub--tall") && r.height > vh * 1.2;
    if (pinned) return clamp((vh * 0.45 - r.top) / (r.height - vh * 0.55) / 0.82);   // старт, когда лист поднялся к середине экрана
    return clamp((vh * 0.9 - r.top) / (Math.max(r.height, 200) * 0.85));
  }

  function frame() {
    ticking = false;
    const vh = innerHeight;
    const docH = root.scrollHeight - vh;
    root.style.setProperty("--read", docH > 0 ? (scrollY / docH).toFixed(4) : 0);
    if (reduce) return;
    for (const sec of sheets) {
      if (!sec._ready) prepare(sec);
      if (!sec._ready || sec._full) continue;
      paint(sec, progress(sec, vh));
    }
  }
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  function init() {
    document.querySelectorAll(".scrub").forEach((sec) => {
      sheets.push(sec);
      const btn = sec.querySelector(".sheet__full");
      const fig = sec.querySelector(".sheet");
      btn?.addEventListener("click", () => toggleFull(sec, fig, btn));
      fig.addEventListener("dblclick", () => toggleFull(sec, fig, btn));
    });
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    document.addEventListener("mermaid:rendered", () => {
      sheets.filter((s) => s.dataset.kind === "mermaid").forEach((s) => { s._ready = false; s._items = null; });
      onScroll();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      sheets.forEach((s) => { if (s._full) toggleFull(s, s.querySelector(".sheet"), s.querySelector(".sheet__full")); });
    });
    const cards = document.querySelectorAll(".cards");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.12 });
      cards.forEach((c) => io.observe(c));
    } else cards.forEach((c) => c.classList.add("is-in"));
    frame();
  }

  function toggleFull(sec, fig, btn) {
    sec._full = !sec._full;
    fig.classList.toggle("is-full", sec._full);
    document.body.style.overflow = sec._full ? "hidden" : "";
    if (btn) btn.textContent = sec._full ? "✕ закрыть" : "⤢ во весь экран";
    if (sec._full) paint(sec, 1, true); else onScroll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
