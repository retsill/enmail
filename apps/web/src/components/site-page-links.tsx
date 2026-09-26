"use client";

import { useEffect, useState } from "react";
import { api, type SitePage } from "@/lib/api";
import { PageContentModal } from "@/components/page-content-modal";

// Links a páginas armadas desde Ajustes (Términos, Privacidad, etc.) — se
// usa tanto en el footer del correo como en el login, así que el listado y
// el modal que muestra el contenido viven en un solo lugar.
export function SitePageLinks({ className }: { className?: string }) {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [openPage, setOpenPage] = useState<SitePage | null>(null);

  useEffect(() => {
    api.settings
      .listPages()
      .then(setPages)
      .catch(() => setPages([]));
  }, []);

  if (pages.length === 0) return null;

  return (
    <>
      <div className={className}>
        {pages.map((page, i) => (
          <span key={page.id} className="flex items-center gap-2">
            {i > 0 ? <span>·</span> : null}
            <button type="button" onClick={() => setOpenPage(page)} className="hover:text-accent hover:underline">
              {page.title}
            </button>
          </span>
        ))}
      </div>
      {openPage ? <PageContentModal page={openPage} onClose={() => setOpenPage(null)} /> : null}
    </>
  );
}
