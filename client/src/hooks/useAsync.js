import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks {data, loading, error} for it.
 * `deps` behaves like a useEffect dependency list; `run()` re-fetches manually.
 */
export function useAsync(loader, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null });
  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await loaderRef.current(...args);
      if (mounted.current) setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      if (mounted.current) setState({ data: null, loading: false, error });
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!immediate) return;
    run().catch(() => {
      /* the error is already stored in state for the UI to render */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, run, setData: (data) => setState((prev) => ({ ...prev, data })) };
}

export default useAsync;
