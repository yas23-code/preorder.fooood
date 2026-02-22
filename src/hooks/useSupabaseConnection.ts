import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/lib/retry';

interface ConnectionState {
  isConnected: boolean;
  isChecking: boolean;
  error: string | null;
  retryCount: number;
}

export function useSupabaseConnection() {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    isChecking: true,
    error: null,
    retryCount: 0,
  });

  const checkConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      await withRetry(
        async () => {
          // Simple health check - try to get session (doesn't require auth)
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt) => {
            setState(prev => ({ ...prev, retryCount: attempt }));
          },
        }
      );

      setState({
        isConnected: true,
        isChecking: false,
        error: null,
        retryCount: 0,
      });
    } catch (error) {
      setState({
        isConnected: false,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        retryCount: 0,
      });
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    ...state,
    retry: checkConnection,
  };
}
