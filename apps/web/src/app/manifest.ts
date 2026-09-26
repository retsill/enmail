import type { MetadataRoute } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

function inferImageType(url: string): string | undefined {
  const ext = url.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "svg":
      return "image/svg+xml";
    case "ico":
      return "image/x-icon";
    case "webp":
      return "image/webp";
    default:
      return undefined;
  }
}

// El ícono de la PWA es el favicon que se sube desde Ajustes > Marca — se
// pide al backend en cada solicitud del manifest (sin cache) para que, si
// el admin lo cambia, la próxima instalación/actualización ya lo use.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let siteName = "Webmail";
  let iconUrl: string | null = null;
  try {
    const res = await fetch(`${API_URL}/settings/system`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      siteName = data.siteName || siteName;
      iconUrl = data.faviconUrl || null;
    }
  } catch {
    // Backend no disponible al generar el manifest: se usan los valores por defecto.
  }

  // Sin favicon propio subido todavía: usa el default embebido en vez del
  // logo de Next.js.
  const iconSrc = iconUrl ? (iconUrl.startsWith("http") ? iconUrl : `${API_ORIGIN}${iconUrl}`) : "/favicon.png";

  return {
    name: siteName,
    short_name: siteName,
    description: "Cliente de correo web propio",
    start_url: "/inbox",
    display: "standalone",
    background_color: "#f6f8fc",
    theme_color: "#1a73e8",
    // Chrome (y la mayoría de navegadores) solo consideran instalable la PWA
    // si hay al menos un ícono declarado en 192x192 y otro en 512x512 — con
    // sizes:"any" (pensado para SVG vectorial) de hecho lo ignoran y usan un
    // ícono genérico en su lugar, que era justo el síntoma reportado. Como
    // el favicon lo sube el admin en cualquier resolución, se declara con
    // ambos tamaños igual: el navegador lo escala para que quede instalable.
    icons: [
      { src: iconSrc, sizes: "192x192", type: inferImageType(iconSrc) },
      { src: iconSrc, sizes: "512x512", type: inferImageType(iconSrc) },
    ],
  };
}
