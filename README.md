# Бюро нотаций – один процесс, семь чертежей

Мини-wiki по методам моделирования бизнес-процессов: **Flow Chart, DFD, RAD, IDEF, ERD, UML, BPMN**.
Для каждой нотации – краткое описание, элементы нотации, правила составления, пример и ссылки на источники.
Во всех примерах – один общий процесс: **обработка заказа в интернет-магазине**.

Сайт: https://starpxand.github.io/bpm-blueprint-wiki/

Это вторая, «чертёжная» версия командной мини-wiki ([bpm-modeling-wiki](https://github.com/starpxand/bpm-modeling-wiki)):
тексты и источники те же, а подача другая – каждая диаграмма оформлена как лист чертежа со штампом
с полноэкранным просмотром и масштабом. Обложка – полёт сквозь альбом из семи листов, управляемый прокруткой
(scroll-scrub); затем заказ проходит по процессу шаг за шагом.

## Команда

| Участник | Нотации и разделы |
|---|---|
| Попов Андрей | BPMN, Flow Chart |
| Красношлыков Пётр | DFD, UML |
| Казанцева Ярослава | RAD, IDEF, список источников |
| Феклисов Никита | ERD, общий пример процесса «Обработка заказа», сравнение и выбор нотации |

Проектное задание по дисциплине «Современные программные средства», ФКТ ФГБОУ ВО «КнАГУ», 2026.

## Сборка

```bash
pip install -r requirements.txt
python build.py          # content/*.md -> site/
python -m http.server -d site 8000
```

GitHub Actions собирает сайт и публикует его на GitHub Pages при каждом push в `main`.

## Устройство

| Путь | Назначение |
|---|---|
| `content/` | тексты нотаций, сравнения и источников (Markdown, общие с командной wiki) |
| `assets/img/` | SVG-диаграммы DFD, RAD, IDEF0, IDEF3, UML, BPMN |
| `assets/css/site.css` | оформление «чертёжный стол»: синька, листы на бумаге, штамп |
| `assets/js/scrub.js` | появление блоков, липкое оглавление, лист во весь экран с масштабом |
| `assets/js/flight.js` | обложка: полёт сквозь альбом листов |
| `assets/js/home.js` | сюжет главной: маршрут заказа и «веер» из семи нотаций |
| `assets/js/mermaid-init.js` | Mermaid 11 для Flow Chart, ERD и UML |
| `build.py` | сборщик страниц |

Анимации отключаются, если в системе включено «уменьшение движения» (`prefers-reduced-motion`).

## Сторонние материалы

- Фото чертёжного стола на обложке (`assets/hero/desk.webp`, тонировано в синьку) – Lucas Kepner, [Unsplash](https://unsplash.com/photos/architectural-blueprints-with-drafting-tools-Yn8D5B8C-eY), Unsplash License.
- Плавная прокрутка – [Lenis](https://github.com/darkroomengineering/lenis) 1.1.13 (`assets/js/vendor/lenis.min.js`), лицензия MIT.
