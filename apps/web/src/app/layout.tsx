import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Webmail",
  description: "Cliente de correo web propio",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a73e8",
};

// Se ejecuta antes del primer pintado (script normal en <head>, no un
// componente) para poner data-theme de una — si esto se dejara solo en el
// useEffect de ThemeProvider, cada carga completa (login tras cerrar
// sesión, F5, etc.) mostraría un parpadeo del tema por defecto antes de
// corregirse, y en una página que casi siempre se ve recién cargada (como
// el login) ese parpadeo se percibe como "el tema no se aplica".
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('webmail_theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // El script de abajo escribe data-theme antes de que React hidrate —
      // el HTML del server nunca trae ese atributo, así que sin esto React
      // marcaba error de hidratación aunque todo funcione bien (el atributo
      // lo pone algo fuera de React a propósito, no es un bug de verdad).
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
