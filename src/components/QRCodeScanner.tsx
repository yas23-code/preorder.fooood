import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (qrToken: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  title?: string;
}

type ScanState = 'scanning' | 'processing' | 'success' | 'error';

export function QRCodeScanner({ 
  isOpen, 
  onClose, 
  onScan,
  title = 'Scan QR Code'
}: QRCodeScannerProps) {
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.log('Scanner stop error (non-critical):', err);
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || !isOpen) return;

    setCameraError('');
    
    try {
      // Clear any existing scanner and cleanup container
      await stopScanner();
      
      const container = document.getElementById('qr-reader');
      if (container) {
        container.innerHTML = '';
      }

      // Create new scanner instance
      scannerRef.current = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const onScanSuccess = async (decodedText: string) => {
        // Prevent multiple scans while processing
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        
        setScanState('processing');
        
        try {
          // Stop scanner while processing
          await stopScanner();
          
          // Call the scan handler
          const result = await onScan(decodedText);
          
          if (result.success) {
            setScanState('success');
            setSuccessMessage(result.message || 'Order completed successfully!');
            // Auto-close after success
            setTimeout(() => {
              onClose();
            }, 2000);
          } else {
            setScanState('error');
            setErrorMessage(result.error || 'Verification failed');
            // Allow retry after error
            isProcessingRef.current = false;
          }
        } catch (err) {
          setScanState('error');
          setErrorMessage('An unexpected error occurred');
          isProcessingRef.current = false;
        }
      };

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.floor(minEdge * 0.7);
          return { width: boxSize, height: boxSize };
        },
      };

      try {
        // Try environment camera first
        await scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          onScanSuccess,
          () => {} // Silent scan error
        );
      } catch (envError) {
        console.warn('Failed with environment camera, trying fallback...', envError);
        
        // Fallback: Get all cameras and try the last one (usually the back camera)
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const cameraId = devices.length > 1 ? devices[devices.length - 1].id : devices[0].id;
          await scannerRef.current.start(
            cameraId,
            config,
            onScanSuccess,
            () => {}
          );
        } else {
          throw envError;
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      const errorName = err.name || '';
      const errorMessage = err.message || '';
      
      if (errorName === 'NotAllowedError' || errorMessage.includes('Permission')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setCameraError('Camera is already in use by another app or tab.');
      } else if (errorName === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Failed to start camera. Please ensure it is available and not in use.');
      }
    }
  }, [isOpen, onScan, onClose, stopScanner]);

  useEffect(() => {
    if (isOpen) {
      setScanState('scanning');
      setErrorMessage('');
      setSuccessMessage('');
      setCameraError('');
      isProcessingRef.current = false;
      
      // Increased delay to ensure Dialog transition is complete
      const timer = setTimeout(() => {
        startScanner();
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanner().then(() => {
          if (scannerRef.current) {
            scannerRef.current.clear();
          }
        });
      }
    };
  }, [stopScanner]);

  const handleRetry = async () => {
    setScanState('scanning');
    setErrorMessage('');
    setCameraError('');
    isProcessingRef.current = false;
    await startScanner();
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Camera Preview Container */}
          {scanState === 'scanning' && (
            <div className="relative">
              <div 
                id="qr-reader" 
                ref={containerRef}
                className="w-full"
                style={{ minHeight: '300px' }}
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-primary rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-primary animate-scan" />
                </div>
              </div>
              
              {cameraError && (
                <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center p-6 text-center">
                  <XCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-sm text-destructive font-medium mb-4">{cameraError}</p>
                  <Button onClick={handleRetry} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Processing State */}
          {scanState === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium text-foreground">Verifying order...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait</p>
            </div>
          )}

          {/* Success State */}
          {scanState === 'success' && (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-green-500 animate-in zoom-in-50 duration-300" />
                <div className="absolute inset-0 animate-ping">
                  <CheckCircle className="h-20 w-20 text-green-500 opacity-30" />
                </div>
              </div>
              <p className="text-xl font-bold text-green-600 mt-4">Success!</p>
              <p className="text-sm text-muted-foreground mt-1">{successMessage}</p>
            </div>
          )}

          {/* Error State */}
          {scanState === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <XCircle className="h-20 w-20 text-destructive animate-in zoom-in-50 duration-300" />
              <p className="text-xl font-bold text-destructive mt-4">Verification Failed</p>
              <p className="text-sm text-muted-foreground mt-1 text-center">{errorMessage}</p>
              <Button onClick={handleRetry} className="mt-6">
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Another
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Close Scanner
          </Button>
        </div>

        <style>{`
          @keyframes scan {
            0%, 100% { top: 0; }
            50% { top: calc(100% - 2px); }
          }
          .animate-scan {
            animation: scan 2s ease-in-out infinite;
          }
          #qr-reader video {
            border-radius: 0 !important;
          }
          #qr-reader__scan_region {
            background: transparent !important;
          }
          #qr-reader__dashboard {
            display: none !important;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
