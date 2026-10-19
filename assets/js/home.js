/* Главная: процесс «Обработка заказа» – карта с дорожками участников. Прокрутка ведёт заказ по шагам,
   в конце карта отступает и процесс раскладывается на семь нотаций. */
(() => {
  const story = document.querySelector(".story");
  if (!story) return;
  const svg = story.querySelector(".route");
  const steps = [...story.querySelectorAll(".story__step")];
  const NS = "http://www.w3.org/2000/svg";
  const reduce = !document.documentElement.classList.contains("js-scrub");

  const LANES = ["Клиент", "Менеджер", "Склад", "Доставка"];
  const L0 = 104, R0 = 752, T0 = 16, LH = 118;                        // поле дорожек
  const BW = 84, BH = 50;
  const STEPS = [
    ["Оформить", "заказ", 0], ["Проверить", "наличие", 1], ["Выставить", "счёт", 1],
    ["Оплатить", "счёт", 0], ["Собрать", "заказ", 2], ["Доставить", "заказ", 3],
  ];
  const cx = (i) => 192 + i * 102;
  const cy = (lane) => T0 + LH * lane + LH / 2;

  // разметка
  let h = `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0L10 5L0 10z" class="pm-arrow"/></marker></defs>`;
  h += `<rect class="pm-pool" x="${L0 - 64}" y="${T0}" width="${R0 - L0 + 64}" height="${LH * 4}" rx="6"/>`;
  LANES.forEach((n, i) => {
    const y = T0 + LH * i;
    if (i) h += `<line class="pm-sep" x1="${L0 - 64}" y1="${y}" x2="${R0}" y2="${y}"/>`;
    h += `<text class="pm-lane" transform="translate(${L0 - 34} ${y + LH / 2}) rotate(-90)" text-anchor="middle" dominant-baseline="middle">${n}</text>`;
  });
  h += `<line class="pm-sep" x1="${L0}" y1="${T0}" x2="${L0}" y2="${T0 + LH * 4}"/>`;
  // маршрут через центры шагов (ортогональный)
  const pts = [[L0 + 22, cy(0)]];
  STEPS.forEach(([, , lane], i) => {
    const [px, py] = pts[pts.length - 1];
    const x = cx(i), y = cy(lane);
    if (py !== y) { const mx = (px + x) / 2; pts.push([mx, py], [mx, y]); }
    pts.push([x, y]);
  });
  pts.push([R0 - 26, cy(3)]);
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  h += `<path class="pm-ghost" d="${d}"/><path class="pm-line" id="pmPath" d="${d}"/>`;
  // соединители со стрелками (видны всегда, тонко)
  STEPS.forEach(([, , lane], i) => {
    const x1 = i ? cx(i - 1) + BW / 2 : L0 + 31, y1 = i ? cy(STEPS[i - 1][2]) : cy(0);
    const x2 = cx(i) - BW / 2, y2 = cy(lane), mx = (x1 + x2) / 2;
    const dd = y1 === y2 ? `M${x1} ${y1} H${x2}` : `M${x1} ${y1} H${mx} V${y2} H${x2}`;
    h += `<path class="pm-edge" d="${dd}" marker-end="url(#arr)"/>`;
  });
  h += `<path class="pm-edge" d="M${cx(5) + BW / 2} ${cy(3)} H${R0 - 36}" marker-end="url(#arr)"/>`;
  h += `<g class="parcel"><rect x="-9" y="-7" width="18" height="14" rx="2"/><path d="M-9 -2H9M0 -7V7"/></g>`;
  h += `<circle class="pm-start" cx="${L0 + 22}" cy="${cy(0)}" r="9"/>`;
  h += `<circle class="pm-end" cx="${R0 - 26}" cy="${cy(3)}" r="10"/>`;
  STEPS.forEach(([a, b, lane], i) => {
    h += `<g class="pm-task" data-i="${i}" transform="translate(${cx(i) - BW / 2} ${cy(lane) - BH / 2})">
      <rect width="${BW}" height="${BH}" rx="9"/><text x="${BW / 2}" y="${BH / 2 - 6}" text-anchor="middle">${a}</text>
      <text x="${BW / 2}" y="${BH / 2 + 10}" text-anchor="middle">${b}</text>
      <g class="pm-no" transform="translate(${BW - 10} -8)"><circle r="10"/><text text-anchor="middle" dominant-baseline="central">${i + 1}</text></g></g>`;
  });
  // финал: семь нотаций вокруг процесса
  const NOTES = ["Flow Chart", "DFD", "RAD", "IDEF", "ERD", "UML", "BPMN"];
  const SLUGS = ["flowchart", "dfd", "rad", "idef", "erd", "uml", "bpmn"];
  const C = { x: (L0 + R0) / 2 - 20, y: T0 + LH * 2 };
  h += `<g class="pm-fan">`;
  NOTES.forEach((n, k) => {
    const a = (-90 + (360 / 7) * k) * Math.PI / 180;
    const x = C.x + Math.cos(a) * 300, y = C.y + Math.sin(a) * 200, w = n.length * 9 + 58;
    h += `<a class="pm-note" data-k="${k}" href="notations/${SLUGS[k]}.html" aria-label="Лист ${k + 1}: ${n}"><line x1="${C.x}" y1="${C.y}" x2="${x}" y2="${y}" pathLength="1"/>
      <rect x="${x - w / 2}" y="${y - 18}" width="${w}" height="36" rx="4"/><text x="${x - w / 2 + 12}" y="${y + 5}" class="pm-note__no">${String(k + 1).padStart(2, "0")}</text>
      <text x="${x + 13}" y="${y + 5}" text-anchor="middle">${n}</text></a>`;
  });
  h += `<g class="pm-core" transform="translate(${C.x} ${C.y})"><rect x="-92" y="-26" width="184" height="52" rx="6"/>
    <text y="-3" text-anchor="middle">Обработка заказа</text><text y="15" text-anchor="middle" class="pm-core__s">1 процесс · 7 нотаций</text></g></g>`;
  svg.setAttribute("viewBox", `${L0 - 72} 0 ${R0 - L0 + 84} ${T0 * 2 + LH * 4}`);
  svg.innerHTML = h;

  const path = svg.querySelector("#pmPath");
  const parcel = svg.querySelector(".parcel");
  const tasks = [...svg.querySelectorAll(".pm-task")];
  const notes = [...svg.querySelectorAll(".pm-note")];
  const fan = svg.querySelector(".pm-fan");
  const map = [...svg.children].filter((e) => !e.matches(".pm-fan, defs"));
  const LEN = path.getTotalLength();
  // доля пути, на которой заказ достигает каждого шага
  const at = tasks.map((_, i) => {
    let lo = 0, hi = LEN;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; path.getPointAtLength(m).x < cx(i) - 0.5 ? (lo = m) : (hi = m); }
    return hi / LEN;
  });
  path.setAttribute("pathLength", 1);
  path.style.strokeDasharray = 1;
  const clamp = (v) => Math.max(0, Math.min(1, v));

  function render(p) {
    const t = clamp(p / 0.76);
    const f = clamp((p - 0.8) / 0.16);
    path.style.strokeDashoffset = 1 - t;
    const pt = path.getPointAtLength(LEN * t);
    parcel.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
    parcel.style.opacity = 1 - f;
    let on = -1;
    at.forEach((a, i) => { if (t >= a - 0.004) on = i; });
    tasks.forEach((g, i) => { g.classList.toggle("is-on", i === on && t < 0.999); g.classList.toggle("is-done", i < on || t >= 0.999); });
    steps.forEach((s, k) => { s.classList.toggle("is-on", k === Math.max(on, 0) && f < 0.5); s.classList.toggle("is-done", k < on || f >= 0.5); });
    const fade = clamp(f / 0.45);
    map.forEach((e) => { e.style.opacity = 1 - fade * 0.93; });
    fan.style.opacity = f > 0 ? 1 : 0;
    notes.forEach((g, k) => {
      const q = clamp((f - 0.3) * 2.6 - k * 0.07);   // последний лист веера дорисован к f ≈ 0,85
      g.querySelector("line").style.strokeDashoffset = 1 - q;
      const o = clamp(q * 2 - 0.6);
      g.querySelectorAll("rect, text").forEach((el) => { el.style.opacity = o; });
      g.setAttribute("tabindex", o > 0.9 ? "0" : "-1");   // невидимые ссылки не ловят фокус
    });
    svg.querySelector(".pm-core").style.opacity = clamp((f - 0.22) * 3);
    story.classList.toggle("is-final", f > 0.6);
  }

  if (reduce) { render(0.78); return; }
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
