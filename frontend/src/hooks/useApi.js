/**
 * useApi — Generic data-fetching hook with loading, error, and optional polling.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(() => analytics.kpis());
 *   const { data, loading } = useApi(() => network.alerts.list(), [], { pollingInterval: 30000 });
 *   const { execute } = useApi(() => crm.deals.create(payload), [], { immediate: false });
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(fetchFn, deps = [], options = {}) {
  const {
    immediate = true,
    pollingInterval = null,
  } = options;

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError]     = useState(null);
  const mountedRef            = useRef(true);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(...args);
      if (mountedRef.current) setData(result);
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message ?? 'An unexpected error occurred');
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;

    if (immediate) execute();

    let interval;
    if (pollingInterval && pollingInterval > 0) {
      interval = setInterval(() => execute(), pollingInterval);
    }

    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, [execute, immediate, pollingInterval]);

  const refetch = useCallback(() => execute(), [execute]);

  return { data, loading, error, refetch, setData, execute };
}

/**
 * useMutation — For non-GET operations (create, update, delete).
 * Does NOT fire automatically; call `mutate(payload)` to trigger.
 *
 * Usage:
 *   const { mutate, loading, error } = useMutation((data) => crm.leads.create(data));
 *   await mutate({ name: 'Alice', ... });
 */
export function useMutation(mutateFn, options = {}) {
  const { onSuccess, onError } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);
  const mountedRef            = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutateFn(...args);
      if (mountedRef.current) setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const message = err?.message ?? 'An unexpected error occurred';
      if (mountedRef.current) setError(message);
      onError?.(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mutateFn, onSuccess, onError]);

  return { mutate, loading, error, data };
}
