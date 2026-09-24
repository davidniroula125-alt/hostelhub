import { useCallback, useEffect, useRef, useState } from 'react';

export function useApiData(fetcher, deps = [], opts = {}) {
  const [data, setData] = useState(opts.initial || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    if (!fetcherRef.current) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current();
      if (mounted.current) setData(res);
    } catch (e) {
      if (mounted.current) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load');
        setData(null);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: load, setData };
}

export function useLocalState(initial) {
  return useRef(initial).current;
}
