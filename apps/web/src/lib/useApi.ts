"use client";

import { useEffect, useState } from "react";

export function useApi<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [load]);

  return { data, failed, setData };
}
