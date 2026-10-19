/* Лупа чертёжника: удерживайте Shift над схемой или включите лупу кнопкой на листе – увеличение ×2,5.
   Только для мыши; в полноэкранном просмотре не нужна – там свой масштаб колесом. */
(() => {
  if (!matchMedia("(pointer: fine)").matches) return;
  const Z = 2.5, R = 130;
  const lens = document.createElement("div");
  lens.className = "loupe";
  lens.setAttribute("aria-hidden", "true");
  lens.innerHTML = `<div class="loupe__in"></div><span class="loupe__z">×2,5</span>`;
  document.body.append(lens);
  const inner = lens.firstElementChild;
  let fig = null, src = null, shift = false, pt = null;

  const svgOf = (f) => f.querySelector(".sheet__draw > svg, .sheet__draw .mermaid svg");

  function hide() {
    lens.classList.remove("is-on");
    document.querySelectorAll(".sheet.is-lensing").forEach((f) => f.classList.remove("is-lensing"));
  }

  function update() {
    if (!fig || !pt || fig.classList.contains("is-full") || !(shift || fig.classList.contains("is-lens"))) return hide();
    const svg = svgOf(fig);
    if (!svg) return hide();
    if (src !== svg) { inner.replaceChildren(svg.cloneNode(true)); src = svg; }
    const r = svg.getBoundingClientRect();
    if (pt.x < r.left || pt.x > r.right || pt.y < r.top || pt.y > r.bottom) return hide();
    inner.style.width = `${r.width * Z}px`;
    inner.style.height = `${r.height * Z}px`;
    inner.style.transform = `translate(${R - (pt.x - r.left) * Z}px, ${R - (pt.y - r.top) * Z}px)`;
    lens.style.transform = `translate(${pt.x - R}px, ${pt.y - R}px)`;
    lens.classList.add("is-on");
    fig.classList.add("is-lensing");
  }

  document.querySelectorAll(".sheet").forEach((f) => {
    const draw = f.querySelector(".sheet__draw");
    const btn = f.querySelector(".sheet__lens");
    btn?.addEventListener("click", () => {
      const on = !f.classList.contains("is-lens");
      f.classList.toggle("is-lens", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    draw.addEventListener("pointermove", (e) => { fig = f; pt = { x: e.clientX, y: e.clientY }; update(); });
    draw.addEventListener("pointerleave", () => { fig = null; hide(); });
  });
  addEventListener("keydown", (e) => { if (e.key === "Shift" && !shift) { shift = true; update(); } });
  addEventListener("keyup", (e) => { if (e.key === "Shift") { shift = false; update(); } });
  addEventListener("blur", () => { shift = false; hide(); });
  addEventListener("scroll", () => { if (lens.classList.contains("is-on")) hide(); }, { passive: true });
})();
