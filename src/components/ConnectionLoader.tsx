import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionLoaderProps {
  isChecking: boolean;
  error: string | null;
  retryCount: number;
  onRetry: () => void;
}

export function ConnectionLoader({ 
  isChecking, 
  error, 
  retryCount, 
  onRetry 
}: ConnectionLoaderProps) {
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connection Problem</h2>
          <p className="text-muted-foreground mb-6">
            We're having trouble connecting to the server. Please check your internet connection and try again.
          </p>
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
        <h2 className="text-lg font-medium mb-2">Connecting to server...</h2>
        {retryCount > 0 && (
          <p className="text-sm text-muted-foreground">
            Retry attempt {retryCount} of 3...
          </p>
        )}
      </div>
    </div>
  );
}
