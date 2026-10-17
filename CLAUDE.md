# bpm-blueprint-wiki – заметки для Claude

- Статический сайт «Бюро нотаций»: `python build.py` собирает `content/*.md` в `site/` (site/ в .gitignore, публикует Actions).
- Тексты в `content/` – копия из командной wiki `D:\Projects\logihub\bpm-modeling-team\docs`; правки содержания вносить в обе.
- Стиль: синька (#0c2340) + бумага (#f7f4ec) + янтарь (#ffb547); шрифты IBM Plex Sans/Mono.
- scroll-scrub: `.scrub` (190vh) > `.scrub__pin` (sticky) > `.sheet`; высокие схемы (h/w > 1.1) получают `.scrub--tall` и не закрепляются.
- Проверка: локальный сервер `py -m http.server 8765` из site/, кадры – `D:\Projects\logihub\_tools\review.py`.
- Команда из 4 равноправных участников (без «руководителя»): Попов, Красношлыков, Казанцева, Феклисов.
