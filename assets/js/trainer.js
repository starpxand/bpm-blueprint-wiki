/* Тренажёр «Узнай нотацию»: 10 фрагментов листов альбома, ответ – одна из семи нотаций (кнопкой или 1–7).
   «Отдалить» показывает фрагмент шире – тогда за ответ ½ балла. После ответа фрагмент отъезжает до целого листа
   и рамкой показывает, откуда он взят. Итог – разряд, а от 7 баллов – свидетельство для печати. */
(() => {
  const host = document.querySelector("[data-quiz]");
  const raw = document.getElementById("quiz-data");
  if (!host || !raw) return;
  const DATA = JSON.parse(raw.textContent);
  const root = document.documentElement.dataset.root ?? "";
  const ROUNDS = 10, A = 4 / 3;
  const RANKS = [[9, "Главный конструктор"], [7, "Инженер-чертёжник"], [5, "Техник-чертёжник"], [0, "Стажёр бюро"]];
  const store = window.album || { get: () => ({ read: {} }), put: () => {} };
  const fmt = (v) => String(Math.round(v * 10) / 10).replace(".", ",");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const rankOf = (s) => RANKS.find(([min]) => s >= min)[1];
  let rounds = [], i = 0, score = 0, state = "intro", zoomed = false;

  // ---------------------------------------------------------------- геометрия фрагмента в окне 4:3
  const view = ([x, y, cw, ch]) => ({
    size: `${(100 / cw).toFixed(3)}% auto`,
    pos: `${cw >= 1 ? 50 : (x / (1 - cw)) * 100}% ${ch >= 1 ? 50 : (y / (1 - ch)) * 100}%`,
  });
  function wider(d, [x, y, cw, ch]) {   // тот же центр, площадь вчетверо больше
    const a = d.w / d.h;
    let cw2 = cw * 2, ch2 = (cw2 * a) / A;
    if (ch2 > 1) { ch2 = 1; cw2 = A / a; }
    if (cw2 > 1) { cw2 = 1; ch2 = a / A; }
    const cx = x + cw / 2, cy = y + ch / 2;
    return [Math.min(Math.max(cx - cw2 / 2, 0), 1 - cw2), Math.min(Math.max(cy - ch2 / 2, 0), 1 - ch2), cw2, ch2];
  }
  function whole(d, [x, y, cw, ch]) {   // весь лист в окне и рамка фрагмента на нём
    const a = d.w / d.h, dw = a >= A ? 1 : a / A, dh = a >= A ? A / a : 1, ox = (1 - dw) / 2, oy = (1 - dh) / 2;
    return { size: `${(dw * 100).toFixed(3)}% auto`, pos: "50% 50%",
      box: { left: (ox + x * dw) * 100, top: (oy + y * dh) * 100, width: cw * dw * 100, height: ch * dh * 100 } };
  }

  // ---------------------------------------------------------------- план: каждая нотация хотя бы раз, без повторов подряд
  function plan() {
    const ns = DATA.map((d) => d.n);
    let order = shuffle([...ns, ...shuffle(ns).slice(0, ROUNDS - ns.length)]);
    for (let k = 1; k < order.length; k++) {
      if (order[k] !== order[k - 1]) continue;
      const j = order.findIndex((n, m) => m > k && n !== order[k] && n !== order[k - 1] && n !== order[m - 1] && n !== order[m + 1]);
      if (j > 0) [order[k], order[j]] = [order[j], order[k]];
    }
    const left = Object.fromEntries(DATA.map((d) => [d.n, shuffle(d.crops.map((_, c) => c))]));
    return order.map((n) => { const d = DATA.find((x) => x.n === n); return { d, crop: d.crops[left[n].pop()], got: null, pick: null, zoom: false }; });
  }

  // ---------------------------------------------------------------- экраны
  function intro() {
    state = "intro";
    const best = store.get().best;
    host.innerHTML = `<div class="quiz__intro">
      <div class="quiz__demo" aria-hidden="true">${DATA.slice(0, 3).map((d, k) => {
        const v = view(d.crops[0]);
        return `<span style="background-image:url('${root}${d.img}');background-size:${v.size};background-position:${v.pos};--r:${(k - 1) * 6}deg"></span>`;
      }).join("")}</div>
      <div class="quiz__rules">
        <p>Десять фрагментов чертежей из альбома. Для каждого выберите нотацию – кнопкой или клавишей <kbd>1</kbd>–<kbd>7</kbd>.</p>
        <ul><li>верный ответ – 1 балл;</li>
          <li>«Отдалить» покажет фрагмент шире, но ответ после этого стоит ½ балла;</li>
          <li>7 баллов и больше – свидетельство бюро.</li></ul>
        ${best != null ? `<p class="quiz__best">Ваш лучший результат – <b>${fmt(best)} из 10</b>, разряд «${rankOf(best)}».</p>` : ""}
        <button type="button" class="btn btn--accent quiz__go" data-act="start">Начать</button>
      </div></div>`;
  }

  function frame() {
    const r = rounds[i], v = view(r.crop);
    host.innerHTML = `<div class="quiz__top">
        <span class="quiz__no">Фрагмент ${String(i + 1).padStart(2, "0")} из ${ROUNDS}</span>
        <ol class="quiz__track" aria-hidden="true">${rounds.map((x, k) => `<li class="${k === i ? "is-cur" : x.got === 1 ? "is-ok" : x.got === 0.5 ? "is-half" : x.got === 0 ? "is-bad" : ""}"></li>`).join("")}</ol>
        <span class="quiz__score">Баллы: <b>${fmt(score)}</b></span></div>
      <div class="quiz__main">
        <figure class="quiz__frag">
          <div class="quiz__pane"><div class="quiz__win"><div class="quiz__view" role="img" aria-label="Фрагмент чертежа" style="background-image:url('${root}${r.d.img}');background-size:${v.size};background-position:${v.pos}"></div>
            <i class="quiz__box" aria-hidden="true"></i></div><span class="quiz__crop" aria-hidden="true"></span></div>
          <figcaption>фрагмент листа · ${zoomed ? "шире" : "крупно"}</figcaption>
        </figure>
        <div class="quiz__side">
          <p class="quiz__q">Какая это нотация?</p>
          <div class="quiz__opts">${DATA.map((d, k) => `<button type="button" data-n="${d.n}"><kbd>${k + 1}</kbd>${esc(d.short)}</button>`).join("")}</div>
          <button type="button" class="quiz__zoom" data-act="zoom"${zoomed ? " disabled" : ""}>Отдалить – ответ за ½ балла</button>
          <div class="quiz__res" hidden></div>
        </div>
      </div>`;
    state = "ask";
  }

  function zoomOut() {
    if (state !== "ask" || zoomed) return;
    zoomed = true;
    const r = rounds[i], v = view(wider(r.d, r.crop));
    const el = host.querySelector(".quiz__view");
    el.style.backgroundSize = v.size; el.style.backgroundPosition = v.pos;
    host.querySelector(".quiz__zoom").disabled = true;
    host.querySelector(".quiz__frag figcaption").textContent = "фрагмент листа · шире";
  }

  function answer(n) {
    if (state !== "ask") return;
    state = "shown";
    const r = rounds[i], ok = n === r.d.n;
    r.pick = n; r.zoom = zoomed; r.got = ok ? (zoomed ? 0.5 : 1) : 0;
    score += r.got;
    host.querySelectorAll(".quiz__opts button").forEach((b) => {
      b.disabled = true;
      b.classList.toggle("is-right", b.dataset.n === r.d.n);
      b.classList.toggle("is-wrong", b.dataset.n === n && !ok);
    });
    host.querySelector(".quiz__zoom").hidden = true;
    host.querySelector(".quiz__score b").textContent = fmt(score);
    host.querySelectorAll(".quiz__track li")[i].className = ok ? (zoomed ? "is-half" : "is-ok") : "is-bad";
    // фрагмент отъезжает до целого листа, рамка показывает, откуда он
    const w = whole(r.d, r.crop), el = host.querySelector(".quiz__view"), box = host.querySelector(".quiz__box");
    el.style.backgroundSize = w.size; el.style.backgroundPosition = w.pos;
    Object.entries(w.box).forEach(([k, val]) => box.style.setProperty(k, `${val}%`));
    host.querySelector(".quiz__frag").classList.add("is-whole");
    host.querySelector(".quiz__frag figcaption").textContent = `лист «${r.d.short}» целиком – рамка показывает фрагмент`;
    const res = host.querySelector(".quiz__res");
    res.hidden = false;
    res.className = `quiz__res ${ok ? "is-ok" : "is-bad"}`;
    res.innerHTML = `<p class="quiz__verdict"><span class="quiz__stamp">${ok ? (zoomed ? "½ балла" : "Верно") : "Мимо"}</span>
        ${ok ? "" : `<span>Это <b>${esc(r.d.short)}</b>, а не ${esc(DATA.find((d) => d.n === n).short)}.</span>`}</p>
      <p class="quiz__hint">${esc(r.d.hint)}</p>
      <div class="quiz__next"><a href="${root}${r.d.url}" target="_blank" rel="noopener">Открыть лист «${esc(r.d.short)}»</a>
        <button type="button" class="btn btn--accent" data-act="next">${i + 1 < ROUNDS ? "Дальше" : "Итог"}</button></div>`;
    res.querySelector("[data-act=next]").focus({ preventScroll: true });
  }

  function next() {
    if (state !== "shown") return;
    i += 1; zoomed = false;
    if (i < ROUNDS) frame(); else finish();
  }

  function finish() {
    state = "final";
    const d = store.get();
    const best = Math.max(d.best ?? 0, score);
    d.best = best; store.put(d);
    const misses = rounds.filter((r) => r.got === 0);
    const weak = [...new Set(misses.map((r) => r.d.n))].map((n) => DATA.find((x) => x.n === n));
    host.innerHTML = `<div class="quiz__final">
      <div class="quiz__seal" aria-hidden="true"><svg viewBox="0 0 200 200">
        <defs><path id="qRing" d="M100 100 m-76 0 a76 76 0 1 1 152 0 a76 76 0 1 1 -152 0"/></defs>
        <circle cx="100" cy="100" r="95"/><circle cx="100" cy="100" r="64"/>
        <text class="seal__ring"><textPath href="#qRing">БЮРО НОТАЦИЙ · ТРЕНАЖЁР · ${rankOf(score).toUpperCase()} ·</textPath></text>
        <text class="seal__big" x="100" y="108" text-anchor="middle">${fmt(score)}</text></svg></div>
      <div class="quiz__sum">
        <p class="quiz__grade"><b>${fmt(score)}</b> из 10</p>
        <p class="quiz__rank">Разряд «${rankOf(score)}»${score < best ? ` · лучший результат – ${fmt(best)}` : score > 0 ? " · это ваш лучший результат" : ""}</p>
        <ol class="quiz__log">${rounds.map((r, k) => `<li class="${r.got === 1 ? "is-ok" : r.got ? "is-half" : "is-bad"}"><b>${String(k + 1).padStart(2, "0")}</b> ${esc(r.d.short)}${r.got ? (r.zoom ? " – после «Отдалить»" : "") : ` – ответ ${esc(DATA.find((x) => x.n === r.pick).short)}`}</li>`).join("")}</ol>
        ${weak.length ? `<p class="quiz__weak">Стоит перечитать: ${weak.map((w) => `<a href="${root}${w.url}">${esc(w.short)}</a>`).join(", ")}.</p>` : `<p class="quiz__weak">Ни одной ошибки – все семь нотаций узнаются с первого взгляда.</p>`}
        <div class="quiz__actions"><button type="button" class="btn" data-act="again">Пройти ещё раз</button>
          ${score >= 7 ? `<button type="button" class="btn btn--accent" data-act="cert">Получить свидетельство</button>` : `<span class="quiz__need">Свидетельство – от 7 баллов.</span>`}</div>
        <form class="quiz__form" hidden><label>Как подписать свидетельство?
          <input name="who" maxlength="60" required autocomplete="name" placeholder="Фамилия Имя" value="${esc(d.who || "")}"></label>
          <button type="submit" class="btn btn--accent">Оформить</button></form>
      </div></div>
      <div class="cert-host"></div>`;
  }

  // ---------------------------------------------------------------- свидетельство
  const CERT_CSS = `
.cert{--ink:#142238;--red:#c8432b;container-type:inline-size;position:relative;width:100%;aspect-ratio:297/210;background:#f7f4ec;color:var(--ink);
  font-family:"IBM Plex Sans","Segoe UI",Arial,sans-serif;box-sizing:border-box;overflow:hidden}
.cert *{box-sizing:border-box}
.cert__frame{position:absolute;inset:1.7% 1.7% 1.7% 6.7%;border:.35cqw solid var(--ink)}
.cert__in{position:absolute;inset:6% 7% 7% 11%;display:grid;grid-template-columns:1fr 26%;gap:3cqw}
.cert__kick{font:500 1.15cqw/1.3 "IBM Plex Mono",Consolas,monospace;letter-spacing:.08em;color:var(--red);margin:0 0 1.4cqw}
.cert__title{font:700 5.2cqw/1 "IBM Plex Sans",Arial,sans-serif;letter-spacing:.06em;margin:0}
.cert__num{font:400 1.25cqw "IBM Plex Mono",Consolas,monospace;margin:.8cqw 0 2.6cqw;color:#4b5a72}
.cert__lead{font-size:1.6cqw;margin:0 0 .6cqw}
.cert__who{font:600 3.6cqw/1.15 "IBM Plex Sans",Arial,sans-serif;border-bottom:.2cqw solid var(--ink);padding-bottom:.6cqw;margin:0 0 1.4cqw;overflow-wrap:anywhere}
.cert__txt{font-size:1.6cqw;line-height:1.45;margin:0 0 2cqw;max-width:52cqw}
.cert__tab{border-collapse:collapse;font-size:1.45cqw}
.cert__tab td{border:.12cqw solid var(--ink);padding:.6cqw 1.2cqw}
.cert tr:hover{background:none!important}
.cert__tab td:first-child{font:500 1.15cqw "IBM Plex Mono",Consolas,monospace;letter-spacing:.04em;color:#4b5a72}
.cert__seal{align-self:center;justify-self:center;width:100%;transform:rotate(-12deg)}
.cert__seal circle{fill:none;stroke:#c8432b;stroke-width:4}.cert__seal circle+circle{stroke-width:2}
.cert__seal text{fill:#c8432b;font-family:"IBM Plex Mono",Consolas,monospace;font-weight:600}
.cert__seal .r{font-size:13.5px;letter-spacing:.08em}.cert__seal .b{font-size:30px}.cert__seal .s{font-size:12px;letter-spacing:.05em}
.cert__block{position:absolute;right:1.7%;bottom:1.7%;width:40%;border-top:.3cqw solid var(--ink);border-left:.3cqw solid var(--ink);display:grid;grid-template-columns:22% 1fr;font-size:1.15cqw}
.cert__block span{padding:.45cqw .8cqw;border-bottom:.1cqw solid var(--ink)}.cert__block span:nth-child(odd){border-right:.1cqw solid var(--ink);font-family:"IBM Plex Mono",Consolas,monospace;color:#4b5a72}
.cert__note{position:absolute;left:11%;bottom:3.4%;margin:0;font:400 1cqw "IBM Plex Mono",Consolas,monospace;color:#4b5a72}`;

  function certHTML(who, s, read, num, date) {
    return `<div class="cert"><div class="cert__frame"></div>
      <div class="cert__in"><div>
        <p class="cert__kick">БЮРО НОТАЦИЙ · ТРЕНАЖЁР «УЗНАЙ НОТАЦИЮ»</p>
        <h2 class="cert__title">СВИДЕТЕЛЬСТВО</h2>
        <p class="cert__num">№ ${num} от ${date}</p>
        <p class="cert__lead">удостоверяет, что</p>
        <p class="cert__who">${esc(who)}</p>
        <p class="cert__txt">узнаёт по фрагменту чертежа семь нотаций моделирования бизнес-процессов: Flow Chart, DFD, RAD, IDEF, ERD, UML и BPMN.</p>
        <table class="cert__tab"><tr><td>Результат</td><td>${fmt(s)} из 10</td></tr><tr><td>Разряд</td><td>${rankOf(s)}</td></tr>
          ${read ? `<tr><td>Листов альбома изучено</td><td>${read} из 7</td></tr>` : ""}</table></div>
        <svg class="cert__seal" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="cRing" d="M100 100 m-76 0 a76 76 0 1 1 152 0 a76 76 0 1 1 -152 0"/></defs>
          <circle cx="100" cy="100" r="95"/><circle cx="100" cy="100" r="64"/>
          <text class="r"><textPath href="#cRing">БЮРО НОТАЦИЙ · ТРЕНАЖЁР · ${date} ·</textPath></text>
          <text class="b" x="100" y="104" text-anchor="middle">${fmt(s)}</text><text class="s" x="100" y="126" text-anchor="middle">ИЗ 10</text></svg></div>
      <div class="cert__block"><span>Разраб.</span><span>${esc(who)}</span><span>Пров.</span><span>Бюро нотаций</span><span>Лист</span><span>1 · листов 1</span></div>
      <p class="cert__note">Учебный тренажёр мини-wiki «Бюро нотаций» – не документ об образовании.</p></div>`;
  }

  function showCert(who) {
    const d = store.get();
    d.who = who; store.put(d);
    const read = Object.keys(d.read || {}).length, date = new Date().toLocaleDateString("ru-RU");
    const num = String(1000 + Math.floor(Math.random() * 9000));
    if (!document.getElementById("cert-css")) {
      const st = document.createElement("style"); st.id = "cert-css"; st.textContent = CERT_CSS; document.head.append(st);
    }
    const html = certHTML(who, score, read, num, date);
    const hostC = host.querySelector(".cert-host");
    hostC.innerHTML = `<div class="cert-wrap">${html}</div>
      <p class="cert-acts"><button type="button" class="btn btn--accent" data-act="print">Распечатать или сохранить в PDF</button></p>`;
    hostC.querySelector("[data-act=print]").addEventListener("click", () => {
      const doc = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Свидетельство – ${esc(who)}</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>${CERT_CSS}@page{size:A4 landscape;margin:0}html,body{margin:0}body{background:#888}.cert{width:297mm;margin:0 auto}
        @media print{body{background:none}}</style></head><body>${html}
        <script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
      const url = URL.createObjectURL(new Blob([doc], { type: "text/html" }));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    hostC.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------------------------------------------------------------- события
  host.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "start" || act === "again") { rounds = plan(); i = 0; score = 0; zoomed = false; frame(); host.scrollIntoView({ block: "start" }); }
    else if (act === "zoom") zoomOut();
    else if (act === "next") next();
    else if (act === "cert") { const f = host.querySelector(".quiz__form"); f.hidden = false; f.querySelector("input").focus(); }
    else if (b.dataset.n) answer(b.dataset.n);
  });
  host.addEventListener("submit", (e) => {
    e.preventDefault();
    const who = e.target.querySelector("input").value.trim();
    if (who) showCert(who);
  });
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea") || e.ctrlKey || e.metaKey || e.altKey || document.documentElement.classList.contains("is-finding")) return;
    if (state === "ask" && /^[1-7]$/.test(e.key)) { e.preventDefault(); answer(DATA[Number(e.key) - 1].n); }
    else if (state === "ask" && e.code === "KeyZ") zoomOut();
    else if (state === "shown" && (e.key === "Enter" || e.key === " ") && !e.target.closest("a, button")) { e.preventDefault(); next(); }
  });
  intro();
})();
