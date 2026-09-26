"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface InboxSearchValue {
  search: string;
  setSearch: (value: string) => void;
}

const InboxSearchContext = createContext<InboxSearchValue | null>(null);

export function InboxSearchProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const value = useMemo(() => ({ search, setSearch }), [search]);
  return <InboxSearchContext.Provider value={value}>{children}</InboxSearchContext.Provider>;
}

export function useInboxSearch() {
  const ctx = useContext(InboxSearchContext);
  if (!ctx) throw new Error("useInboxSearch debe usarse dentro de InboxSearchProvider");
  return ctx;
}
