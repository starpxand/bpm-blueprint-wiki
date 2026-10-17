"""Пиктограммы элементов нотаций для таблиц «Элементы нотации» (docs/assets/sym/*.svg).

Каждый символ – маленький SVG в едином стиле: тёмный контур 1.6 px на белом, без подписей,
кроме тех, что входят в само обозначение (A1, D1, &, X, PK…). Запуск: python tools/build_symbols.py (из корня bpm-blueprint-wiki)
"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "assets" / "sym"
INK, FILL, ACC = "#142238", "#ffffff", "#2f5be8"
W, H = 84, 48
S = f'fill="{FILL}" stroke="{INK}" stroke-width="1.6"'
L = f'fill="none" stroke="{INK}" stroke-width="1.6"'
T = f'font-family="Arial, sans-serif" fill="{INK}" text-anchor="middle"'
ARROW = (f'<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" '
         f'orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{INK}"/></marker></defs>')


def tri(cx, cy, r, up=True):
    k = -1 if up else 1
    return f'<path d="M{cx - r} {cy - k * r * .6} L{cx + r} {cy - k * r * .6} L{cx} {cy + k * r * .9} Z" {S}/>'


SYM = {
    # ---------------- Flow Chart (ГОСТ 19.701)
    "fc-terminator": f'<rect x="10" y="12" width="64" height="24" rx="12" {S}/>',
    "fc-process": f'<rect x="12" y="10" width="60" height="28" {S}/>',
    "fc-decision": f'<path d="M42 6 L72 24 L42 42 L12 24 Z" {S}/>',
    "fc-data": f'<path d="M22 10 H74 L62 38 H10 Z" {S}/>',
    "fc-predefined": f'<rect x="12" y="10" width="60" height="28" {S}/><path d="M20 10V38M64 10V38" {L}/>',
    "fc-document": f'<path d="M12 8 H72 V34 C58 26 46 44 30 36 C22 32 16 34 12 36 Z" {S}/>',
    "fc-connector": f'<circle cx="42" cy="24" r="12" {S}/><text x="42" y="28.5" font-size="12" {T}>1</text>',
    "fc-flow": f'{ARROW}<path d="M10 16 H54 V34 H74" {L} marker-end="url(#a)"/>',
    # ---------------- DFD: Йордон – Демарко / Гейн – Сарсон
    "dfd-yd-entity": f'<rect x="14" y="10" width="56" height="28" {S}/>',
    "dfd-gs-entity": f'<rect x="18" y="12" width="56" height="28" fill="{INK}" opacity=".25"/><rect x="12" y="8" width="56" height="28" {S}/>',
    "dfd-yd-process": f'<circle cx="42" cy="24" r="18" {S}/>',
    "dfd-gs-process": f'<rect x="16" y="4" width="52" height="40" rx="7" {S}/><path d="M16 15 H68" {L}/><text x="42" y="13" font-size="9" {T}>1</text>',
    "dfd-yd-store": f'<path d="M12 14 H72 M12 34 H72" {L}/>',
    "dfd-gs-store": f'<path d="M72 12 H10 V36 H72" {S}/><path d="M24 12 V36" {L}/><text x="17" y="27.5" font-size="9" {T}>D1</text>',
    "dfd-flow": f'{ARROW}<path d="M10 30 H74" {L} marker-end="url(#a)"/><text x="42" y="22" font-size="10" {T}>Заказ</text>',
    # ---------------- RAD
    "rad-role": f'<rect x="10" y="4" width="64" height="40" rx="8" {S}/><text x="42" y="15" font-size="9" font-weight="bold" {T}>Роль</text><path d="M42 20 V40" {L}/>',
    "rad-thread": f'<path d="M42 6 V42" {L}/>',
    "rad-activity": f'<path d="M42 4 V44" {L}/><rect x="35" y="17" width="14" height="14" fill="{INK}"/>',
    "rad-interaction": f'<path d="M22 4 V44 M62 4 V44 M29 24 H55" {L}/><rect x="15" y="17" width="14" height="14" {S}/><rect x="55" y="17" width="14" height="14" {S}/>',
    "rad-case": f'<path d="M42 4 V12 M26 12 H58 M26 12 V20 M58 12 V20 M26 32 V44 M58 32 V44" {L}/>{tri(26, 26, 7, False)}{tri(58, 26, 7, False)}',
    "rad-part": f'<path d="M42 4 V12 M26 12 H58 M26 12 V18 M58 12 V18 M26 30 V44 M58 30 V44" {L}/>{tri(26, 25, 7)}{tri(58, 25, 7)}',
    "rad-start": f'<path d="M42 4 V44" {L}/><rect x="35" y="17" width="14" height="14" {S}/><path d="M35 17 L49 31 M49 17 L35 31" {L}/>',
    "rad-event": f'{ARROW}<path d="M52 4 V44" {L}/><path d="M14 24 H50" {L} marker-end="url(#a)"/>',
    # ---------------- IDEF0
    "idef0-block": f'<rect x="16" y="8" width="52" height="32" {S}/><text x="60" y="36" font-size="8" {T}>A1</text>',
    "idef0-input": f'{ARROW}<rect x="44" y="10" width="32" height="28" {S}/><path d="M6 24 H43" stroke="{INK}" stroke-width="1.6" marker-end="url(#a)"/>',
    "idef0-control": f'{ARROW}<rect x="26" y="22" width="32" height="22" {S}/><path d="M42 2 V21" stroke="#2f5be8" stroke-width="1.6" marker-end="url(#a)"/>',
    "idef0-output": f'{ARROW}<rect x="8" y="10" width="32" height="28" {S}/><path d="M40 24 H78" stroke="{INK}" stroke-width="1.6" marker-end="url(#a)"/>',
    "idef0-mechanism": f'{ARROW}<rect x="26" y="4" width="32" height="22" {S}/><path d="M42 46 V27" stroke="#d9772b" stroke-width="1.6" marker-end="url(#a)"/>',
    "idef0-context": f'<rect x="20" y="8" width="44" height="28" {S}/><text x="42" y="46" font-size="9" {T}>A-0</text><path d="M4 22 H20 M64 22 H80 M42 0 V8" {L}/>',
    "idef0-frame": f'<rect x="4" y="2" width="76" height="44" {L}/><path d="M4 36 H80 M22 36 V46 M62 36 V46" {L}/>',
    # ---------------- IDEF3
    "idef3-uob": f'<rect x="12" y="8" width="60" height="32" {S}/><path d="M12 30 H32 V40" {L}/><text x="22" y="38" font-size="8" {T}>1</text>',
    "idef3-link": f'{ARROW}<path d="M8 24 H76" stroke="{INK}" stroke-width="1.8" marker-end="url(#a)"/>',
    "idef3-and": f'<rect x="32" y="6" width="20" height="36" {S}/><path d="M38 6 V42" {L}/><text x="46" y="28.5" font-size="12" font-weight="bold" {T}>&amp;</text>',
    "idef3-xor": f'<rect x="32" y="6" width="20" height="36" {S}/><path d="M38 6 V42" {L}/><text x="46" y="28.5" font-size="12" font-weight="bold" {T}>X</text>',
    "idef3-or": f'<rect x="32" y="6" width="20" height="36" {S}/><path d="M38 6 V42" {L}/><text x="46" y="28.5" font-size="12" font-weight="bold" {T}>O</text>',
    "idef3-ref": f'<rect x="14" y="10" width="56" height="28" {S} stroke-dasharray="4 3"/><text x="42" y="22" font-size="8" {T}>OBJECT/</text><text x="42" y="32" font-size="8" {T}>Счёт</text>',
    # ---------------- ERD: Чен / «воронья лапка»
    "erd-chen-entity": f'<rect x="14" y="12" width="56" height="24" {S}/><text x="42" y="28" font-size="9" {T}>Клиент</text>',
    "erd-cf-entity": f'<rect x="16" y="4" width="52" height="40" {S}/><path d="M16 15 H68 M16 25 H68 M16 35 H68" stroke="{INK}" stroke-width=".9"/><text x="42" y="12.5" font-size="8" font-weight="bold" {T}>Заказ</text>',
    "erd-chen-attr": f'<ellipse cx="42" cy="24" rx="28" ry="13" {S}/><text x="42" y="27.5" font-size="9" {T}>дата</text>',
    "erd-cf-attr": f'<rect x="16" y="14" width="52" height="20" {S}/><text x="20" y="27.5" font-size="9" font-family="Arial" fill="{INK}">date дата</text>',
    "erd-chen-pk": f'<ellipse cx="42" cy="24" rx="28" ry="13" {S}/><text x="42" y="27.5" font-size="10" text-decoration="underline" {T}>id</text>',
    "erd-cf-pk": f'<rect x="16" y="14" width="52" height="20" {S}/><text x="22" y="27.5" font-size="9" font-weight="bold" font-family="Arial" fill="{INK}">PK</text><text x="40" y="27.5" font-size="9" font-family="Arial" fill="{INK}">id</text>',
    "erd-cf-fk": f'<rect x="16" y="14" width="52" height="20" {S}/><text x="20" y="27.5" font-size="9" font-weight="bold" font-family="Arial" fill="{INK}">FK</text><text x="38" y="27.5" font-size="8" font-family="Arial" fill="{INK}">order_id</text>',
    "erd-chen-rel": f'<path d="M42 8 L70 24 L42 40 L14 24 Z" {S}/><text x="42" y="27.5" font-size="8" {T}>делает</text>',
    "erd-cf-rel": f'<path d="M6 30 H78" {L}/><text x="42" y="22" font-size="9" {T}>оформляет</text>',
    "erd-chen-card": f'<path d="M6 24 H78" {L}/><text x="16" y="18" font-size="11" {T}>1</text><text x="68" y="18" font-size="11" {T}>N</text>',
    "erd-cf-card": f'<path d="M6 24 H78 M16 16 V32 M21 16 V32 M78 14 L66 24 L78 34 M60 16 V32" {L}/><circle cx="56" cy="24" r="0" fill="none"/>',
    # ---------------- UML (деятельность)
    "uml-initial": f'<circle cx="42" cy="24" r="10" fill="{INK}"/>',
    "uml-final": f'<circle cx="42" cy="24" r="12" {S}/><circle cx="42" cy="24" r="7" fill="{INK}"/>',
    "uml-action": f'<rect x="12" y="10" width="60" height="28" rx="12" {S}/>',
    "uml-decision": f'<path d="M42 8 L58 24 L42 40 L26 24 Z" {S}/><path d="M6 24 H26 M58 24 H78" {L}/><text x="68" y="18" font-size="7" {T}>[да]</text>',
    "uml-fork": f'<rect x="10" y="20" width="64" height="7" fill="{INK}"/><path d="M42 4 V20 M22 27 V44 M62 27 V44" {L}/>',
    "uml-lane": f'<rect x="8" y="4" width="68" height="40" {L}/><path d="M42 4 V44 M8 14 H76" {L}/>',
    "uml-object": f'<rect x="16" y="12" width="52" height="24" {S}/><text x="42" y="28" font-size="9" text-decoration="underline" {T}>Заказ</text>',
    # ---------------- BPMN (по категориям, шире)
    "bpmn-events": (f'<circle cx="16" cy="24" r="11" {S}/><circle cx="46" cy="24" r="11" {S}/><circle cx="46" cy="24" r="8" {L}/>'
                    f'<circle cx="76" cy="24" r="11" fill="{FILL}" stroke="{INK}" stroke-width="3.4"/>'
                    f'<circle cx="46" cy="24" r="5" {L}/><path d="M46 20 V24 L49 26" {L}/>'),
    "bpmn-activities": (f'<rect x="4" y="10" width="44" height="28" rx="6" {S}/><circle cx="12" cy="17" r="3" {L}/><path d="M7 23 Q12 19 17 23" {L}/>'
                        f'<rect x="54" y="10" width="44" height="28" rx="6" {S}/><rect x="71" y="30" width="10" height="8" {L}/><path d="M76 31 V37 M73 34 H79" {L}/>'),
    "bpmn-gateways": (f'<path d="M18 8 L34 24 L18 40 L2 24 Z" {S}/><path d="M13 19 L23 29 M23 19 L13 29" stroke="{INK}" stroke-width="2.4"/>'
                      f'<path d="M50 8 L66 24 L50 40 L34 24 Z" {S}/><path d="M50 17 V31 M43 24 H57" stroke="{INK}" stroke-width="2.4"/>'
                      f'<path d="M82 8 L98 24 L82 40 L66 24 Z" {S}/><circle cx="82" cy="24" r="6" fill="none" stroke="{INK}" stroke-width="2.2"/>'),
    "bpmn-flows": (f'{ARROW}<path d="M4 10 H92" {L} marker-end="url(#a)"/>'
                   f'<circle cx="7" cy="24" r="3" {S}/><path d="M10 24 H92" {L} stroke-dasharray="6 4" marker-end="url(#a)"/>'
                   f'<path d="M4 38 H96" fill="none" stroke="{INK}" stroke-width="1.4" stroke-dasharray="2 3"/>'),
    "bpmn-pools": f'<rect x="4" y="4" width="94" height="40" {L}/><path d="M16 4 V44 M16 24 H98" {L}/>',
    "bpmn-data": (f'<path d="M20 6 H36 L44 14 V42 H20 Z" {S}/><path d="M36 6 V14 H44" {L}/>'
                  f'<path d="M62 12 V38 C62 44 90 44 90 38 V12" {S}/><ellipse cx="76" cy="12" rx="14" ry="5" {S}/>'),
}
WIDE = {k for k in SYM if k.startswith("bpmn-")}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, body in SYM.items():
        w = 102 if name in WIDE else W
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {H}" width="{w}" height="{H}" '
               f'role="img">{body}</svg>\n')
        (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")
    print(len(SYM), "символов ->", OUT)


if __name__ == "__main__":
    main()
