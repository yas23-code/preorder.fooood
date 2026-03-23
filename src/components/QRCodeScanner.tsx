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
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  const startScannerImplementation = useCallback(async () => {
    if (!containerRef.current || !isOpen) return;

    setCameraError('');
    setIsCameraStarting(true);
    
    try {
      // Permission is already granted before dialog opens (requested in parent component)

      // 2. Clear any existing scanner and cleanup container
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state > 1) await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch (e) {
          console.warn('Silent cleanup of old scanner failed:', e);
        }
      }
      
      const container = document.getElementById('qr-reader');
      if (container) {
        container.innerHTML = '';
      }

      // 3. Create new scanner instance
      scannerRef.current = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const onScanSuccess = async (decodedText: string) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setScanState('processing');
        
        try {
          // Robust stop
          if (scannerRef.current) {
            const state = scannerRef.current.getState();
            if (state > 1) await scannerRef.current.stop();
          }
          
          const result = await onScan(decodedText);
          if (result.success) {
            setScanState('success');
            setSuccessMessage(result.message || 'Order completed successfully!');
            setTimeout(() => onClose(), 2000);
          } else {
            setScanState('error');
            setErrorMessage(result.error || 'Verification failed');
            isProcessingRef.current = false;
          }
        } catch (err) {
          setScanState('error');
          setErrorMessage('An unexpected error occurred during verification');
          isProcessingRef.current = false;
        }
      };

      const config = {
        fps: 15, // Higher FPS for smoother responsiveness
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.floor(minEdge * 0.7);
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
      };

      // 4. Try environment camera first
      try {
        await scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          onScanSuccess,
          () => {} // Silent scan error
        );
      } catch (envError) {
        console.warn('Failed with facingMode: environment, trying fallback...', envError);
        
        // Fallback: Get all cameras and try to find a back camera
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          
          const cameraId = backCam ? backCam.id : devices[devices.length - 1].id;
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
      // Camera started successfully
      setIsCameraStarting(false);
    } catch (err: any) {
      console.error('Final Camera Error:', err);
      setIsCameraStarting(false);
      const errorName = err.name || '';
      const errorMessage = err.message || '';
      
      if (errorName === 'NotAllowedError' || errorMessage.includes('Permission')) {
        setCameraError('Camera permission denied. Please allow access in browser settings.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setCameraError('Camera is currently busy or already in use by another tab.');
      } else if (errorName === 'NotFoundError') {
        setCameraError('No camera detected on this device.');
      } else {
        setCameraError('Failed to start camera. Please check your settings and try again.');
      }
    }
  }, [onScan, onClose]);

  useEffect(() => {
    if (isOpen) {
      setScanState('scanning');
      setErrorMessage('');
      setSuccessMessage('');
      setCameraError('');
      setIsCameraStarting(true);
      isProcessingRef.current = false;
      
      // Use requestAnimationFrame to start immediately after DOM renders
      let rafId: number;
      rafId = requestAnimationFrame(() => {
        startScannerImplementation();
      });
      
      return () => cancelAnimationFrame(rafId);
    } else {
      if (scannerRef.current) {
         const state = scannerRef.current.getState();
         if (state > 1) scannerRef.current.stop().catch(() => {});
      }
    }
  }, [isOpen, startScannerImplementation]);

  const handleRetry = async () => {
    setScanState('scanning');
    setErrorMessage('');
    setCameraError('');
    isProcessingRef.current = false;
    await startScannerImplementation();
  };

  const handleClose = async () => {
    if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state > 1) await scannerRef.current.stop();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title} <span className="text-[10px] opacity-50 font-normal">v1.2</span>
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Camera Preview Container */}
          {scanState === 'scanning' && (
            <div className="relative">
              <div 
                id="qr-reader" 
                ref={containerRef}
                className="w-full bg-black"
                style={{ minHeight: '300px' }}
              />
              
              {/* Loading spinner while camera starts */}
              {isCameraStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                  <p className="text-white text-sm font-medium">Starting camera...</p>
                </div>
              )}

              {/* Scanning overlay - only show when camera is active */}
              {!isCameraStarting && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-60 h-60 border-2 border-primary rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-primary animate-scan opacity-60" />
                </div>
              </div>
              )}
              
              {cameraError && (
                <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center p-6 text-center z-50">
                  <XCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-sm text-destructive font-medium mb-2">{cameraError}</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
                    Please ensure camera permissions are granted in your browser settings and you are using a secure (HTTPS) connection.
                  </p>
                  <Button onClick={handleRetry} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Processing State */}
          {scanState === 'processing' && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium text-foreground">Verifying order...</p>
              <p className="text-sm text-muted-foreground mt-1 text-center">Please stay on this screen while we complete verification</p>
            </div>
          )}

          {/* Success State */}
          {scanState === 'success' && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-green-500 animate-in zoom-in-50 duration-300" />
                <div className="absolute inset-0 animate-ping">
                  <CheckCircle className="h-20 w-20 text-green-500 opacity-30" />
                </div>
              </div>
              <p className="text-xl font-bold text-green-600 mt-4 text-center">Verification Successful!</p>
              <p className="text-sm text-muted-foreground mt-1 text-center">{successMessage}</p>
            </div>
          )}

          {/* Error State */}
          {scanState === 'error' && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <XCircle className="h-20 w-20 text-destructive animate-in zoom-in-50 duration-300" />
              <p className="text-xl font-bold text-destructive mt-4 text-center">Verification Failed</p>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-[280px]">{errorMessage}</p>
              <div className="flex gap-3 mt-8">
                <Button onClick={handleRetry} variant="default" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={handleClose} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <Button variant="outline" className="w-full h-12 text-base font-medium" onClick={handleClose}>
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
            animation: scan 2.5s ease-in-out infinite;
          }
          #qr-reader video {
            border-radius: 12px !important;
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
            min-height: 300px !important;
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
