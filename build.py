"""Сборка сайта «Бюро нотаций»: content/*.md -> site/*.html.

Тексты нотаций совпадают с командной мини-wiki (bpm-modeling-wiki); здесь меняется только подача:
каждая диаграмма – лист чертежа, который прорисовывается синхронно с прокруткой (scroll-scrub).
Запуск: python build.py  ->  папка site/ (её публикует GitHub Actions).
"""
import html
import re
import shutil
from pathlib import Path

import markdown

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
OUT = ROOT / "site"
VER = "1"

NOTATIONS = [  # slug, короткое имя, полное имя, автор листа, вопрос
    ("flowchart", "Flow Chart", "Блок-схема", "Красношлыков Пётр", "Какие шаги и в каком порядке?"),
    ("dfd", "DFD", "Диаграмма потоков данных", "Красношлыков Пётр", "Откуда и куда движутся данные?"),
    ("rad", "RAD", "Диаграмма ролей и действий", "Казанцева Ярослава", "Кто что делает и как роли взаимодействуют?"),
    ("idef", "IDEF", "Семейство IDEF0 / IDEF3", "Казанцева Ярослава", "Что делает организация и чем это управляется?"),
    ("erd", "ERD", "Модель «сущность – связь»", "Феклисов Никита", "Какие данные хранить и как они связаны?"),
    ("uml", "UML", "Унифицированный язык моделирования", "Попов Андрей", "Как устроена и ведёт себя программная система?"),
    ("bpmn", "BPMN", "Нотация бизнес-процессов", "Попов Андрей", "Кто, что, в каком порядке и при каких событиях?"),
]
TEAM = [
    ("Попов Андрей", "BPMN, UML, сравнение и выбор нотации"),
    ("Красношлыков Пётр", "Flow Chart, DFD"),
    ("Казанцева Ярослава", "RAD, IDEF, список источников"),
    ("Феклисов Никита", "ERD, общий пример процесса «Обработка заказа»"),
]
TEAM_WIKI = "https://starpxand.github.io/bpm-modeling-wiki/"
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
  <div class="scrub__pin">
    <figure class="sheet" data-sheet>
      <div class="sheet__tools"><span class="sheet__progress" aria-hidden="true"><i></i></span>
        <button type="button" class="sheet__full" aria-label="Открыть во весь экран">⤢ во весь экран</button></div>
      <div class="sheet__draw">{inner}</div>
      <figcaption class="stamp">
        <span class="stamp__name">{html.escape(caption)}</span>
        <span class="stamp__cell"><small>Нотация</small>{html.escape(notation)}</span>
        <span class="stamp__cell"><small>Лист</small>{n_sheet}</span>
        <span class="stamp__cell stamp__cell--wide"><small>Разраб.</small>{html.escape(author)}</span>
        <span class="stamp__cell stamp__cell--org"><small>ФКТ КнАГУ</small>Бюро нотаций</span>
      </figcaption>
    </figure>
  </div>
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
    <a href="{pre}sources.html"{" aria-current=page" if active == "sources" else ""}>Источники</a></nav>
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
  </div>
</footer>"""


def page(title, body, depth=0, active="", desc="", scripts=("scrub",), mermaid=False, extra_head=""):
    pre = "../" * depth
    js = "".join(f'<script src="{pre}assets/js/{s}.js?v={VER}" defer></script>' for s in scripts)
    mm = (f'<script type="module" src="{pre}assets/js/mermaid-init.js?v={VER}"></script>' if mermaid else "")
    return f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · Бюро нотаций</title>
<meta name="description" content="{html.escape(desc or 'Мини-wiki по нотациям моделирования бизнес-процессов: Flow Chart, DFD, RAD, IDEF, ERD, UML, BPMN')}">
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
                    "Лист построен по файлу BPMN 2.0, созданному в редакторе bpmn-js [[5]](../sources.html#src-5), "
                    f"и прорисовывается по мере прокрутки; интерактивную модель с пошаговым проходом можно открыть "
                    f"в [командной мини-wiki]({TEAM_WIKI}notations/bpmn/).", md, flags=re.S)
    body = md_to_html(md)
    body, n = sheets(body, short, author)
    body = decorate(body)
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
    <nav class="toc" aria-label="Разделы листа">{toc}</nav>
  </div>
</section>"""
    article = f'<article class="doc">{body}</article>{pager}'
    out = page(title, hero + article, 1, slug, desc=f"{title}: описание, элементы нотации, правила составления, пример, источники",
               mermaid="mermaid" in body)
    (OUT / "notations" / f"{slug}.html").write_text(out, encoding="utf-8")
    return n


# ------------------------------------------------------------------ сравнение и источники
def comparison_page():
    md = fix_links((CONTENT / "comparison.md").read_text(encoding="utf-8"))
    md = re.sub(r"^# .+\n", "", md, count=1, flags=re.M)
    md = md.replace('href="../notations/', 'href="notations/').replace('/">Открыть', '.html">Открыть')
    body = md_to_html(md)
    body, _ = sheets(body, "Сравнение", "команда проекта")
    body = decorate(body)
    hero = """<section class="sheet-hero sheet-hero--plain"><div class="sheet-hero__in">
<p class="kicker">Сводный лист · итог</p><h1>Сравнение и выбор нотации</h1>
<p class="sheet-hero__q">Универсальной нотации нет – каждая отвечает на свой вопрос.</p></div></section>"""
    (OUT / "comparison.html").write_text(
        page("Сравнение и выбор нотации", hero + f'<article class="doc">{body}</article>', 0, "comparison",
             scripts=("scrub", "pick"), mermaid=True), encoding="utf-8")


def sources_page():
    md = (CONTENT / "sources.md").read_text(encoding="utf-8")
    md = re.sub(r"^# .+\n", "", md, count=1, flags=re.M)
    body = decorate(md_to_html(md))
    hero = """<section class="sheet-hero sheet-hero--plain"><div class="sheet-hero__in">
<p class="kicker">Спецификация к чертежам</p><h1>Источники</h1>
<p class="sheet-hero__q">21 источник: стандарты, книги, спецификации и справочные сайты.</p></div></section>"""
    (OUT / "sources.html").write_text(page("Источники", hero + f'<article class="doc doc--sources">{body}</article>',
                                           0, "sources", scripts=("scrub",)), encoding="utf-8")


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
<a class="card" href="notations/{s}.html" style="--i:{k}">
  <span class="card__no">Лист {k + 1:02d}</span>
  <span class="card__name">{short}</span>
  <span class="card__full">{full}</span>
  <span class="card__q">«{q}»</span>
  <span class="card__by">{a}</span>
</a>""" for k, (s, short, full, a, q) in enumerate(NOTATIONS))
    team = "".join(f'<div class="team__row"><b>{n}</b><span>{r}</span></div>' for n, r in TEAM)
    body = f"""
<section class="cover">
  <div class="cover__in">
    <p class="kicker">Проектное задание · «Современные программные средства» · ФКТ КнАГУ</p>
    <h1>Один процесс –<br><em>семь чертежей</em></h1>
    <p class="cover__lead">Мини-wiki по методам моделирования бизнес-процессов. Обработка заказа в интернет-магазине
    начерчена в семи нотациях – Flow Chart, DFD, RAD, IDEF, ERD, UML и BPMN, – и каждая диаграмма
    прорисовывается прямо при прокрутке страницы.</p>
    <div class="cover__cta"><a class="btn btn--accent" href="#story">Смотреть процесс ↓</a>
      <a class="btn" href="notations/flowchart.html">Открыть первый лист</a></div>
  </div>
  <div class="cover__stamp" aria-hidden="true">
    <span>Формат А1</span><span>Масштаб 1:1</span><span>Листов 07</span><span>2026</span>
  </div>
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
      <svg class="route" viewBox="0 0 640 640" role="img" aria-label="Маршрут заказа от клиента до доставки">
        <defs><pattern id="mm" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="currentColor" stroke-width=".4" opacity=".25"/></pattern></defs>
        <rect width="640" height="640" fill="url(#mm)"/>
        <path class="route__ghost" d="M90 90 H540 Q560 90 560 110 V230 Q560 250 540 250 H110 Q90 250 90 270 V390 Q90 410 110 410 H540 Q560 410 560 430 V550"/>
        <path class="route__line" id="routePath" d="M90 90 H540 Q560 90 560 110 V230 Q560 250 540 250 H110 Q90 250 90 270 V390 Q90 410 110 410 H540 Q560 410 560 430 V550"/>
        <g class="route__stations"></g>
        <g class="route__fan"></g>
        <g class="parcel"><rect x="-14" y="-12" width="28" height="24" rx="3"/><path d="M-14 -4H14M0 -12V12"/></g>
      </svg>
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
        <span class="card__q">«Какую нотацию выбрать под мой вопрос?»</span><span class="card__by">Попов Андрей</span></a>
    </div>
  </div>
</section>

<section class="band band--paper">
  <div class="band__in doc">
    <h2>Как устроен каждый лист</h2>
    {layout_html}
    <p>Диаграммы – настоящие чертежи нотаций, а не иллюстрации: при прокрутке лист закрепляется на экране, и
    линии, фигуры и подписи появляются в порядке чтения схемы. Кнопка «⤢ во весь экран» открывает готовый лист целиком.</p>
  </div>
</section>

<section class="team" id="team">
  <div class="team__in">
    <p class="kicker">Основная надпись альбома</p>
    <h2>Разработали</h2>
    <div class="team__stamp">{team}
      <div class="team__row team__row--org"><b>ФКТ ФГБОУ ВО «КнАГУ»</b><span>группа 5ИТб-2 · 2026 · все участники равноправны</span></div>
    </div>
    <p class="team__links"><a class="btn" href="{TEAM_WIKI}">Командная wiki на MkDocs</a>
      <a class="btn" href="{REPO}">Исходный код на GitHub</a></p>
  </div>
</section>"""
    (OUT / "index.html").write_text(page("Один процесс – семь чертежей", body, 0, "home", scripts=("scrub", "home")),
                                    encoding="utf-8")


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
    index_page()
    (OUT / ".nojekyll").write_text("")
    print(f"site/: {len(NOTATIONS)} листов нотаций, {total} диаграмм-листов")


if __name__ == "__main__":
    main()
