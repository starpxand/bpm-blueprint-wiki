/* Mermaid-диаграммы (Flow Chart, ERD, UML, схема выбора) в чертёжном стиле; после отрисовки – событие для scrub.js */
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "strict",
  themeVariables: {
    fontFamily: "IBM Plex Sans, Segoe UI, Arial, sans-serif",
    fontSize: "15px",
    primaryColor: "#fffdf7",
    primaryBorderColor: "#142238",
    primaryTextColor: "#142238",
    secondaryColor: "#efeadd",
    tertiaryColor: "#ffffff",
    lineColor: "#142238",
    noteBkgColor: "#fff6e3",
    noteBorderColor: "#c8432b",
    actorBkg: "#fffdf7",
    actorBorder: "#142238",
    signalColor: "#142238",
    labelBoxBkgColor: "#efeadd",
  },
  flowchart: { curve: "basis", padding: 12 },
  er: { layoutDirection: "LR" },
});

await mermaid.run({ querySelector: "pre.mermaid" });
document.dispatchEvent(new Event("mermaid:rendered"));
