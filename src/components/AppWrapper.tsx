import { ReactNode } from 'react';
import { useSupabaseConnection } from '@/hooks/useSupabaseConnection';
import { ConnectionLoader } from '@/components/ConnectionLoader';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AppWrapperProps {
  children: ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  const { isConnected, isChecking, error, retryCount, retry } = useSupabaseConnection();

  // Show connection loader during initial connection check
  if (isChecking || (!isConnected && !error)) {
    return (
      <ConnectionLoader
        isChecking={isChecking}
        error={null}
        retryCount={retryCount}
        onRetry={retry}
      />
    );
  }

  // Show connection error with retry option
  if (error && !isConnected) {
    return (
      <ConnectionLoader
        isChecking={false}
        error={error}
        retryCount={retryCount}
        onRetry={retry}
      />
    );
  }

  // Wrap the app in error boundary for runtime errors
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
