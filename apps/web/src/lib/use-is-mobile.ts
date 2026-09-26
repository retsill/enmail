"use client";

import { useEffect, useState } from "react";

// Por debajo de esto, forzamos comportamiento de "una sola columna a la vez"
// (lista O lectura, como Gmail en el celular) sin importar la preferencia de
// columnas que el usuario haya guardado para desktop — 2/3/4 columnas lado a
// lado no entran en un teléfono.
const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
