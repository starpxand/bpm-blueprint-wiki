/* Обложка: «камера» летит сквозь альбом из семи листов. Прокрутка = продвижение по оси Z;
   у каждого листа камера притормаживает (лист крупно и читаемо, рядом подпись), затем лист перелистывается –
   поворачивается вокруг левого края, как страница альбома, и открывает следующий.
   Сами диаграммы не анимируются – двигаются только листы, камера и чертёжные пометки вокруг них. */
(() => {
  const sec = document.querySelector(".flight");
  if (!sec || !document.documentElement.classList.contains("js-scrub")) return;
  const stage = sec.querySelector(".flight__stage");
  const sheets = [...sec.querySelectorAll(".fsheet")];
  const caps = [...sec.querySelectorAll(".fcap")];
  const ticks = [...sec.querySelectorAll(".flight__meter i")];
  const nums = [...sec.querySelectorAll(".flight__nums span")];
  const intro = sec.querySelector(".flight__intro");
  const floor = sec.querySelector(".flight__floor");
  const photo = sec.querySelector(".flight__photo");
  const dims = sec.querySelector(".flight__dims");
  const lead = dims?.querySelector(".dims__lead");
  const dot = dims?.querySelector(".dims__dot");
  const dim = dims?.querySelector(".dims__dim");
  const dimTxt = dims?.querySelector(".dims__txt");
  const N = sheets.length;
  const D = 1500;          // расстояние между листами
  const R = 420;           // дистанция «чтения» – где лист задерживается
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  let mx = 0, my = 0, sx = 0, sy = 0, ticking = false, sCur = null;
  let widths = sheets.map((el) => el.offsetWidth);   // ширина листов – для поворота вокруг края; меняется только при resize

  // камера: равномерный полёт с «зависанием» на середине каждого сегмента
  const camAt = (s) => {
    const k = Math.floor(s), f = s - k;
    const g = f + 0.15 * Math.sin(2 * Math.PI * f) / (2 * Math.PI) * 6.1;   // монотонно, плато у f = 0.5
    return (k + g + 0.5) * D - R;
  };

  function frame() {
    ticking = false;
    const r = sec.getBoundingClientRect();
    const vh = stage.clientHeight;
    const p = clamp(-r.top / (r.height - vh));
    const sT = -0.55 + p * (N + 0.45);
    sCur = sCur === null ? sT : sCur + (sT - sCur) * (window.lenis ? 0.24 : 0.14);   // с Lenis прокрутка уже плавная
    const s = Math.abs(sT - sCur) < 0.0005 ? (sCur = sT) : sCur;
    const cam = camAt(s);
    sx += (mx - sx) * 0.08; sy += (my - sy) * 0.08;
    const narrow = innerWidth < 900;

    floor.style.setProperty("--run", `${cam * 0.9}px`);
    stage.style.perspectiveOrigin = `${50 + sx * 6}% ${42 + sy * 5}%`;
    const io = clamp((s + 0.55) / 0.42);
    intro.style.opacity = 1 - io;
    intro.style.transform = `translate3d(0, ${-io * 60}px, 0)`;
    intro.style.pointerEvents = io > 0.6 ? "none" : "";
    // фото стола: заставка «на столе», при взлёте стол уходит вниз и гаснет
    if (photo) {
      photo.style.opacity = (0.62 * (1 - smooth(io))).toFixed(3);
      photo.style.transform = `translate3d(${-sx * 14}px, ${io * 90 - sy * 10}px, 0) scale(${1.06 + io * 0.12})`;
    }

    // телефон: веер вписывается в свободное место под кнопками заставки
    let mY = 0, mS = 1, mOk = true;
    if (narrow) {
      const sh = stage.getBoundingClientRect(), ib = intro.getBoundingClientRect();
      const top = ib.bottom - sh.top + 18, room = sh.height - top - 18;
      const h0 = sheets[0].offsetHeight || 1;
      mOk = room > 150;
      mS = Math.min(0.5, (room * 0.62) / h0);
      mY = top + room / 2 - sh.height * 0.4;
    }
    let active = -1, activeC = 0;
    sheets.forEach((el, k) => {
      // полёт
      const fRel = -(k + 1) * D + cam;                             // < 0 – лист перед камерой
      const side = narrow ? 0 : (k % 2 ? -1 : 1);
      const fDx = narrow ? 0 : innerWidth * 0.12;                  // справа от подписи
      const far = clamp(1 - (-fRel - D) / (0.55 * D));             // следующий лист виден заранее, вдали
      const near = clamp(1 - (fRel + 260) / 420);                  // уход за камеру
      // перелистывание: сразу после паузы чтения лист поворачивается вокруг левого края к зрителю
      const turn = smooth(clamp((fRel + R - 40) / 290));
      el.style.setProperty("--turn", turn.toFixed(3));
      const tilt = clamp((fRel + R) / 900, -1, 1);                 // поворачивается, пролетая мимо
      // заставка: альбом веером справа от заголовка (первый лист сверху)
      const j = k - 3;
      const dRel = narrow ? -k * 12 : -1300 - k * 110;
      const dDx = narrow ? j * innerWidth * 0.045 : innerWidth * 0.335 + j * innerWidth * 0.022;
      const dDy = narrow ? mY + Math.abs(j) * 6 * mS : Math.abs(j) * 14;
      const e = smooth(io);
      const lerp = (a, b) => a + (b - a) * e;
      const rel = lerp(dRel, fRel), dx = lerp(dDx, fDx), dy = lerp(dDy, 0);
      const rz = lerp(j * (narrow ? 5 : 4), 0), ry = lerp(-6 + sx * 6, side * (-4 + tilt * 12) - 6 + sx * 4), rx = lerp(4 - sy * 4, 2 - tilt * 6);
      const op = lerp(narrow && !mOk ? 0 : 1 - k * 0.04, Math.min(far, near, 1 - clamp((turn - 0.82) / 0.18)));
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op <= 0.01 ? "hidden" : "visible";
      el.style.zIndex = String(10 - k);
      if (op > 0.01) {
        const W = widths[k];   // поворот вокруг левого края: сдвиг на ширину – поворот – обратно
        const page = turn > 0.001 ? ` translateX(${-W}px) rotateY(${(-turn * 96).toFixed(2)}deg) translateX(${W}px)` : "";
        el.style.transform = `translate3d(${dx}px, ${dy - sy * 30}px, ${rel}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)${page} translate(-50%, -50%) scale(${narrow ? lerp(mS, 1) : 1})`;
        // глубина резкости: дальние и пролетающие листы мягко размываются
        const blur = narrow || fRel + R > 0 ? 0 : clamp((-(fRel + R) - 300) / 1100) * 2.6 * e;   // только дальние, подлетающие листы
        el.style.filter = turn > 0.001 ? `brightness(${(1 - turn * 0.28).toFixed(3)})` : blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : "none";
        el.style.setProperty("--gl", `${(50 - ry * 4 - sx * 30).toFixed(1)}%`);   // блик бумаги следует за поворотом
      }
      const d = Math.abs(s - (k + 0.5));
      const c = clamp(1 - (d - 0.22) / 0.16);
      caps[k].style.opacity = c.toFixed(3);
      caps[k].style.transform = narrow ? `translateY(${(1 - c) * 16}px)` : `translateY(calc(-50% + ${(1 - c) * 18}px))`;
      caps[k].classList.toggle("is-on", c > 0.5);
      if (c > activeC) { activeC = c; active = k; }
      // огромный номер листа за сценой – свой, более медленный параллакс
      if (nums[k]) {
        const dn = s - (k + 0.5);
        const on = clamp(1 - Math.abs(dn) / 0.62);
        nums[k].style.opacity = (on * on * io).toFixed(3);
        nums[k].style.transform = `translate3d(${-sx * 40}px, calc(-50% + ${(-dn * 220).toFixed(1)}px), 0) scale(${(1 + Math.abs(dn) * 0.12).toFixed(3)})`;
      }
    });
    ticks.forEach((t, k) => t.classList.toggle("is-on", k === active && activeC > 0.5));
    drawDims(narrow ? -1 : active, activeC);
    if (Math.abs(mx - sx) + Math.abs(my - sy) > 0.002 || s !== sT) request();
  }

  // выноска от подписи к листу и размерная линия под листом – как на чертеже
  function drawDims(k, c) {
    if (!dims) return;
    if (k < 0 || c < 0.05) { dims.style.opacity = 0; return; }
    const st = stage.getBoundingClientRect();
    const a = caps[k].getBoundingClientRect(), b = sheets[k].getBoundingClientRect();
    const y0 = a.top - st.top + a.height * 0.32, x0 = a.right - st.left;
    const x1 = b.left - st.left + b.width * 0.06, y1 = clamp(y0, b.top - st.top + 30, b.bottom - st.top - 30);
    const xm = x0 + Math.max(24, (x1 - x0) * 0.45);
    lead.setAttribute("d", `M${x0} ${y0} H${xm} L${x1} ${y1}`);
    dot.setAttribute("cx", x1); dot.setAttribute("cy", y1);
    const L = b.left - st.left, Rr = b.right - st.left, yb = b.bottom - st.top + 26, ye = b.bottom - st.top + 6;
    const t = 7;   // засечки под 45°, как в строительных чертежах
    dim.setAttribute("d", `M${L} ${ye} V${yb + 10} M${Rr} ${ye} V${yb + 10} M${L - 12} ${yb} H${Rr + 12} M${L - t} ${yb + t} L${L + t} ${yb - t} M${Rr - t} ${yb + t} L${Rr + t} ${yb - t}`);
    dimTxt.setAttribute("x", (L + Rr) / 2); dimTxt.setAttribute("y", yb - 8);
    dimTxt.textContent = `${Number(sheets[k].style.getPropertyValue("--ar") || getComputedStyle(sheets[k]).getPropertyValue("--ar")) >= 1 ? 420 : 297}`;
    dims.style.opacity = smooth(clamp((c - 0.35) / 0.5)).toFixed(3);
  }

  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", () => { widths = sheets.map((el) => el.offsetWidth); request(); });
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; request(); }, { passive: true });

  // перейти к листу k (0..6): плавно, через Lenis, если он есть
  window.flightTo = (k) => {
    const vh = stage.clientHeight;
    const p = (k + 1.05) / (N + 0.45);
    const top = sec.offsetTop + p * (sec.offsetHeight - vh);
    if (window.lenis) window.lenis.scrollTo(top, { duration: 1.6 });
    else scrollTo({ top, behavior: "smooth" });
  };
  sec.querySelector("[data-fly]")?.addEventListener("click", (e) => { e.preventDefault(); window.flightTo(0); });

  // перекрестие чертёжника с координатами в миллиметрах листа A3 (только мышь)
  const cross = sec.querySelector(".flight__cross");
  if (cross && matchMedia("(pointer: fine)").matches) {
    const lab = cross.querySelector("b");
    stage.addEventListener("pointermove", (e) => {
      const st = stage.getBoundingClientRect();
      const x = e.clientX - st.left, y = e.clientY - st.top;
      cross.style.setProperty("--x", `${x}px`); cross.style.setProperty("--y", `${y}px`);
      lab.textContent = `X ${(x / st.width * 420).toFixed(1).padStart(5, "0")} · Y ${(y / st.height * 297).toFixed(1).padStart(5, "0")}`;
      cross.classList.add("is-on");
    });
    stage.addEventListener("pointerleave", () => cross.classList.remove("is-on"));
  }
  request();
})();
