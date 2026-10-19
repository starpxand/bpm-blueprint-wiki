/* Шторка «один процесс – два чертежа»: два листа альбома друг над другом, разделитель тянется мышью,
   пальцем или стрелками (под ним обычный ползунок type=range). При первом показе шторка один раз «дышит». */
(() => {
  document.querySelectorAll("[data-curtain]").forEach((c) => {
    const stage = c.querySelector(".curtain__stage");
    const range = c.querySelector(".curtain__range");
    const side = {
      a: { img: c.querySelector(".curtain__img--a img"), tag: c.querySelector(".curtain__tag--a") },
      b: { img: c.querySelector(".curtain__img--b img"), tag: c.querySelector(".curtain__tag--b") },
    };
    ["a", "b"].forEach((s) => { side[s].cur = c.querySelector(`[data-side="${s}"][aria-pressed="true"]`).dataset.n; });
    const set = (v) => { range.value = v; stage.style.setProperty("--x", `${v}%`); };
    range.addEventListener("input", () => set(range.value));

    function choose(s, btn) {
      const other = s === "a" ? "b" : "a";
      if (btn.dataset.n === side[other].cur) {   // тот же лист с другой стороны – стороны меняются местами
        const prev = c.querySelector(`[data-side="${other}"][data-n="${side[s].cur}"]`);
        if (prev) apply(other, prev);
      }
      apply(s, btn);
    }
    function apply(s, btn) {
      side[s].cur = btn.dataset.n;
      side[s].img.src = btn.dataset.src;
      side[s].img.alt = `Лист ${s === "a" ? "слева" : "справа"}: ${btn.textContent}`;
      side[s].tag.textContent = btn.textContent;
      c.querySelectorAll(`[data-side="${s}"]`).forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
    }
    c.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-side]");
      if (btn) choose(btn.dataset.side, btn);
    });

    // подсказка, что шторку можно тянуть: один плавный проход 50 → 22 → 78 → 50
    if (document.documentElement.classList.contains("js-scrub") && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const keys = [[0, 50], [700, 22], [1700, 78], [2400, 50]], t0 = performance.now();
        let stop = false;
        range.addEventListener("pointerdown", () => { stop = true; }, { once: true });
        const step = (now) => {
          if (stop) return;
          const t = now - t0;
          const k = keys.findIndex(([at]) => at > t);
          if (k < 0) return set(50);
          const [t1, v1] = keys[k - 1], [t2, v2] = keys[k];
          const q = (t - t1) / (t2 - t1), e2 = q * q * (3 - 2 * q);
          set(v1 + (v2 - v1) * e2);
          requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 300);
      }, { threshold: 0.6 });
      io.observe(stage);
    }
  });
})();
