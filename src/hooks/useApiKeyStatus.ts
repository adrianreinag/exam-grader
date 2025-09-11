"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { checkApiKeyStatus, ApiKeyStatus } from '@/infrastructure/api/user-settings';
import { useSearchParams } from 'next/navigation';

export function useApiKeyStatus() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    if (!user || authLoading || isDemo) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await checkApiKeyStatus();
      setStatus(result);
    } catch (err) {
      console.error('Error checking API key status:', err);
      setError('Error al verificar el estado de la clave API');
      // In case of error, assume user needs to set up API key
      setStatus({ hasValidApiKey: false, requiresApiKey: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isDemo]);

  const refreshStatus = () => {
    checkStatus();
  };

  return {
    status,
    loading,
    error,
    refreshStatus,
    needsApiKey: !isDemo && status && !status.hasValidApiKey,
    isDemo,
  };
}