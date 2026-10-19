/* Общие эффекты всех страниц: инерционная прокрутка (Lenis), магнитные кнопки, горячие клавиши
   (1–7 – листы альбома, ? – подсказка) и печать бюро на основной надписи. */
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains("js-scrub");
  const fine = matchMedia("(pointer: fine)").matches;
  const topH = () => parseFloat(getComputedStyle(root).getPropertyValue("--top")) || 64;

  // ------------------------------------------------------------ плавная прокрутка
  if (motion && window.Lenis) {
    const lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    window.lenis = lenis;
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    // якоря внутри страницы – тоже плавно, с поправкой на шапку
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute("data-fly") || a.getAttribute("href").length < 2) return;
      const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -(topH() + 24), duration: 1.2 });
      history.replaceState(null, "", a.hash);
    });
    // полноэкранный просмотр листа: прокрутка страницы замирает
    new MutationObserver(() => (document.querySelector(".sheet.is-full") ? lenis.stop() : lenis.start()))
      .observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  // ------------------------------------------------------------ магнитные кнопки
  if (motion && fine) {
    document.querySelectorAll(".btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 8}px, ${((e.clientY - r.top) / r.height - 0.5) * 6}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  }

  // ------------------------------------------------------------ горячие клавиши
  const sheetsNav = [...document.querySelectorAll(".top__nav a")].slice(0, 7);   // Flow Chart … BPMN в порядке альбома
  let help = null;
  const toggleHelp = (on) => {
    if (!help) {
      help = document.createElement("div");
      help.className = "keys";
      help.setAttribute("role", "dialog"); help.setAttribute("aria-label", "Горячие клавиши");
      help.innerHTML = `<div class="keys__box"><p class="keys__t">Горячие клавиши</p><dl>
        <dt><kbd>/</kbd> или <kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>поиск по альбому: листы, разделы, элементы нотаций, источники</dd>
        <dt><kbd>1</kbd>–<kbd>7</kbd></dt><dd>лист альбома: Flow Chart, DFD, RAD, IDEF, ERD, UML, BPMN; в тренажёре – ответ</dd>
        <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>предыдущий и следующий лист</dd>
        <dt><kbd>Shift</kbd> над схемой</dt><dd>лупа ×2,5 (или кнопка с лупой на листе)</dd>
        <dt>двойной щелчок</dt><dd>диаграмма во весь экран; колесо – масштаб, перетаскивание – сдвиг</dd>
        <dt><kbd>Esc</kbd></dt><dd>закрыть полноэкранный просмотр и эту подсказку</dd>
        <dt><kbd>?</kbd></dt><dd>показать или скрыть подсказку</dd></dl>
        <button class="btn" type="button" data-close>Понятно</button></div>`;
      help.addEventListener("click", (e) => { if (e.target === help || e.target.closest("[data-close]")) toggleHelp(false); });
      document.body.append(help);
    }
    help.classList.toggle("is-on", on);
    if (on) help.querySelector("[data-close]").focus();
  };
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "?") { e.preventDefault(); toggleHelp(!help?.classList.contains("is-on")); return; }
    if (e.key === "Escape" && help?.classList.contains("is-on")) { toggleHelp(false); return; }
    if (root.classList.contains("is-finding")) return;
    if (/^[1-7]$/.test(e.key) && !document.querySelector(".sheet.is-full, [data-quiz]") && !root.classList.contains("is-finding")) {
      const k = Number(e.key) - 1;
      if (window.flightTo && document.querySelector(".flight")?.getBoundingClientRect().bottom > innerHeight) window.flightTo(k);
      else if (sheetsNav[k]) location.href = sheetsNav[k].href;
    }
  });

  // ------------------------------------------------------------ печать бюро на основной надписи
  const stamp = document.querySelector(".stamp");
  if (stamp) {
    if (!motion || !("IntersectionObserver" in window)) stamp.classList.add("is-down");
    else {
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        setTimeout(() => { stamp.classList.add("is-down"); stamp.closest(".team__stamp")?.classList.add("is-hit"); }, 350);
      }, { threshold: 0.6 });
      io.observe(stamp.closest(".team__stamp") || stamp);
    }
  }
})();
