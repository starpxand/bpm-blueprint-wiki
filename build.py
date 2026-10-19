"""Сборка сайта «Бюро нотаций»: content/*.md -> site/*.html.

Тексты нотаций совпадают с командной мини-wiki (bpm-modeling-wiki); здесь меняется только подача:
каждая диаграмма – лист чертежа со штампом; обложка – полёт сквозь альбом по прокрутке (scroll-scrub).
Запуск: python build.py  ->  папка site/ (её публикует GitHub Actions).
"""
import html
import json
import re
import shutil
from pathlib import Path

import markdown

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
OUT = ROOT / "site"
import hashlib
VER = hashlib.sha1(b"".join(f.read_bytes() for f in sorted((ROOT / "assets").glob("*/*.*")) if f.suffix in (".css", ".js"))).hexdigest()[:8]   # сброс кэша при любой правке

NOTATIONS = [  # slug, короткое имя, полное имя, автор листа, вопрос
    ("flowchart", "Flow Chart", "Блок-схема", "Попов Андрей", "Какие шаги и в каком порядке?"),
    ("dfd", "DFD", "Диаграмма потоков данных", "Красношлыков Пётр", "Откуда и куда движутся данные?"),
    ("rad", "RAD", "Диаграмма ролей и действий", "Казанцева Ярослава", "Кто что делает и как роли взаимодействуют?"),
    ("idef", "IDEF", "Семейство IDEF0 / IDEF3", "Казанцева Ярослава", "Что делает организация и чем это управляется?"),
    ("erd", "ERD", "Модель «сущность – связь»", "Феклисов Никита", "Какие данные хранить и как они связаны?"),
    ("uml", "UML", "Унифицированный язык моделирования", "Красношлыков Пётр", "Как устроена и ведёт себя программная система?"),
    ("bpmn", "BPMN", "Нотация бизнес-процессов", "Попов Андрей", "Кто, что, в каком порядке и при каких событиях?"),
]
TEAM = [
    ("Попов Андрей", "BPMN, Flow Chart"),
    ("Красношлыков Пётр", "DFD, UML"),
    ("Казанцева Ярослава", "RAD, IDEF, список источников"),
    ("Феклисов Никита", "ERD, общий пример процесса «Обработка заказа», сравнение и выбор нотации"),
]
HERO_IMG = {"flowchart": "hero_flowchart", "dfd": "dfd_level1", "rad": "rad", "idef": "idef0_a0",
            "erd": "hero_erd", "uml": "uml_activity", "bpmn": "bpmn_order"}   # листы обложки – assets/hero/*.webp (растр: 3D-сцена не растрирует SVG каждый кадр)
TRAINER_HINTS = {   # как узнать нотацию по фрагменту – по таблицам «Элементы нотации» листов
    "flowchart": "Блок-схему выдают ромбы решений с выходами «Да» и «Нет», прямоугольники действий и скруглённые «Начало» и «Конец» (ГОСТ 19.701-90).",
    "dfd": "В DFD на стрелках подписаны данные, а не действия; процессы пронумерованы, хранилища D1, D2 открыты справа, внешние сущности – в рамках.",
    "rad": "RAD узнаётся по рамкам ролей с вертикальными нитями, закрашенным квадратам действий и горизонтальным линиям взаимодействий с пустыми квадратами.",
    "idef": "IDEF0 – это блоки A1, A2… «лесенкой»: вход слева, выход справа, управление сверху, механизм снизу; внизу – рамка с полями «Узел» и «Название».",
    "erd": "ERD – прямоугольники сущностей со списками атрибутов и отметками PK и FK, а на концах связей – «воронья лапка» (много) и черта (один).",
    "uml": "Диаграмму деятельности UML выдают закрашенный круг начала, скруглённые действия, ромбы с условиями в квадратных скобках и толстые черты параллельных ветвей.",
    "bpmn": "BPMN – пул с дорожками, круги событий, ромбы шлюзов со значками «X» и «+», задачи с пиктограммами типа в углу.",
}
INDEX = []   # поиск по альбому: assets/search.json
TEAM_WIKI = "https://starpxand.github.io/bpm-modeling-wiki/"
SITE = "https://starpxand.github.io/bpm-blueprint-wiki/"
REPO = "https://github.com/starpxand/bpm-blueprint-wiki"


# ------------------------------------------------------------------ markdown
def mermaid_fence(source, language, css_class, options, md, **kw):
    return f'<pre class="mermaid">{html.escape(source)}</pre>'


def md_to_html(text):
    return markdown.markdown(text, extensions=[
        "tables", "attr_list", "md_in_html", "admonition", "toc",
        "pymdownx.superfences",
    ], extension_configs={
        "pymdownx.superfences": {"custom_fences": [{"name": "mermaid", "class": "mermaid", "format": mermaid_fence}]},
        "toc": {"slugify": lambda s, sep: re.sub(r"[^\w]+", "-", s.lower()).strip("-")},
    })


def untab(md):
    """Вкладки pymdownx (=== "Заголовок") -> подзаголовки ### с выведенным из отступа содержимым."""
    out, inside = [], False
    for line in md.split("\n"):
        m = re.match(r'^=== "(.+)"\s*$', line)
        if m:
            out.append(f"### {m.group(1)}"); inside = True; continue
        if inside and line.startswith("    "):
            out.append(line[4:]); continue
        if inside and line.strip() and not line.startswith(" "):
            inside = False
        out.append(line)
    return "\n".join(out)


def fix_links(md):
    md = re.sub(r"\(\.\./sources\.md(#[\w-]+)?\)", lambda m: f"(../sources.html{m.group(1) or ''})", md)
    md = re.sub(r"\(\.\./notations/(\w+)\.md\)", r"(\1.html)", md)
    md = re.sub(r"\((\w+)\.md\)", r"(\1.html)", md)
    return md


def split_stats(md):
    """Блок lh-stats -> список пар (подпись, значение) для «паспорта» листа."""
    m = re.search(r'<div class="lh-stats" markdown>(.*?)</div>\s*\n(?=\s*\n)', md, re.S)
    if not m:
        return md, []
    pairs = re.findall(r"<span>(.*?)</span><b>(.*?)</b>", m.group(1))
    return md.replace(m.group(0), ""), pairs


# ------------------------------------------------------------------ листы-диаграммы
def svg_inline(name):
    s = (ROOT / "assets" / "img" / name).read_text(encoding="utf-8")
    s = re.sub(r"<\?xml.*?\?>|<!--.*?-->|<!DOCTYPE.*?>", "", s, flags=re.S).strip()
    return s


def sheet(inner, caption, notation, author, n_sheet, kind="svg"):
    return f"""
<section class="scrub" data-kind="{kind}">
  <figure class="sheet" data-sheet>
    <button type="button" class="sheet__full" aria-label="Открыть во весь экран" title="Во весь экран (двойной щелчок)">⤢</button>
    <button type="button" class="sheet__lens" aria-pressed="false" aria-label="Лупа" title="Лупа: наведите на схему (или удерживайте Shift)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/></svg></button>
    <div class="sheet__draw">{inner}</div>
    <figcaption class="sheet__cap"><span><b>Рисунок {n_sheet}</b> – {html.escape(caption)}</span>
      <span class="sheet__by">{html.escape(notation)} · {html.escape(author)}</span></figcaption>
  </figure>
</section>"""


def sheets(body, notation, author):
    """<img src=*.svg> и <pre class=mermaid> -> листы со штампом; заголовок листа – подпись или ближайший h3/h2."""
    count = [0]

    def nxt():
        count[0] += 1
        return count[0]

    def img(m):
        alt, src = m.group(1), Path(m.group(2)).name
        return sheet(svg_inline(src), alt, notation, author, nxt())

    body = re.sub(r'<p><img alt="([^"]*)" src="[^"]*?/img/([^"]+\.svg)" ?/?></p>', img, body)
    parts = re.split(r'(<pre class="mermaid">.*?</pre>)', body, flags=re.S)
    res = []
    for i, part in enumerate(parts):
        if part.startswith('<pre class="mermaid">'):
            before = "".join(res)
            hs = re.findall(r"<h[23][^>]*>(.*?)</h[23]>", before)
            cap = re.sub(r"<.*?>", "", hs[-1]) if hs else notation
            if cap.lower().startswith("пример") or cap.lower().startswith("как выбрать"):
                cap = {"Flow Chart": "Блок-схема обработки заказа", "ERD": "ERD – данные интернет-магазина"}.get(notation, cap)
            res.append(sheet(part, cap, notation, author, nxt(), "mermaid"))
        else:
            res.append(part)
    body = "".join(res)
    return body, count[0]


def decorate(body):
    body = re.sub(r"<table>", '<div class="table-wrap"><table>', body)
    body = body.replace("</table>", "</table></div>")
    body = re.sub(r'<div class="admonition (\w+)">\s*<p class="admonition-title">(.*?)</p>',
                  r'<aside class="margin-note margin-note--\1"><p class="margin-note__title">\2</p>', body)
    # закрывающий </div> адмонишена -> </aside>: адмонишены не вложены, заменяем ближайший
    out, pos = [], 0
    for m in re.finditer(r'<aside class="margin-note', body):
        out.append(body[pos:m.start()]); end = body.index("</div>", m.start())
        out.append(body[m.start():end] + "</aside>"); pos = end + len("</div>")
    out.append(body[pos:])
    return "".join(out)


# ------------------------------------------------------------------ шаблон страницы
def nav(depth, active):
    pre = "../" * depth
    items = "".join(
        f'<a href="{pre}notations/{s}.html"{" aria-current=page" if active == s else ""}>{short}</a>'
        for s, short, *_ in NOTATIONS)
    return f"""<header class="top">
  <a class="brand" href="{pre}index.html"><span class="brand__mark" aria-hidden="true">
    <svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="2"/><path d="M3 22h26M18 22v7M9 9h9M9 14h14"/></svg></span>
    <span class="brand__name">Бюро нотаций</span></a>
  <nav class="top__nav" aria-label="Нотации">{items}
    <a class="top__sep" href="{pre}comparison.html"{" aria-current=page" if active == "comparison" else ""}>Сравнение</a>
    <a href="{pre}trainer.html"{" aria-current=page" if active == "trainer" else ""}>Тренажёр</a>
    <a href="{pre}sources.html"{" aria-current=page" if active == "sources" else ""}>Источники</a></nav>
  <button type="button" class="top__search" data-search-open aria-label="Поиск по альбому (Ctrl+K)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/></svg><span>Поиск</span><kbd>Ctrl K</kbd></button>
  <div class="top__bar" aria-hidden="true"><i></i></div>
</header>"""


def footer(depth):
    team = " · ".join(n for n, _ in TEAM)
    return f"""<footer class="foot">
  <div class="foot__in">
    <p><b>Бюро нотаций</b> – мини-wiki по методам моделирования бизнес-процессов. Проектное задание по дисциплине
    «Современные программные средства», ФКТ ФГБОУ ВО «КнАГУ», 2026.</p>
    <p>Разработали: {team}.</p>
    <p><a href="{TEAM_WIKI}">Командная мини-wiki (MkDocs)</a> · <a href="{REPO}">Исходный код</a> ·
    <a href="{"../" * depth}sources.html">Источники</a></p>
    <p class="foot__keys">Клавиша <kbd>?</kbd> – горячие клавиши: <kbd>/</kbd> поиск, <kbd>1</kbd>–<kbd>7</kbd> листы альбома, <kbd>←</kbd> <kbd>→</kbd> соседние листы, <kbd>Shift</kbd> над схемой – лупа.</p>
  </div>
</footer>"""


def page(title, body, depth=0, active="", desc="", scripts=("scrub",), mermaid=False, extra_head="", path=""):
    pre = "../" * depth
    desc = desc or "Мини-wiki по нотациям моделирования бизнес-процессов: Flow Chart, DFD, RAD, IDEF, ERD, UML, BPMN"
    js = "".join(f'<script src="{pre}assets/js/{s}.js?v={VER}" defer></script>' for s in ("vendor/lenis.min", "fx", "search", "album", *scripts))
    mm = (f'<script type="module" src="{pre}assets/js/mermaid-init.js?v={VER}"></script>' if mermaid else "")
    return f"""<!doctype html>
<html lang="ru" data-root="{pre}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · Бюро нотаций</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="Бюро нотаций">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:image" content="{SITE}assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0c2340">
<script>if (!matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("js-scrub");</script>
<link rel="icon" href="{pre}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{pre}assets/css/site.css?v={VER}">
{extra_head}</head>
<body class="{active and 'p-' + active}">
<a class="skip" href="#main">К содержанию</a>
{nav(depth, active)}
<main id="main">
{body}
</main>
{footer(depth)}
{js}{mm}
</body>
</html>
"""


# ------------------------------------------------------------------ страницы нотаций
def notation_page(i, slug, short, full, author, question):
    md = (CONTENT / "notations" / f"{slug}.md").read_text(encoding="utf-8")
    md = re.sub(r"\A---\n.*?\n---\n", "", md, flags=re.S)        # служебная шапка MkDocs
    md = untab(fix_links(md))
    title = re.search(r"^# (.+)$", md, re.M).group(1)
    md = re.sub(r"^# .+\n", "", md, count=1, flags=re.M)
    md, stats = split_stats(md)
    if slug == "bpmn":   # статичный лист вместо встроенного bpmn-js
        md = re.sub(r'<div class="lh-bpmn"[^>]*markdown>\s*(.*?)\s*</div>', r"\1", md, flags=re.S)
        md = re.sub(r"Это файл BPMN 2\.0, открытый движком bpmn-js.*?шаг за шагом\.",
                    "Диаграмма построена по файлу BPMN 2.0, созданному в редакторе bpmn-js [[5]](../sources.html#src-5). "
                    f"Интерактивную модель с пошаговым проходом можно открыть "
                    f"в [командной мини-wiki]({TEAM_WIKI}notations/bpmn/).", md, flags=re.S)
    body = md_to_html(md)
    body, n = sheets(body, short, author)
    body = decorate(body)
    body = tag_elements(body, slug, short)
    index_sections(body, f"notations/{slug}.html", short)
    INDEX.append(dict(k="лист", t=f"{short} – {full}", s=question, u=f"notations/{slug}.html", n=f"Лист {i + 1:02d}", x=title))
    sections = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body)
    toc = "".join(f'<a href="#{a}">{re.sub(r"<.*?>", "", t)}</a>' for a, t in sections)
    passport = "".join(f'<div class="passport__row"><span>{k}</span><b>{v}</b></div>' for k, v in stats)
    prev_ = NOTATIONS[i - 1] if i > 0 else None
    next_ = NOTATIONS[i + 1] if i + 1 < len(NOTATIONS) else None
    pager = '<nav class="pager" aria-label="Соседние листы">'
    pager += (f'<a class="pager__prev" href="{prev_[0]}.html"><small>← Лист {i:02d}</small>{prev_[1]}</a>' if prev_
              else '<a class="pager__prev" href="../index.html"><small>← Обложка</small>Главная</a>')
    pager += (f'<a class="pager__next" href="{next_[0]}.html"><small>Лист {i + 2:02d} →</small>{next_[1]}</a>' if next_
              else '<a class="pager__next" href="../comparison.html"><small>Итог →</small>Сравнение и выбор</a>')
    pager += "</nav>"
    hero = f"""
<section class="sheet-hero">
  <div class="sheet-hero__in">
    <p class="kicker">Лист {i + 1:02d} из 07 · {html.escape(short)}</p>
    <h1>{html.escape(title)}</h1>
    <p class="sheet-hero__q">«{html.escape(question)}»</p>
    <div class="passport">{passport}
      <div class="passport__row"><span>Лист подготовил(а)</span><b>{html.escape(author)}</b></div></div>
  </div>
</section>
<nav class="toc" aria-label="Разделы листа">{toc}</nav>"""
    mp = '<div class="mp" aria-hidden="true"><span>М. П.</span></div>'   # место печати «Изучено»
    article = f'<article class="doc doc--sheet">{body}{mp}</article>{pager}'
    out = page(title, hero + article, 1, slug, desc=f"{title}: описание, элементы нотации, правила составления, пример, источники",
               scripts=("scrub", "loupe"), mermaid="mermaid" in body, path=f"notations/{slug}.html")
    (OUT / "notations" / f"{slug}.html").write_text(out, encoding="utf-8")
    return n


# ------------------------------------------------------------------ сравнение и источники
def comparison_page():
    md = fix_links((CONTENT / "comparison.md").read_text(encoding="utf-8"))
    md = re.sub(r"^# .+\n", "", md, count=1, flags=re.M)
    md = md.replace('href="../notations/', 'href="notations/').replace('/">Открыть', '.html">Открыть')
    body = md_to_html(md)
    body, _ = sheets(body, "Сравнение", "Феклисов Никита")
    body = decorate(body)
    anchor = '<h2 id="что-показывает-каждая-нотация">'
    assert anchor in body
    body = body.replace(anchor, curtain() + anchor, 1)
    index_sections(body, "comparison.html", "Сравнение")
    INDEX.append(dict(k="страница", t="Сравнение и выбор нотации", s="Матрица возможностей, шторка «один процесс – два чертежа», подбор нотации под вопрос",
                      u="comparison.html", n="Сводный лист"))
    hero = """<section class="sheet-hero sheet-hero--plain"><div class="sheet-hero__in">
<p class="kicker">Сводный лист · итог</p><h1>Сравнение и выбор нотации</h1>
<p class="sheet-hero__q">Универсальной нотации нет – каждая отвечает на свой вопрос.</p></div></section>"""
    (OUT / "comparison.html").write_text(
        page("Сравнение и выбор нотации", hero + f'<article class="doc">{body}</article>', 0, "comparison",
             scripts=("scrub", "pick", "curtain", "loupe"), mermaid=True, path="comparison.html",
             desc="Сравнение нотаций Flow Chart, DFD, RAD, IDEF, ERD, UML и BPMN: матрица возможностей и подбор нотации под вопрос"),
        encoding="utf-8")


def sources_page():
    md = (CONTENT / "sources.md").read_text(encoding="utf-8")
    md = re.sub(r"^# .+\n", "", md, count=1, flags=re.M)
    # таблица инструментов в командной wiki описывает её сборку – здесь своя
    md = re.sub(r"^\| DFD, RAD, IDEF0, IDEF3, UML \(деятельность\) \|.*$",
                "| DFD, RAD, IDEF0, IDEF3, UML (деятельность) | векторная графика SVG, построенная по правилам нотаций |",
                md, flags=re.M)
    md = re.sub(r"^\| BPMN \|.*$",
                "| BPMN | модель BPMN 2.0 построена в редакторе bpmn-js [[5]](#src-5) и экспортирована в SVG |", md, flags=re.M)
    md += ("\n## Как устроен этот сайт\n\nСтраницы собираются из тех же текстов, что и командная мини-wiki на MkDocs, "
           "скриптом `build.py`; обложка – полёт сквозь альбом листов, управляемый прокруткой (scroll-scrub), "
           f"диаграммы открываются во весь экран с масштабом. Исходный код: <{REPO}>.\n")
    body = decorate(md_to_html(md))
    for num, text in re.findall(r"^(\d+) (.+?)\n\{ #src-\d+ \}", md, re.M):
        text = re.sub(r"<(https?://[^>]+)>", r"\1", text)
        head = re.split(r" / | // | : ", text, maxsplit=1)[0]
        INDEX.append(dict(k="источник", t=f"[{num}] {head[:110]}", s=text[:170], u=f"sources.html#src-{num}", n="Источники"))
    hero = """<section class="sheet-hero sheet-hero--plain"><div class="sheet-hero__in">
<p class="kicker">Спецификация к чертежам</p><h1>Источники</h1>
<p class="sheet-hero__q">21 источник: стандарты, книги, спецификации и справочные сайты.</p></div></section>"""
    (OUT / "sources.html").write_text(page("Источники", hero + f'<article class="doc doc--sources">{body}</article>',
                                           0, "sources", scripts=("scrub",), path="sources.html",
                                           desc="Список источников мини-wiki по нотациям моделирования бизнес-процессов"),
                                      encoding="utf-8")


# ------------------------------------------------------------------ поиск по альбому
def clean(fragment):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<.*?>", " ", fragment))).strip()


def index_sections(body, url, context):
    for tag, hid, text in re.findall(r'<(h[23]) id="([^"]+)">(.*?)</h[23]>', body):
        INDEX.append(dict(k="раздел", t=clean(text), s=f"{context} · {'раздел' if tag == 'h2' else 'подраздел'}",
                          u=f"{url}#{hid}", n=context))


def tag_elements(body, slug, short):
    """Строки таблиц «Элементы нотации» получают id (на них ведёт поиск) и попадают в индекс."""
    count = [0]

    def row(m):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", m.group(1), re.S)
        if not cells:
            return m.group(0)
        count[0] += 1
        rid = f"el-{slug}-{count[0]}"
        name, rest = clean(cells[0]), [clean(c) for c in cells[1:]]
        INDEX.append(dict(k="элемент", t=name, s=" – ".join(r for r in rest if r)[:180], u=f"notations/{slug}.html#{rid}", n=short))
        return f'<tr id="{rid}">{m.group(1)}</tr>'

    parts = re.split(r'(?=<h2 id=")', body)
    for k, part in enumerate(parts):
        head = re.match(r'<h2 id="[^"]+">(.*?)</h2>', part)
        if head and clean(head.group(1)).startswith("Элементы"):
            parts[k] = re.sub(r"<tr>(.*?)</tr>", row, part, flags=re.S)
    return "".join(parts)


# ------------------------------------------------------------------ шторка сравнения
def curtain():
    def chips(side, sel):
        return "".join(
            f'<button type="button" data-side="{side}" data-n="{s}" data-src="assets/hero/{HERO_IMG[s]}.webp" '
            f'aria-pressed="{"true" if s == sel else "false"}">{short}</button>' for s, short, *_ in NOTATIONS)
    a, b = "dfd", "idef"   # оба листа альбомные – по умолчанию сравнение без пустых полей
    return f"""<h2 id="шторка">Один процесс – два чертежа</h2>
<p>Один и тот же процесс «Обработка заказа» начерчен в каждой нотации по-своему. Выберите два листа и потяните
шторку: слева и справа – одно и то же, но с разных сторон.</p>
<div class="curtain" data-curtain>
  <div class="curtain__pick" role="group" aria-label="Лист слева"><span>Слева</span>{chips("a", a)}</div>
  <div class="curtain__pick" role="group" aria-label="Лист справа"><span>Справа</span>{chips("b", b)}</div>
  <div class="curtain__stage" style="--x:50%">
    <figure class="curtain__img curtain__img--b"><img src="assets/hero/{HERO_IMG[b]}.webp" alt="Лист справа: IDEF"></figure>
    <figure class="curtain__img curtain__img--a"><img src="assets/hero/{HERO_IMG[a]}.webp" alt="Лист слева: DFD"></figure>
    <span class="curtain__tag curtain__tag--a">DFD</span><span class="curtain__tag curtain__tag--b">IDEF</span>
    <div class="curtain__line" aria-hidden="true"><i>⇔</i></div>
    <input class="curtain__range" type="range" min="0" max="100" step="0.5" value="50" aria-label="Положение шторки, процентов от левого края">
  </div>
</div>
"""


# ------------------------------------------------------------------ тренажёр
def trainer_crops(name, n=5):
    """Фрагменты листа для тренажёра: окна 4:3 с наибольшей долей «чернил», не перекрывающие друг друга."""
    from PIL import Image, ImageStat
    im = Image.open(ROOT / "assets" / "hero" / f"{name}.webp").convert("L")
    W, H = im.size
    fw = int(min(520, W * 0.6)); fh = int(fw * 0.75)
    if fh > H * 0.8:
        fh = int(H * 0.8); fw = int(fh / 0.75)
    f = 4
    small = im.resize((W // f, H // f)).point(lambda v: 255 if v < 200 else 0)
    sw, sh = fw // f, fh // f
    step = max(3, sw // 6)
    cand = []
    for y in range(0, small.height - sh + 1, step):
        for x in range(0, small.width - sw + 1, step):
            ink = ImageStat.Stat(small.crop((x, y, x + sw, y + sh))).mean[0] / 255
            if 0.05 <= ink <= 0.3:
                cand.append((ink, x, y))
    cand.sort(reverse=True)
    chosen = []
    for ink, x, y in cand:
        if all(abs(x - cx) > sw * 0.6 or abs(y - cy) > sh * 0.6 for cx, cy in chosen):
            chosen.append((x, y))
        if len(chosen) == n:
            break
    return W, H, [[round(x * f / W, 4), round(y * f / H, 4), round(fw / W, 4), round(fh / H, 4)] for x, y in chosen]


def trainer_page():
    data = []
    for s, short, full, author, q in NOTATIONS:
        W, H, crops = trainer_crops(HERO_IMG[s])
        data.append(dict(n=s, short=short, full=full, img=f"assets/hero/{HERO_IMG[s]}.webp", w=W, h=H, crops=crops,
                         hint=TRAINER_HINTS[s], url=f"notations/{s}.html"))
    body = f"""<section class="sheet-hero sheet-hero--plain"><div class="sheet-hero__in">
<p class="kicker">Тренажёр · 10 фрагментов</p><h1>Узнай нотацию по фрагменту</h1>
<p class="sheet-hero__q">Перед вами кусок чертежа из альбома. Какая это нотация?</p></div></section>
<article class="doc doc--quiz"><div class="quiz" data-quiz aria-live="polite">
  <noscript><p>Для тренажёра нужен JavaScript.</p></noscript></div></article>
<script type="application/json" id="quiz-data">{json.dumps(data, ensure_ascii=False).replace("</", "<\\/")}</script>"""
    (OUT / "trainer.html").write_text(
        page("Тренажёр «Узнай нотацию»", body, 0, "trainer", scripts=("scrub", "trainer"), path="trainer.html",
             desc="Тренажёр: узнайте нотацию моделирования бизнес-процессов по фрагменту чертежа – Flow Chart, DFD, RAD, IDEF, ERD, UML, BPMN"),
        encoding="utf-8")
    INDEX.append(dict(k="страница", t="Тренажёр «Узнай нотацию»", s="10 фрагментов чертежей: угадайте нотацию, получите разряд и свидетельство",
                      u="trainer.html", n="Тренажёр"))


# ------------------------------------------------------------------ главная
STEPS = [
    ("Клиент", "оформляет заказ", "На сайте магазина клиент выбирает товары и отправляет заказ."),
    ("Менеджер", "проверяет наличие", "Если товара нет, менеджер согласует с клиентом замену или отмену."),
    ("Менеджер", "выставляет счёт", "Счёт уходит клиенту; на оплату даётся три дня, иначе заказ отменяется."),
    ("Клиент", "оплачивает", "Платёжный сервис подтверждает оплату – заказ передаётся на склад."),
    ("Склад", "собирает и упаковывает", "Сборка и упаковка идут параллельно, затем заказ готов к отгрузке."),
    ("Доставка", "доставляет заказ", "Служба доставки везёт заказ; клиент получает его, и заказ закрывается."),
]


def index_page():
    idx = (CONTENT / "index.md").read_text(encoding="utf-8")
    intro = re.search(r"# Методы моделирования бизнес-процессов\n\n(.*?)\n\n<div class=\"grid cards\"", idx, re.S).group(1)
    intro_html = md_to_html(intro)
    layout = re.search(r"## Как устроена каждая страница\n\n(.*?)\n\n!!!", idx, re.S).group(1)
    layout_html = decorate(md_to_html(layout.replace("Ссылки | источники", "Ссылки | источники")))
    steps = "".join(
        f'<li class="story__step" data-step="{k}"><span class="story__no">{k + 1:02d}</span>'
        f'<b>{who}</b> {what}<p>{txt}</p></li>' for k, (who, what, txt) in enumerate(STEPS))
    cards = "".join(f"""
<a class="card" href="notations/{s}.html" style="--i:{k}" data-slug="{s}">
  <span class="card__no">Лист {k + 1:02d}</span>
  <span class="card__name">{short}</span>
  <span class="card__full">{full}</span>
  <span class="card__q">«{q}»</span>
  <span class="card__by">{a}</span>
</a>""" for k, (s, short, full, a, q) in enumerate(NOTATIONS))
    team = "".join(f'<div class="team__row"><b>{n}</b><span>{r}</span></div>' for n, r in TEAM)
    def ar(name):
        from PIL import Image
        w, h = Image.open(ROOT / "assets" / "hero" / f"{name}.webp").size
        return max(0.68, min(2.1, w / h * 1.06))
    sheets_html = "".join(
        f'<a class="fsheet" href="notations/{s}.html" data-k="{k}" tabindex="-1" aria-hidden="true" style="--ar:{ar(HERO_IMG[s]):.3f}">'
        f'<span class="fsheet__paper"><img src="assets/hero/{HERO_IMG[s]}.webp" alt="" decoding="async"></span>'
        f'<span class="fsheet__tag"><b>{k + 1:02d}</b>{short}</span></a>'
        for k, (s, short, *_) in enumerate(NOTATIONS))
    caps = "".join(
        f'<a class="fcap" href="notations/{s}.html" data-k="{k}">'
        f'<span class="fcap__no">Лист {k + 1:02d} из 07</span><span class="fcap__name">{short}</span>'
        f'<span class="fcap__full">{full}</span><span class="fcap__q">«{q}»</span>'
        f'<span class="fcap__by"><small>Разраб.</small> {a}</span><span class="fcap__go">Открыть лист →</span></a>'
        for k, (s, short, full, a, q) in enumerate(NOTATIONS))
    ticks = "".join(f'<i data-k="{k}"><b>{k + 1:02d}</b></i>' for k in range(len(NOTATIONS)))
    nums = "".join(f"<span>{k + 1:02d}</span>" for k in range(len(NOTATIONS)))
    marks = "".join(f'<i data-slug="{s}" title="{short}">{k + 1:02d}</i>' for k, (s, short, *_) in enumerate(NOTATIONS))
    for t, sub, url in (("Обложка: один процесс – семь чертежей", "полёт сквозь альбом из семи листов", "index.html"),
                        ("Обработка заказа в интернет-магазине", "общий пример для всех листов: клиент, менеджер, склад, доставка", "index.html#story"),
                        ("Альбом чертежей: семь листов", "карточки нотаций и зачётка", "index.html#sheets"),
                        ("Разработали", "Попов, Красношлыков, Казанцева, Феклисов – кто какой лист подготовил", "index.html#team")):
        INDEX.append(dict(k="страница", t=t, s=sub, u=url, n="Главная"))
    team_intro = "".join(f"<span>{n}<i>{r}</i></span>" for (n, _), r in zip(TEAM, ("BPMN · Flow Chart", "DFD · UML", "RAD · IDEF · источники", "ERD · пример · сравнение")))
    short_roles = ("BPMN · Flow Chart", "DFD · UML", "RAD · IDEF · источники", "ERD · пример · сравнение")
    people = "".join(f'<div class="titleblock__row"><small>Разраб.</small><b>{n}</b><span>{r}</span></div>'
                     for (n, _), r in zip(TEAM, short_roles))
    body = f"""
<section class="flight" aria-label="Обложка: полёт сквозь альбом из семи листов">
  <div class="flight__stage">
    <div class="flight__photo" aria-hidden="true"></div>
    <div class="flight__nums" aria-hidden="true">{nums}</div>
    <div class="flight__floor" aria-hidden="true"></div>
    <div class="flight__horizon" aria-hidden="true"></div>
    <div class="flight__world">{sheets_html}</div>
    <div class="flight__intro">
      <p class="kicker">Проектное задание · ФКТ КнАГУ · 2026</p>
      <h1>Один процесс –<br><em>семь чертежей</em></h1>
      <p class="flight__lead">Мини-wiki по методам моделирования бизнес-процессов: обработка заказа в интернет-магазине
      начерчена в семи нотациях. Прокрутите – и альбом пролетит перед вами лист за листом.</p>
      <div class="flight__cta"><a class="btn btn--accent" href="#fly" data-fly>Пролететь альбом ↓</a>
        <a class="btn" href="#story">Пропустить</a></div>
      <p class="flight__team"><small>Разработчики</small>{team_intro}</p>
    </div>
    <div class="flight__caps">{caps}</div>
    <svg class="flight__dims" aria-hidden="true"><path class="dims__lead"/><circle class="dims__dot" r="4"/>
      <path class="dims__dim"/><text class="dims__txt" text-anchor="middle"></text></svg>
    <div class="flight__meter" aria-hidden="true">{ticks}</div>
    <div class="flight__cross" aria-hidden="true"><i></i><i></i><b></b></div>
    <div class="flight__frame" aria-hidden="true"></div>
  </div>
  <span id="fly" class="flight__anchor"></span>
</section>

<section class="story" id="story" aria-label="Процесс обработки заказа">
  <div class="story__pin">
    <div class="story__text">
      <p class="kicker">Общий пример для всех листов</p>
      <h2>Обработка заказа<br>в интернет-магазине</h2>
      <ol class="story__steps">{steps}</ol>
      <p class="story__final">Этот процесс начерчен семь раз: каждая нотация показывает в нём своё – шаги, данные,
      роли, функции, структуру базы, программную систему или сквозной процесс целиком.</p>
    </div>
    <div class="story__stage">
      <svg class="route" viewBox="0 0 760 520" role="img" aria-label="Карта процесса обработки заказа: дорожки клиента, менеджера, склада и службы доставки"></svg>
      <p class="story__hint">прокрутите, чтобы провести заказ по процессу</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="band__in doc">
    <h2>Методы моделирования бизнес-процессов</h2>
    {intro_html}
  </div>
</section>

<section class="cards-sec" id="sheets">
  <div class="cards-sec__in">
    <p class="kicker">Альбом чертежей</p>
    <h2>Семь листов – семь вопросов к процессу</h2>
    <div class="cards">{cards}
      <a class="card card--sum" href="comparison.html" style="--i:7"><span class="card__no">Сводный лист</span>
        <span class="card__name">Сравнение</span><span class="card__full">Матрица возможностей и подбор нотации</span>
        <span class="card__q">«Какую нотацию выбрать под мой вопрос?»</span><span class="card__by">Феклисов Никита</span></a>
    </div>
    <div class="ledger" data-ledger>
      <div class="ledger__marks" aria-hidden="true">{marks}</div>
      <p class="ledger__txt"><b>Зачётка:</b> <span data-ledger-n>0</span> из 7 листов изучено<span data-ledger-best></span>.
        Дочитайте лист до конца – на нём появится печать «Изучено».</p>
      <div class="ledger__act"><a class="btn btn--accent" href="trainer.html">Пройти тренажёр</a>
        <button type="button" class="ledger__reset" data-ledger-reset hidden>очистить зачётку</button></div>
    </div>
  </div>
</section>

<section class="band band--paper">
  <div class="band__in doc">
    <h2>Как устроен каждый лист</h2>
    {layout_html}
    <p>Диаграммы – настоящие чертежи нотаций, а не иллюстрации. Щелчок по значку ⤢ или двойной щелчок открывает
    диаграмму во весь экран: колесо мыши масштабирует, перетаскивание сдвигает.</p>
  </div>
</section>

<section class="team" id="team">
  <div class="team__in">
    <p class="kicker">Основная надпись альбома</p>
    <h2>Разработали</h2>
    <div class="team__stamp">{team}
      <div class="stamp" aria-hidden="true"><svg viewBox="0 0 200 200">
        <defs><path id="stampRing" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0"/>
          <filter id="stampInk"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/>
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -.9 1.25"/><feComposite in="SourceGraphic" operator="in"/></filter></defs>
        <g filter="url(#stampInk)"><circle cx="100" cy="100" r="94"/><circle cx="100" cy="100" r="62"/>
          <text class="stamp__ring"><textPath href="#stampRing">БЮРО НОТАЦИЙ · ФКТ КнАГУ · 2026 ·</textPath></text>
          <text class="stamp__big" x="100" y="99" text-anchor="middle">7 листов</text>
          <text class="stamp__small" x="100" y="121" text-anchor="middle">1 процесс</text></g></svg></div>
      <div class="team__row team__row--org"><b>ФКТ ФГБОУ ВО «КнАГУ»</b><span>«Современные программные средства» · 2026</span></div>
    </div>
    <p class="team__links"><a class="btn" href="{TEAM_WIKI}">Командная wiki на MkDocs</a>
      <a class="btn" href="{REPO}">Исходный код на GitHub</a></p>
  </div>
</section>"""
    (OUT / "index.html").write_text(page("Один процесс – семь чертежей", body, 0, "home", scripts=("scrub", "home", "flight"),
                                         desc="Мини-wiki по методам моделирования бизнес-процессов: Flow Chart, DFD, "
                                              "RAD, IDEF, ERD, UML, BPMN – описание, элементы, правила, пример и "
                                              "источники на одном общем процессе"), encoding="utf-8")


def service_pages():
    """404, sitemap.xml, robots.txt."""
    body = f"""<section class="sheet-hero sheet-hero--plain"><div class="sheet-hero__in">
<p class="kicker">Ошибка 404 · лист не найден</p><h1>Такого листа в альбоме нет</h1>
<p class="sheet-hero__q">Возможно, ссылка устарела. Начните с обложки или выберите нотацию в меню.</p>
<p><a class="btn btn--accent" href="{SITE}">На главную</a></p></div></section>"""
    out = page("Страница не найдена", body, 0, "", scripts=())
    out = out.replace('data-root=""', f'data-root="{SITE}"').replace('src="assets/', f'src="{SITE}assets/')
    out = out.replace('href="assets/', f'href="{SITE}assets/').replace('href="notations/', f'href="{SITE}notations/')
    out = out.replace('href="trainer.html"', f'href="{SITE}trainer.html"')
    out = out.replace('href="comparison.html"', f'href="{SITE}comparison.html"').replace(
        'href="sources.html"', f'href="{SITE}sources.html"').replace('href="index.html"', f'href="{SITE}"')
    (OUT / "404.html").write_text(out, encoding="utf-8")
    urls = [""] + [f"notations/{n[0]}.html" for n in NOTATIONS] + ["comparison.html", "trainer.html", "sources.html"]
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{SITE}{u}</loc></url>\n" for u in urls) + "</urlset>\n", encoding="utf-8")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")


# ------------------------------------------------------------------ сборка
def main():
    OUT.mkdir(exist_ok=True)
    for x in OUT.iterdir():                     # папку не удаляем – её может держать локальный сервер
        shutil.rmtree(x) if x.is_dir() else x.unlink()
    (OUT / "notations").mkdir()
    shutil.copytree(ROOT / "assets", OUT / "assets")
    total = sum(notation_page(i, *n) for i, n in enumerate(NOTATIONS))
    comparison_page()
    sources_page()
    trainer_page()
    index_page()
    service_pages()
    (OUT / "assets" / "search.json").write_text(json.dumps(INDEX, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / ".nojekyll").write_text("")
    print(f"site/: {len(NOTATIONS)} листов нотаций, {total} диаграмм-листов, {len(INDEX)} записей в поиске")


if __name__ == "__main__":
    main()
