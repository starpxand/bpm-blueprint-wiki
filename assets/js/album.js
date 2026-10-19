/* Зачётка: лист, дочитанный до конца, получает печать «Изучено»; отметки – в меню, на карточках главной,
   в ведомости и в тренажёре. Хранится только в этом браузере (localStorage). */
(() => {
  const KEY = "bn-album";
  const ORDER = ["flowchart", "dfd", "rad", "idef", "erd", "uml", "bpmn"];
  const SHORT = { flowchart: "Flow Chart", dfd: "DFD", rad: "RAD", idef: "IDEF", erd: "ERD", uml: "UML", bpmn: "BPMN" };
  const root = document.documentElement.dataset.root ?? "";
  const motion = document.documentElement.classList.contains("js-scrub");
  const get = () => {
    try { const d = JSON.parse(localStorage.getItem(KEY)) || {}; d.read ||= {}; return d; } catch (e) { return { read: {} }; }
  };
  const put = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* приватный режим */ } };
  const fmt = (v) => String(v).replace(".", ",");
  const day = (iso) => new Date(iso).toLocaleDateString("ru-RU");
  window.album = { get, put, ORDER, SHORT };

  function paint() {
    const d = get(), n = Object.keys(d.read).filter((s) => ORDER.includes(s)).length;
    document.querySelectorAll(".top__nav a").forEach((a) => {
      const m = a.getAttribute("href").match(/notations\/(\w+)\.html/);
      a.classList.toggle("is-read", !!(m && d.read[m[1]]));
    });
    document.querySelectorAll(".card[data-slug], .ledger__marks i, .flight__meter i").forEach((el) => {
      const s = el.dataset.slug || ORDER[Number(el.dataset.k)];
      el.classList.toggle("is-read", !!d.read[s]);
    });
    const led = document.querySelector("[data-ledger]");
    if (led) {
      led.querySelector("[data-ledger-n]").textContent = n;
      led.querySelector("[data-ledger-best]").textContent = d.best != null ? `, лучший результат тренажёра – ${fmt(d.best)} из 10` : "";
      led.querySelector("[data-ledger-reset]").hidden = !n && d.best == null;
      led.classList.toggle("is-full", n === ORDER.length);
    }
  }

  // печать на листе: при первом прочтении – с ударом, потом – просто стоит
  function seal(slug, iso, animate) {
    const art = document.querySelector("article.doc");
    if (!art || art.querySelector(".seal")) return;
    const k = ORDER.indexOf(slug) + 1;
    const el = document.createElement("div");
    el.className = "seal" + (animate && motion ? " is-drop" : " is-set");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `Печать: лист ${SHORT[slug]} изучен ${day(iso)}`);
    el.innerHTML = `<svg viewBox="0 0 200 200" aria-hidden="true">
      <defs><path id="sealRing" d="M100 100 m-76 0 a76 76 0 1 1 152 0 a76 76 0 1 1 -152 0"/></defs>
      <circle cx="100" cy="100" r="95"/><circle cx="100" cy="100" r="64"/>
      <text class="seal__ring"><textPath href="#sealRing">БЮРО НОТАЦИЙ · ЛИСТ ${String(k).padStart(2, "0")} · ${SHORT[slug].toUpperCase()} ·</textPath></text>
      <text class="seal__big" x="100" y="100" text-anchor="middle">ИЗУЧЕНО</text>
      <text class="seal__date" x="100" y="122" text-anchor="middle">${day(iso)}</text></svg>`;
    art.append(el);
  }

  function toast(html) {
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status");
    t.innerHTML = html;
    document.body.append(t);
    requestAnimationFrame(() => t.classList.add("is-on"));
    setTimeout(() => { t.classList.remove("is-on"); setTimeout(() => t.remove(), 400); }, 6500);
  }

  // лист нотации: считается прочитанным, если дочитан до листания и на странице провели не меньше 12 секунд
  const slug = ORDER.find((s) => document.body.classList.contains(`p-${s}`));
  if (slug) {
    const d = get();
    if (d.read[slug]) seal(slug, d.read[slug], false);
    else {
      const t0 = performance.now(), end = document.querySelector(".pager");
      let timer = 0;
      const done = () => {
        const dd = get();
        if (dd.read[slug]) return;
        dd.read[slug] = new Date().toISOString();
        put(dd); seal(slug, dd.read[slug], true); paint();
        const n = Object.keys(dd.read).length;
        toast(n === ORDER.length
          ? `<b>Альбом изучен целиком: 7 из 7.</b> Проверьте себя в <a href="${root}trainer.html">тренажёре</a> и получите свидетельство.`
          : `<b>Лист «${SHORT[slug]}» – в зачётке.</b> Изучено ${n} из 7. <a href="${root}index.html#sheets">Ведомость</a>`);
      };
      if (end && "IntersectionObserver" in window) {
        new IntersectionObserver(([e]) => {
          clearTimeout(timer);
          if (!e.isIntersecting) return;
          const wait = 12000 - (performance.now() - t0);
          if (wait <= 0) done(); else timer = setTimeout(done, wait);
        }, { threshold: 0.4 }).observe(end);
      }
    }
  }

  document.querySelector("[data-ledger-reset]")?.addEventListener("click", () => {
    put({ read: {} }); paint();
  });
  addEventListener("storage", (e) => { if (e.key === KEY) paint(); });
  paint();
})();
