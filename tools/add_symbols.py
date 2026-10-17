"""Вставляет пиктограммы (assets/sym) в ячейки «Обозначение» таблиц элементов нотаций.
Повторный запуск безопасен: уже вставленные картинки сначала убираются."""
import re
from pathlib import Path

DOCS = Path(__file__).resolve().parents[1] / "content" / "notations"
# файл: {первая ячейка строки: {номер столбца: символ}}
MAP = {
    "flowchart": {"Терминатор": {1: "fc-terminator"}, "Процесс": {1: "fc-process"}, "Решение": {1: "fc-decision"},
                  "Данные": {1: "fc-data"}, "Предопределённый процесс": {1: "fc-predefined"},
                  "Документ": {1: "fc-document"}, "Соединитель": {1: "fc-connector"}, "Линия потока": {1: "fc-flow"}},
    "dfd": {"Внешняя сущность": {1: "dfd-yd-entity", 2: "dfd-gs-entity"},
            "Процесс": {1: "dfd-yd-process", 2: "dfd-gs-process"},
            "Хранилище данных": {1: "dfd-yd-store", 2: "dfd-gs-store"},
            "Поток данных": {1: "dfd-flow", 2: "dfd-flow"}},
    "rad": {"Роль": {1: "rad-role"}, "Состояние (нить роли)": {1: "rad-thread"}, "Действие (activity)": {1: "rad-activity"},
            "Взаимодействие (interaction)": {1: "rad-interaction"}, "Выбор (case refinement)": {1: "rad-case"},
            "Параллельность (part refinement)": {1: "rad-part"}, "Запуск роли": {1: "rad-start"},
            "Внешнее событие": {1: "rad-event"}},
    "idef": {"Функциональный блок": {1: "idef0-block"}, "Вход (Input)": {1: "idef0-input"},
             "Управление (Control)": {1: "idef0-control"}, "Выход (Output)": {1: "idef0-output"},
             "Механизм (Mechanism)": {1: "idef0-mechanism"}, "Контекстная диаграмма A-0": {1: "idef0-context"},
             "Рамка диаграммы": {1: "idef0-frame"}, "Единица работы (UOB)": {1: "idef3-uob"},
             "Связь предшествования": {1: "idef3-link"}, "Перекрёсток «И»": {1: "idef3-and"},
             "Перекрёсток «исключающее ИЛИ»": {1: "idef3-xor"}, "Перекрёсток «ИЛИ»": {1: "idef3-or"},
             "Объект ссылки": {1: "idef3-ref"}},
    "erd": {"Сущность": {1: "erd-chen-entity", 2: "erd-cf-entity"}, "Атрибут": {1: "erd-chen-attr", 2: "erd-cf-attr"},
            "Первичный ключ": {1: "erd-chen-pk", 2: "erd-cf-pk"}, "Внешний ключ": {2: "erd-cf-fk"},
            "Связь": {1: "erd-chen-rel", 2: "erd-cf-rel"}, "Кардинальность": {1: "erd-chen-card", 2: "erd-cf-card"}},
    "uml": {"Начальный узел": {1: "uml-initial"}, "Конечный узел деятельности": {1: "uml-final"},
            "Действие": {1: "uml-action"}, "Узел решения / слияния": {1: "uml-decision"},
            "Разветвитель / соединитель": {1: "uml-fork"}, "Раздел (swimlane)": {1: "uml-lane"},
            "Объектный узел": {1: "uml-object"}},
    "bpmn": {"События": {2: "bpmn-events"}, "Действия": {2: "bpmn-activities"}, "Шлюзы": {2: "bpmn-gateways"},
             "Потоки": {2: "bpmn-flows"}, "Зоны ответственности": {2: "bpmn-pools"},
             "Данные и артефакты": {2: "bpmn-data"}},
}
IMG = re.compile(r"!\[[^\]]*\]\(\.\./assets/sym/[^)]+\)\{ \.sym \} ?")

total = 0
for name, rows in MAP.items():
    p = DOCS / f"{name}.md"
    out, seen = [], set()
    for line in p.read_text(encoding="utf-8").split("\n"):
        if line.startswith("| ") and not line.startswith("|---"):
            cells = [IMG.sub("", c) for c in line.strip().strip("|").split("|")]
            key = cells[0].strip()
            if key in rows and key not in seen and len(cells) > max(rows[key]):
                seen.add(key)
                for col, sym in rows[key].items():
                    alt = cells[0].strip()
                    cells[col] = f" ![{alt}](../assets/sym/{sym}.svg){{ .sym }} {cells[col].strip()} "
                    total += 1
            line = "|" + "|".join(cells) + "|"
        out.append(line)
    missing = set(rows) - seen
    assert not missing, (name, missing)
    p.write_text("\n".join(out), encoding="utf-8", newline="")
print("вставлено пиктограмм:", total)
