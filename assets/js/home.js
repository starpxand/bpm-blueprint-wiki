/* Главная: заказ проходит по процессу при прокрутке, затем процесс «раскладывается» на семь листов */
(() => {
  const story = document.querySelector(".story");
  if (!story) return;
  const NS = "http://www.w3.org/2000/svg";
  const svg = story.querySelector(".route");
  const path = svg.querySelector("#routePath");
  const parcel = svg.querySelector(".parcel");
  const steps = [...story.querySelectorAll(".story__step")];
  const stG = svg.querySelector(".route__stations");
  const fanG = svg.querySelector(".route__fan");
  const L = path.getTotalLength();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };

  const names = ["Клиент", "Менеджер", "Менеджер", "Клиент", "Склад", "Доставка"];
  const what = ["заказ", "наличие", "счёт", "оплата", "сборка", "доставка"];
  const stations = names.map((who, k) => {
    const pt = path.getPointAtLength((L * k) / 5);
    const g = el("g", { class: "station", transform: `translate(${pt.x} ${pt.y})` }, stG);
    el("circle", { r: 11 }, g);
    const up = el("text", { class: "who", y: -22, "text-anchor": "middle" }, g); up.textContent = who;
    const dn = el("text", { y: 34, "text-anchor": "middle" }, g); dn.textContent = `${String(k + 1).padStart(2, "0")} · ${what[k]}`;
    return g;
  });

  const notes = ["Flow Chart", "DFD", "RAD", "IDEF", "ERD", "UML", "BPMN"];
  const C = { x: 320, y: 330 };
  const fan = notes.map((n, k) => {
    const a = (-90 + (360 / 7) * k) * Math.PI / 180;
    const x = C.x + Math.cos(a) * 225, y = C.y + Math.sin(a) * 225;
    const g = el("g", { class: "fan" }, fanG);
    const ln = el("line", { x1: C.x, y1: C.y, x2: x, y2: y, pathLength: 1, "stroke-dasharray": 1 }, g);
    const w = n.length * 9 + 26;
    el("rect", { x: x - w / 2, y: y - 17, width: w, height: 34, rx: 3 }, g);
    const t = el("text", { x, y: y + 5, "text-anchor": "middle" }, g); t.textContent = n;
    return { g, ln };
  });
  path.setAttribute("pathLength", 1);
  path.setAttribute("stroke-dasharray", 1);

  const clamp = (v) => Math.max(0, Math.min(1, v));
  function render(p) {
    const t = clamp(p / 0.74);
    const f = clamp((p - 0.78) / 0.16);
    path.setAttribute("stroke-dashoffset", 1 - t);
    let pt = path.getPointAtLength(L * t);
    if (f > 0) pt = { x: pt.x + (C.x - pt.x) * f, y: pt.y + (C.y - pt.y) * f };
    parcel.setAttribute("transform", `translate(${pt.x} ${pt.y}) scale(${1 + f * 0.6})`);
    const on = Math.min(5, Math.floor(t * 5 + 0.04));
    stations.forEach((s, k) => s.classList.toggle("is-on", k <= on && t > 0.001 || k === 0));
    steps.forEach((s, k) => { s.classList.toggle("is-on", k === on && f < 0.5); s.classList.toggle("is-done", k < on || f >= 0.5); });
    stG.style.opacity = 1 - f * 0.8;
    path.style.opacity = 1 - f * 0.7;
    svg.querySelector(".route__ghost").style.opacity = 1 - f;
    fan.forEach(({ g, ln }, k) => {
      const q = clamp(f * 1.6 - k * 0.09);
      ln.setAttribute("stroke-dashoffset", 1 - q);
      g.style.opacity = q > 0 ? 1 : 0;
      g.querySelector("rect").style.opacity = g.querySelector("text").style.opacity = clamp(q * 2 - 0.6);
    });
    story.classList.toggle("is-final", f > 0.6);
  }

  if (reduce) { render(1); return; }
  let ticking = false;
  const frame = () => {
    ticking = false;
    const r = story.getBoundingClientRect();
    render(clamp(-r.top / (r.height - innerHeight)));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener("resize", frame);
  frame();
})();
