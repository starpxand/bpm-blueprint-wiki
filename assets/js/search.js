/* Поиск по альбому: Ctrl+K, «/» или кнопка в шапке. Индекс assets/search.json собирает build.py:
   листы, разделы, каждый элемент нотаций (строка таблицы) и источники. */
(() => {
  const root = document.documentElement.dataset.root ?? "";
  const KIND = { "лист": 9, "страница": 7, "элемент": 6, "раздел": 4, "источник": 1 };
  const TIPS = ["шлюз", "хранилище данных", "роль", "воронья лапка", "управление", "дорожка", "кардинальность", "ГОСТ"];
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let items = null, dlg, input, list, count, sel = 0, shown = [], lastFocus = null;

  async function load() {
    if (items) return items;
    const r = await fetch(`${root}assets/search.json`);
    items = (await r.json()).map((it) => ({ ...it, _t: norm(it.t), _a: ` ${norm(`${it.t} ${it.s || ""} ${it.n || ""} ${it.x || ""}`)} ` }));
    return items;
  }

  // каждое слово запроса должно найтись; выше – совпадение в названии и с начала слова
  function score(it, toks) {
    let sc = 0;
    for (const t of toks) {
      const i = it._a.indexOf(t);
      if (i < 0) return -1;
      const ti = it._t.indexOf(t);
      if (ti === 0) sc += 30;
      else if (ti > 0) sc += it._t[ti - 1] === " " ? 20 : 12;
      else sc += it._a[i - 1] === " " ? 6 : 3;
    }
    return sc + (KIND[it.k] || 0) - it._t.length / 50;
  }

  // подсветка найденного в исходном тексте (без учёта регистра и «ё»)
  function mark(text, toks) {
    const ranges = [];
    for (const t of toks) {
      const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/е/g, "[её]"), "giu");
      for (const m of text.matchAll(re)) ranges.push([m.index, m.index + m[0].length]);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let out = "", pos = 0;
    for (const [a, b] of ranges) {
      if (a < pos) continue;
      out += esc(text.slice(pos, a)) + `<mark>${esc(text.slice(a, b))}</mark>`;
      pos = b;
    }
    return out + esc(text.slice(pos));
  }

  function build() {
    dlg = document.createElement("div");
    dlg.className = "finder";
    dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); dlg.setAttribute("aria-label", "Поиск по альбому");
    dlg.setAttribute("data-lenis-prevent", "");   // колесо прокручивает список результатов, а не страницу
    dlg.innerHTML = `<div class="finder__box">
      <label class="finder__field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/></svg>
        <input type="search" placeholder="Нотация, элемент или раздел – например, «шлюз»" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="finder-list" aria-autocomplete="list"></label>
      <div class="finder__count" aria-live="polite"></div>
      <div class="finder__list" id="finder-list" role="listbox"></div>
      <p class="finder__keys"><span><kbd>↑</kbd> <kbd>↓</kbd> выбор</span><span><kbd>Enter</kbd> открыть</span><span><kbd>Esc</kbd> закрыть</span></p>
    </div>`;
    document.body.append(dlg);
    input = dlg.querySelector("input"); list = dlg.querySelector(".finder__list"); count = dlg.querySelector(".finder__count");
    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!shown.length) return;
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
        paint();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const a = list.querySelectorAll("a")[sel];
        if (a) go(a);
      }
    });
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
      if (e.key === "Tab") { e.preventDefault(); input.focus(); }   // фокус не уходит из окна поиска
    });
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) return close();
      const tip = e.target.closest("[data-tip]");
      if (tip) { input.value = tip.dataset.tip; render(); input.focus(); return; }
      const a = e.target.closest(".finder__list a");
      if (a) { e.preventDefault(); go(a); }
    });
    list.addEventListener("pointermove", (e) => {
      const a = e.target.closest("a");
      if (a) { sel = Number(a.dataset.i); paint(); }
    });
  }

  function render() {
    const q = norm(input.value);
    if (!q) {
      shown = [];
      count.textContent = "";
      list.innerHTML = `<p class="finder__tips">Попробуйте: ${TIPS.map((t) => `<button type="button" data-tip="${t}">${t}</button>`).join("")}</p>`;
      return;
    }
    const toks = q.split(" ");
    shown = items.map((it) => [score(it, toks), it]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).slice(0, 14).map(([, it]) => it);
    sel = 0;
    count.textContent = shown.length ? `Найдено: ${shown.length === 14 ? "14 и больше" : shown.length}` : "";
    list.innerHTML = shown.length ? shown.map((it, i) => `<a href="${esc(root + it.u)}" role="option" id="fo-${i}" data-i="${i}">
        <span class="finder__k finder__k--${it.k === "элемент" ? "el" : it.k === "лист" ? "sheet" : it.k === "источник" ? "src" : "sec"}">${esc(it.k)}</span>
        <span class="finder__t">${mark(it.t, toks)}</span>
        <span class="finder__s">${esc(it.n || "")}${it.s ? ` · ${mark(it.s.length > 120 ? `${it.s.slice(0, 118)}…` : it.s, toks)}` : ""}</span></a>`).join("")
      : `<p class="finder__none">Ничего не нашлось. Проверьте написание или попробуйте другое слово – например, название нотации.</p>`;
    paint();
  }

  function paint() {
    list.querySelectorAll("a").forEach((a, i) => a.setAttribute("aria-selected", String(i === sel)));
    const a = list.querySelectorAll("a")[sel];
    input.setAttribute("aria-activedescendant", a ? a.id : "");
    a?.scrollIntoView({ block: "nearest" });
  }

  function go(a) {
    const url = new URL(a.getAttribute("href"), location.href);
    if (url.pathname === location.pathname && url.hash) {   // та же страница – плавно к месту и подсветка
      close();
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (el) {
        history.replaceState(null, "", url.hash);
        const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--top")) || 64;
        if (window.lenis) window.lenis.scrollTo(el, { offset: -(top + 70), duration: 1.1 });
        else el.scrollIntoView({ behavior: "smooth", block: "center" });
        flash(el);
      }
      return;
    }
    location.href = url.href;
  }

  async function open() {
    if (!dlg) build();
    lastFocus = document.activeElement;
    dlg.classList.add("is-on");
    document.documentElement.classList.add("is-finding");
    window.lenis?.stop();
    input.focus();
    try { await load(); render(); } catch (e) { list.innerHTML = `<p class="finder__none">Индекс поиска не загрузился. Обновите страницу.</p>`; }
  }

  function close() {
    dlg.classList.remove("is-on");
    document.documentElement.classList.remove("is-finding");
    window.lenis?.start();
    lastFocus?.focus?.();
  }

  // строка элемента или источника, на которую перешли по ссылке, коротко подсвечивается
  function flash(el) {
    el.classList.remove("is-flash"); void el.offsetWidth; el.classList.add("is-flash");
    setTimeout(() => el.classList.remove("is-flash"), 2600);
  }
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el && /^(el-|src-)/.test(el.id)) setTimeout(() => flash(el), 400);
  }

  document.querySelectorAll("[data-search-open]").forEach((b) => b.addEventListener("click", open));
  addEventListener("keydown", (e) => {
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" || (e.ctrlKey || e.metaKey) && e.code === "KeyK") {
      e.preventDefault(); dlg?.classList.contains("is-on") ? close() : open();
    } else if (e.key === "/" && !typing && !document.querySelector(".sheet.is-full")) {
      e.preventDefault(); open();
    }
  });
})();
