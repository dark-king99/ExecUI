/**
 * useApi — Generic data-fetching hook with loading, error, optional polling,
 * a shared query cache, and app-wide synchronization.
 *
 * Synchronization model:
 *  - Every successful useMutation broadcasts an invalidation signal; every
 *    mounted useApi query refetches in response, so related views stay
 *    consistent the moment data changes — anywhere in the app.
 *  - Queries also refetch when the window regains focus.
 *  - Passing a `cacheKey` shares the last result across components (and renders
 *    instantly from cache on remount, then refreshes in the background).
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(() => analytics.kpis());
 *   const { data } = useApi(() => network.alerts.list(), [], { pollingInterval: 30000 });
 *   const { data } = useApi(() => account.profile.get(), [], { cacheKey: "account:profile" });
 *   const { execute } = useApi(() => crm.deals.create(payload), [], { immediate: false });
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Shared query cache + invalidation bus ──────────────────────────────────
const queryCache = new Map();            // cacheKey -> last result
const invalidationListeners = new Set(); // Set<() => void>

/** Notify every mounted query to refresh (called after any mutation). */
export function invalidateQueries() {
  for (const fn of Array.from(invalidationListeners)) {
    try { fn(); } catch { /* ignore individual listener errors */ }
  }
  // Also surface a DOM event so non-hook code (e.g. the Services app) can react.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('data:invalidated'));
  }
}

export function useApi(fetchFn, deps = [], options = {}) {
  const {
    immediate = true,
    pollingInterval = null,
    cacheKey = null,
    refetchOnFocus = true,
    syncOnInvalidate = true,
  } = options;

  const cached = cacheKey ? queryCache.get(cacheKey) : undefined;
  const [data, setData]       = useState(cached ?? null);
  const [loading, setLoading] = useState(immediate && cached === undefined);
  const [error, setError]     = useState(null);
  const mountedRef            = useRef(true);
  const inFlightRef           = useRef(false);
  const lastRunRef            = useRef(0);

  const execute = useCallback(async (...args) => {
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(...args);
      if (mountedRef.current) setData(result);
      if (cacheKey) queryCache.set(cacheKey, result);
      lastRunRef.current = Date.now();
      return result;
    } catch (err) {
      if (mountedRef.current) setError(err?.message ?? 'An unexpected error occurred');
      throw err;
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Background refresh: skip if a request is already in flight or just ran.
  const refresh = useCallback(() => {
    if (inFlightRef.current) return;
    if (Date.now() - lastRunRef.current < 400) return;
    execute().catch(() => {});
  }, [execute]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) execute().catch(() => {});

    let interval;
    if (pollingInterval && pollingInterval > 0) {
      interval = setInterval(() => execute().catch(() => {}), pollingInterval);
    }

    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, [execute, immediate, pollingInterval]);

  // Cross-page synchronization: invalidation bus + window focus.
  useEffect(() => {
    if (!immediate) return undefined;
    const onInvalidate = () => { if (syncOnInvalidate) refresh(); };
    const onFocus = () => { if (refetchOnFocus) refresh(); };
    invalidationListeners.add(onInvalidate);
    if (refetchOnFocus) window.addEventListener('focus', onFocus);
    return () => {
      invalidationListeners.delete(onInvalidate);
      window.removeEventListener('focus', onFocus);
    };
  }, [immediate, refresh, refetchOnFocus, syncOnInvalidate]);

  const refetch = useCallback(() => execute(), [execute]);

  return { data, loading, error, refetch, setData, execute };
}

/**
 * useMutation — For non-GET operations (create, update, delete).
 * On success it broadcasts an invalidation so every related query refreshes.
 * Pass { invalidate: false } to opt out.
 */
/**
 * useDataSync — for components that fetch with raw `fetch` (e.g. the Services
 * app) instead of useApi. Re-runs `reload` when the window regains focus and
 * when any mutation broadcasts an invalidation, keeping them in sync too.
 */
export function useDataSync(reload, { onFocus = true } = {}) {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => {
    const handler = () => { try { ref.current?.(); } catch { /* ignore */ } };
    window.addEventListener('data:invalidated', handler);
    if (onFocus) window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('data:invalidated', handler);
      window.removeEventListener('focus', handler);
    };
  }, [onFocus]);
}

export function useMutation(mutateFn, options = {}) {
  const { onSuccess, onError, invalidate = true } = options;

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
      if (invalidate) invalidateQueries();
      return result;
    } catch (err) {
      const message = err?.message ?? 'An unexpected error occurred';
      if (mountedRef.current) setError(message);
      onError?.(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mutateFn, onSuccess, onError, invalidate]);

  return { mutate, loading, error, data };
}
