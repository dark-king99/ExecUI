/**
 * useApiGateway — Low-level gateway hook for arbitrary API requests.
 * Reads base URL and auth token from environment / localStorage.
 * Prefer the typed service helpers in src/services/api.js for new code.
 */
import { useState, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const useApiGateway = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const request = useCallback(async (servicePath, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      let token = null;
      try {
        const stored = localStorage.getItem('user');
        if (stored) token = JSON.parse(stored)?.token ?? null;
      } catch { /* ignore */ }

      const response = await fetch(`${BASE_URL}/${servicePath}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Gateway-Route': servicePath.split('/')[0],
          ...options.headers,
        },
      });

      if (!response.ok) {
        let message = `Gateway Error: ${response.status}`;
        try {
          const body = await response.json();
          message = body?.message ?? message;
        } catch { /* ignore */ }
        throw new Error(message);
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
};
