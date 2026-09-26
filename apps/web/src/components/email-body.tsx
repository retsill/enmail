"use client";

import { useEffect, useRef, useState } from "react";

// El HTML de un correo es contenido no confiable: lo aislamos en un iframe
// sandboxed en vez de inyectarlo en el DOM de la app. `allow-same-origin` es
// necesario para poder medir su altura real y ajustarla (sin eso el navegador
// bloquea el acceso a contentDocument y el alto se queda fijo/cortado); NO
// incluimos `allow-scripts`, así que ningún <script> del correo se ejecuta.
export function EmailBody({ html, text }: { html?: string; text?: string }) {
  const [height, setHeight] = useState(300);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // El correo se renderiza siempre sobre fondo blanco, sin importar el tema
  // de la app: el HTML del correo asume fondo claro (como hace Gmail/Outlook/
  // Apple Mail), así que declaramos "light only" a propósito — con "light
  // dark" el navegador en modo oscuro pinta el fondo del iframe negro por su
  // cuenta mientras el texto del correo se queda con sus colores originales,
  // dando un resultado casi ilegible.
  const doc = html
    ? `<!doctype html><html><head><base target="_blank"><meta name="color-scheme" content="light only"><style>
    html,body{margin:0;padding:0;background:#ffffff}
    body{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f1f1f;word-break:break-word;overflow-wrap:anywhere;padding:2px}
    img{max-width:100%;height:auto}
    a{color:#1a73e8}
  </style></head><body>${html}</body></html>`
    : "";

  useEffect(() => {
    if (!html) return;

    const iframe = frameRef.current;
    if (!iframe) return;

    let observer: ResizeObserver | null = null;
    let cancelled = false;

    function measure() {
      try {
        const body = iframe?.contentDocument?.body;
        if (body && !cancelled) {
          setHeight(Math.max(body.scrollHeight, 80) + 16);
        }
      } catch {
        // el navegador puede bloquear el acceso en algún caso raro; se queda con el último alto medido
      }
    }

    function onLoad() {
      measure();
      const body = iframe?.contentDocument?.body;
      if (body && "ResizeObserver" in window) {
        observer = new ResizeObserver(() => measure());
        observer.observe(body);
      }
      // Las imágenes tardan en cargar tras el evento load del iframe.
      const images = body?.querySelectorAll("img") ?? [];
      images.forEach((img) => img.addEventListener("load", measure));
      setTimeout(measure, 300);
      setTimeout(measure, 1000);
    }

    iframe.addEventListener("load", onLoad);
    return () => {
      cancelled = true;
      iframe.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [html, doc]);

  if (!html) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed">{text}</div>;
  }

  return (
    <iframe
      ref={frameRef}
      srcDoc={doc}
      sandbox="allow-same-origin allow-popups"
      title="email-body"
      style={{ width: "100%", height, border: "none", display: "block" }}
    />
  );
}
