/* Короткая самопроверка по материалу листа, без отправки результатов. */
(() => {
  const slot = document.querySelector("[data-study]");
  if (!slot) return;
  const questions = {
    flowchart: ["Проверяем наличие товара. Каким элементом показать выбор «Да / Нет»?", ["Прямоугольником процесса", "Ромбом решения", "Блоком данных"], 1, "Ромб задаёт условие и альтернативные выходы. Прямоугольник обозначает действие."],
    dfd: ["Что подписывают на стрелках диаграммы потоков данных?", ["Передаваемые данные: «Заказ»", "Действие: «Проверить заказ»", "Время выполнения шага"], 0, "Стрелка DFD показывает поток данных. Действие относится к процессу, который эти данные преобразует."],
    rad: ["Менеджер передаёт задание складу. Что важно показать в RAD?", ["Только структуру таблицы заказов", "Только длительность доставки", "Взаимодействие двух ролей"], 2, "RAD связывает действия участников через взаимодействия между ролями. Роль может быть человеком, подразделением или системой."],
    idef: ["С какой стороны к блоку IDEF0 подходит управление, например регламент?", ["Слева", "Сверху", "Снизу"], 1, "Управление входит сверху, вход – слева, механизм – снизу, выход направлен вправо. Регламент задаёт правила выполнения функции."],
    erd: ["Один клиент может оформить много заказов. Какова связь «Клиент – Заказ»?", ["Один ко многим", "Один к одному", "Многие ко многим"], 0, "В этом примере одному клиенту соответствуют несколько заказов, а каждый заказ принадлежит одному клиенту."],
    uml: ["Какой элемент диаграммы деятельности UML разделяет поток на параллельные ветви?", ["Ромб решения", "Конечный узел", "Толстая черта fork"], 2, "Fork запускает параллельные ветви. Ромб решения выбирает альтернативу по условию, а join синхронизирует параллельные ветви."],
    bpmn: ["Как показать обмен сообщениями между двумя отдельными пулами BPMN?", ["Потоком управления", "Потоком сообщений", "Любой сплошной стрелкой"], 1, "Между участниками в разных пулах используют поток сообщений. Поток управления задаёт порядок внутри процесса и не пересекает границу пула."],
  };
  const slug = Object.keys(questions).find((s) => document.body.classList.contains(`p-${s}`));
  if (!slug) return;
  const [question, options, correct, explanation] = questions[slug];
  slot.innerHTML = `<section class="study" aria-labelledby="study-title">
    <p class="study__label">Проверка перед печатью · 1 вопрос</p>
    <h2 id="study-title">Понятно по чертежу?</h2>
    <p id="study-question">${question}</p>
    <div class="study__options" role="group" aria-labelledby="study-question">${options.map((o, i) => `<button type="button" class="study-option" data-answer="${i}" aria-pressed="false"><span>${i + 1}</span>${o}</button>`).join("")}</div>
    <p class="study__feedback" role="status" aria-live="polite"></p>
    <div class="study__footer"><button type="button" class="study-link" data-retry hidden>Попробовать ещё раз</button><button type="button" class="study-link" data-share>Скопировать ссылку на лист</button></div>
    <p class="study__share-status" role="status"></p>
  </section>`;
  const buttons = [...slot.querySelectorAll("[data-answer]")];
  const feedback = slot.querySelector(".study__feedback");
  const retry = slot.querySelector("[data-retry]");
  buttons.forEach((button, i) => button.addEventListener("click", () => {
    buttons.forEach((b, j) => {
      b.disabled = true;
      b.setAttribute("aria-pressed", String(i === j));
      b.classList.toggle("is-correct", j === correct);
      b.classList.toggle("is-wrong", j === i && i !== correct);
    });
    feedback.textContent = `${i === correct ? "Верно." : `Правильный ответ: ${options[correct]}.`} ${explanation}`;
    retry.hidden = false;
  }));
  retry.addEventListener("click", () => {
    buttons.forEach((b) => { b.disabled = false; b.classList.remove("is-correct", "is-wrong"); b.setAttribute("aria-pressed", "false"); });
    feedback.textContent = "";
    retry.hidden = true;
    buttons[0].focus();
  });
  slot.querySelector("[data-share]").addEventListener("click", async () => {
    const url = document.querySelector('link[rel="canonical"]').href;
    const status = slot.querySelector(".study__share-status");
    try { await navigator.clipboard.writeText(url); status.textContent = "Ссылка скопирована. Можно отправить её команде."; }
    catch (e) {
      status.replaceChildren(document.createTextNode("Скопируйте ссылку: "));
      const field = document.createElement("input");
      field.readOnly = true; field.value = url; field.setAttribute("aria-label", "Ссылка на лист");
      status.append(field); field.focus(); field.select();
    }
  });
})();
