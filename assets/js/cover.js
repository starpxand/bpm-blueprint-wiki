/* Обложка: альбом из семи листов в перспективе – появление, парение, наклон за мышью,
   раскрытие веером при прокрутке и «вылет» вверх, когда начинается сюжет процесса */
(() => {
  const cover = document.querySelector(".cover");
  const deck = cover && cover.querySelector(".deck");
  if (!deck || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const plates = [...deck.querySelectorAll(".plate")];
  const scene = cover.querySelector(".cover__scene");
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const t0 = performance.now();
  let mx = 0, my = 0, sx = 0, sy = 0, hot = -1, running = false;

  addEventListener("pointermove", (e) => {
    mx = e.clientX / innerWidth - 0.5;
    my = e.clientY / innerHeight - 0.5;
    wake();
  }, { passive: true });
  plates.forEach((pl, k) => {
    pl.addEventListener("pointerenter", () => { hot = k; deck.classList.add("has-hot"); pl.classList.add("is-hot"); wake(); });
    pl.addEventListener("pointerleave", () => { if (hot === k) hot = -1; deck.classList.remove("has-hot"); pl.classList.remove("is-hot"); wake(); });
  });

  function frame(now) {
    const t = (now - t0) / 1000;
    sx += (mx - sx) * 0.06;
    sy += (my - sy) * 0.06;
    const narrow = innerWidth < 900;                      // на телефоне – без веера и параллакса
    const p = narrow ? 0 : clamp(scrollY / (cover.offsetHeight * 0.85));
    const fan = ease(clamp(p / 0.7));
    deck.style.transform =
      `translate3d(${-fan * 90}px, ${p * cover.offsetHeight * 0.2}px, 0) rotateX(${56 - sy * 8 + fan * 8}deg) rotateZ(${-32 + sx * 10 - fan * 10}deg)`;
    scene.style.opacity = 1 - clamp((p - 0.5) / 0.35);
    const gap = 26 + fan * 70;
    let moving = p < 1 && scene.getBoundingClientRect().bottom > 0;
    plates.forEach((pl, k) => {
      const intro = ease(clamp((t - 0.15 - k * 0.11) / 0.9));
      if (intro < 1) moving = true;
      const float = Math.sin(t * 0.9 + k * 0.8) * 5;
      const lift = k === hot ? 46 : 0;
      const z = k * gap + float + lift + (1 - intro) * 520;
      const x = (k - 3) * fan * 30;
      const y = -(k - 3) * fan * 34;
      pl.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${(k - 3) * fan * 2}deg)`;
      pl.style.opacity = intro;
    });
    if (moving || Math.abs(mx - sx) + Math.abs(my - sy) > 0.002) requestAnimationFrame(frame);
    else running = false;
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(frame); } }
  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", wake);
  wake();
})();
