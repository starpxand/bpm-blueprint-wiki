/* Сравнение: подбор нотации по вопросу и подсветка столбца матрицы */
(() => {
  const pick = document.querySelector(".lh-pick");
  if (pick) {
    const out = pick.querySelector(".lh-pick__out");
    const btns = pick.querySelectorAll(".lh-pick__q button");
    btns.forEach((b) => {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        const tpl = pick.querySelector(`template[data-n="${b.dataset.n}"]`);
        out.replaceChildren(tpl.content.cloneNode(true));
      });
    });
    out.setAttribute("aria-live", "polite");
  }
  const matrix = [...document.querySelectorAll(".doc table")].find((t) => t.textContent.includes("Порядок шагов"));
  if (!matrix) return;
  const clear = () => matrix.querySelectorAll(".is-col").forEach((c) => c.classList.remove("is-col"));
  matrix.addEventListener("mouseover", (e) => {
    const cell = e.target.closest("td, th");
    if (!cell || cell.cellIndex === 0) return clear();
    clear();
    matrix.querySelectorAll("tr").forEach((tr) => tr.cells[cell.cellIndex]?.classList.add("is-col"));
  });
  matrix.addEventListener("mouseleave", clear);
})();
