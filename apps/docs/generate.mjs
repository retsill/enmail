// Generador de la documentación estática (HTML + CSS puro, sin build en
// producción: esto solo se corre una vez para producir los .html que se
// suben al hosting de docs.xcodevs.com/enmail). Node sin dependencias.
//
// Uso: node generate.mjs
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const NAV = [
  {
    section: { es: "Empezar", en: "Getting started" },
    items: [{ slug: "index", es: "Introducción", en: "Introduction" }],
  },
  {
    section: { es: "Instalación", en: "Installation" },
    items: [
      { slug: "docker", es: "Con Docker (recomendado)", en: "With Docker (recommended)" },
      { slug: "manual", es: "Instalación manual", en: "Manual installation" },
    ],
  },
  {
    section: { es: "Hosting", en: "Hosting" },
    items: [
      { slug: "aapanel", es: "aaPanel", en: "aaPanel" },
      { slug: "cpanel", es: "cPanel", en: "cPanel" },
      { slug: "plesk", es: "Plesk", en: "Plesk" },
      { slug: "hostinger", es: "Hostinger / VPS", en: "Hostinger / VPS" },
    ],
  },
  {
    section: { es: "Referencia", en: "Reference" },
    items: [
      { slug: "configuration", es: "Variables de entorno", en: "Environment variables" },
      { slug: "faq", es: "Preguntas frecuentes", en: "FAQ" },
    ],
  },
];

const FLAT = NAV.flatMap((s) => s.items);

const STRINGS = {
  es: {
    tagline: "Documentación",
    gh: "GitHub",
    prevLabel: "Anterior",
    nextLabel: "Siguiente",
    footer: "Worked: XcoDevs, by: Enwebs Estudios — Licencia MIT",
  },
  en: {
    tagline: "Documentation",
    gh: "GitHub",
    prevLabel: "Previous",
    nextLabel: "Next",
    footer: "Worked: XcoDevs, by: Enwebs Estudios — MIT License",
  },
};

function otherLang(lang) {
  return lang === "es" ? "en" : "es";
}

function renderSidebar(lang, currentSlug) {
  return NAV.map(
    (group) => `
      <h4>${group.section[lang]}</h4>
      <nav>
        ${group.items
          .map(
            (item) =>
              `<a href="${item.slug}.html" class="${item.slug === currentSlug ? "active" : ""}">${item[lang]}</a>`,
          )
          .join("\n")}
      </nav>`,
  ).join("\n");
}

function renderPageNav(lang, slug) {
  const idx = FLAT.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? FLAT[idx - 1] : null;
  const next = idx < FLAT.length - 1 ? FLAT[idx + 1] : null;
  const t = STRINGS[lang];
  return `<div class="page-nav">
    ${prev ? `<a href="${prev.slug}.html"><span class="dir">← ${t.prevLabel}</span>${prev[lang]}</a>` : "<span></span>"}
    ${next ? `<a href="${next.slug}.html" class="next"><span class="dir">${t.nextLabel} →</span>${next[lang]}</a>` : "<span></span>"}
  </div>`;
}

function layout({ lang, slug, title, description, body }) {
  const t = STRINGS[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — enMail Docs</title>
<meta name="description" content="${description}" />
<link rel="stylesheet" href="../assets/style.css" />
</head>
<body>
<header class="top-bar">
  <button class="menu-toggle" id="menuToggle" aria-label="Menu">☰</button>
  <a href="index.html" class="brand"><img src="../assets/imgs/enmail-logo.png" alt="enMail" class="brand-logo" /></a>
  <div class="top-actions">
    <div class="lang-switch">
      <a href="../es/${slug}.html" class="${lang === "es" ? "active" : ""}">ES</a>
      <a href="../en/${slug}.html" class="${lang === "en" ? "active" : ""}">EN</a>
    </div>
    <a class="gh-link" href="https://github.com/retsill/enmail" target="_blank" rel="noopener">${t.gh}</a>
  </div>
</header>
<div class="layout">
  <aside class="sidebar" id="sidebar">${renderSidebar(lang, slug)}</aside>
  <main class="content">
    ${body}
    ${renderPageNav(lang, slug)}
  </main>
</div>
<footer class="site-footer">${t.footer}</footer>
<script>
  var toggle = document.getElementById("menuToggle");
  var sidebar = document.getElementById("sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", function () { sidebar.classList.toggle("open"); });
    sidebar.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { sidebar.classList.remove("open"); });
    });
  }
</script>
</body>
</html>
`;
}

async function build() {
  const { PAGES } = await import("./content.mjs");
  for (const lang of ["es", "en"]) {
    const outDir = join(__dirname, lang);
    mkdirSync(outDir, { recursive: true });
    for (const page of PAGES) {
      const html = layout({
        lang,
        slug: page.slug,
        title: page.title[lang],
        description: page.description[lang],
        body: page.body[lang],
      });
      writeFileSync(join(outDir, `${page.slug}.html`), html, "utf8");
    }
  }
  console.log(`Generadas ${(await import("./content.mjs")).PAGES.length * 2} páginas en apps/docs/{es,en}/`);
}

build();
