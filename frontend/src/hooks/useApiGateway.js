import { useState, useCallback } from 'react';

/**
 * Custom hook to simulate the API Gateway logic.
 * Handles base routing and authentication headers.
 */
export const useApiGateway = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simulated Shared Service Auth Token
  const authToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

  const request = useCallback(async (servicePath, options = {}) => {
    setLoading(true);
    setError(null);
  
    
    try {
      // Logic mirrors the "Routing" responsibility of your Gateway
      const response = await fetch(https://api.yourplatform.com/${servicePath}, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': authToken,
          'Content-Type': 'application/json',
          'X-Gateway-Route': servicePath.split('/')[0] // Routing hint
        },
      });

      if (!response.ok) throw new Error('Gateway Error: Service Unavailable');
      return await response.json();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
};