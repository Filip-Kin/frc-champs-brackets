import { useCallback, useEffect, useState } from "react";

export type Page = "brackets" | "awards";

function readPage(): Page {
  if (typeof window === "undefined") return "brackets";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash === "awards" ? "awards" : "brackets";
}

export interface HashRouteApi {
  page: Page;
  setPage: (p: Page) => void;
}

export function useHashRoute(): HashRouteApi {
  const [page, setPageState] = useState<Page>(() => readPage());

  useEffect(() => {
    const onChange = (): void => setPageState(readPage());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const setPage = useCallback((p: Page): void => {
    if (p === "brackets") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } else {
      window.location.hash = `/${p}`;
    }
    setPageState(p);
  }, []);

  return { page, setPage };
}
