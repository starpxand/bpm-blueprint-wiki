/* Обложка: «камера» летит сквозь альбом из семи листов. Прокрутка = продвижение по оси Z;
   у каждого листа камера притормаживает (лист крупно и читаемо, рядом подпись), затем лист пролетает мимо. */
(() => {
  const sec = document.querySelector(".flight");
  if (!sec || !document.documentElement.classList.contains("js-scrub")) return;
  const stage = sec.querySelector(".flight__stage");
  const sheets = [...sec.querySelectorAll(".fsheet")];
  const caps = [...sec.querySelectorAll(".fcap")];
  const ticks = [...sec.querySelectorAll(".flight__meter i")];
  const intro = sec.querySelector(".flight__intro");
  const floor = sec.querySelector(".flight__floor");
  const N = sheets.length;
  const D = 1500;          // расстояние между листами
  const R = 420;           // дистанция «чтения» – где лист задерживается
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  let mx = 0, my = 0, sx = 0, sy = 0, ticking = false, sCur = null;
  const tb = sec.querySelector(".titleblock");

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
    sCur = sCur === null ? sT : sCur + (sT - sCur) * 0.14;          // инерция камеры
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
    tb.style.opacity = (1 - io).toFixed(3);
    tb.style.pointerEvents = io > 0.6 ? "none" : "";

    let active = -1;
    sheets.forEach((el, k) => {
      const rel = -(k + 1) * D + cam + (k === 0 ? (1 - io) * 650 : 0);   // < 0 – лист перед камерой; на заставке первый ближе
      const side = narrow ? 0 : (k % 2 ? -1 : 1);
      const dx = narrow ? 0 : innerWidth * 0.12 + (1 - io) * innerWidth * 0.22;   // справа от подписи; на заставке – справа от текста
      const far = clamp(1 - (-rel - D) / (0.35 * D));             // следующий лист проявляется, когда текущий уходит
      const near = clamp(1 - (rel + 260) / 420);                  // уход за камеру
      const op = Math.min(far, near) * (narrow || k > 0 ? io : 1);
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op <= 0.01 ? "hidden" : "visible";
      if (op > 0.01) {
        const tilt = clamp((rel + R) / 900, -1, 1);                 // поворачивается, пролетая мимо
        el.style.transform = `translate3d(${dx}px, ${-sy * 30}px, ${rel}px) rotateY(${side * (-4 + tilt * 12) - 6 + sx * 4}deg) rotateX(${2 - tilt * 6}deg) translate(-50%, -50%)`;
      }
      const d = Math.abs(s - (k + 0.5));
      const c = clamp(1 - (d - 0.22) / 0.16);
      caps[k].style.opacity = c.toFixed(3);
      caps[k].style.transform = narrow ? `translateY(${(1 - c) * 16}px)` : `translateY(calc(-50% + ${(1 - c) * 18}px))`;
      caps[k].classList.toggle("is-on", c > 0.5);
      if (c > 0.5) active = k;
    });
    ticks.forEach((t, k) => t.classList.toggle("is-on", k === active || (active < 0 && s >= k + 0.5 && s < k + 1.5)));
    if (Math.abs(mx - sx) + Math.abs(my - sy) > 0.002 || s !== sT) request();
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; request(); }, { passive: true });
  // «Пролететь альбом»: плавно к первому листу
  sec.querySelector("[data-fly]")?.addEventListener("click", (e) => {
    e.preventDefault();
    const top = sec.offsetTop + (sec.offsetHeight - stage.clientHeight) * (1 / (N + 0.45)) * 1.05;
    scrollTo({ top, behavior: "smooth" });
  });
  request();
})();
