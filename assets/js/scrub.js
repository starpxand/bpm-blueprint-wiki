/* Общее поведение страниц: полоса чтения, появление блоков, липкое оглавление с подсветкой раздела,
   просмотр листа во весь экран с масштабом и перемещением. Диаграммы НЕ привязаны к прокрутке. */
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains("js-scrub");

  // полоса чтения в шапке
  let ticking = false;
  const read = () => {
    ticking = false;
    const h = root.scrollHeight - innerHeight;
    root.style.setProperty("--read", h > 0 ? (scrollY / h).toFixed(4) : 0);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
  read();

  // появление блоков один раз при входе в экран
  const io = "IntersectionObserver" in window && motion
    ? new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in"); io.unobserve(e.target);
      }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
    : null;
  const reveal = document.querySelectorAll(".doc > h2, .doc > h3, .doc > p, .doc > ol, .doc > ul, .table-wrap, .margin-note, .lh-pick, .cards, .passport__row, .lh-refs, .team__row");
  reveal.forEach((el, i) => {
    if (!io) { el.classList.add("is-in"); return; }
    el.classList.add("rv");
    if (el.matches(".passport__row")) el.style.transitionDelay = `${(i % 6) * 70}ms`;
    io.observe(el);
  });
  // строки таблиц – каскадом
  document.querySelectorAll(".table-wrap tbody tr").forEach((tr, i) => tr.style.setProperty("--d", `${Math.min(i, 12) * 45}ms`));

  // липкое оглавление: подсветка текущего раздела
  const toc = document.querySelector(".toc");
  if (toc) {
    const links = [...toc.querySelectorAll("a")];
    const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
    const spy = () => {
      let cur = 0;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
      links.forEach((a, i) => a.classList.toggle("is-on", i === cur));
      toc.classList.toggle("is-stuck", toc.getBoundingClientRect().top <= parseFloat(getComputedStyle(root).getPropertyValue("--top")) + 1);
    };
    addEventListener("scroll", () => requestAnimationFrame(spy), { passive: true });
    spy();
  }

  // лист во весь экран: колесо – масштаб, перетаскивание – сдвиг, двойной щелчок – сброс
  document.querySelectorAll(".sheet").forEach((fig) => {
    const btn = fig.querySelector(".sheet__full");
    const draw = fig.querySelector(".sheet__draw");
    let z = 1, x = 0, y = 0, drag = null;
    const apply = () => {
      const c = draw.firstElementChild;
      if (c) c.style.transform = fig.classList.contains("is-full") ? `translate(${x}px, ${y}px) scale(${z})` : "";
    };
    const toggle = (on) => {
      fig.classList.toggle("is-full", on);
      document.body.style.overflow = on ? "hidden" : "";
      btn.textContent = on ? "✕" : "⤢";
      z = 1; x = 0; y = 0; apply();
    };
    btn.addEventListener("click", () => toggle(!fig.classList.contains("is-full")));
    draw.addEventListener("dblclick", () => fig.classList.contains("is-full") ? (z = 1, x = 0, y = 0, apply()) : toggle(true));
    draw.addEventListener("wheel", (e) => {
      if (!fig.classList.contains("is-full")) return;
      e.preventDefault();
      const k = Math.exp(-e.deltaY * 0.0015);
      const r = draw.getBoundingClientRect();
      const px = e.clientX - r.left - r.width / 2 - x, py = e.clientY - r.top - r.height / 2 - y;
      const nz = Math.max(0.5, Math.min(6, z * k));
      x -= px * (nz / z - 1); y -= py * (nz / z - 1); z = nz; apply();
    }, { passive: false });
    draw.addEventListener("pointerdown", (e) => {
      if (!fig.classList.contains("is-full")) return;
      drag = { sx: e.clientX - x, sy: e.clientY - y }; draw.setPointerCapture(e.pointerId); draw.classList.add("is-drag");
    });
    draw.addEventListener("pointermove", (e) => { if (drag) { x = e.clientX - drag.sx; y = e.clientY - drag.sy; apply(); } });
    draw.addEventListener("pointerup", () => { drag = null; draw.classList.remove("is-drag"); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && fig.classList.contains("is-full")) toggle(false); });
  });

  // ← → – соседние листы альбома
  const prev = document.querySelector(".pager__prev"), next = document.querySelector(".pager__next");
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea") || document.querySelector(".sheet.is-full") || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight" && next) location.href = next.href;
    if (e.key === "ArrowLeft" && prev) location.href = prev.href;
  });
})();
