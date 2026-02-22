import { useState, useEffect } from 'react';
import { MapPin, Building2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  TEST_MODE, 
  FORCE_LOCATION, 
  setForceLocation, 
  type ForceLocation 
} from '@/hooks/useCollegeLocation';

/**
 * Developer-only toggle for simulating user location.
 * This component is ONLY visible when TEST_MODE = true in useCollegeLocation.ts
 * 
 * TO REMOVE FOR PRODUCTION:
 * 1. Set TEST_MODE = false in src/hooks/useCollegeLocation.ts
 * 2. Delete this file (src/components/DevLocationToggle.tsx)
 * 3. Remove the import and usage from Header.tsx or wherever it's used
 */
export function DevLocationToggle() {
  const [currentLocation, setCurrentLocation] = useState<ForceLocation>(FORCE_LOCATION);

  // Keep state in sync with the global variable
  useEffect(() => {
    const interval = setInterval(() => {
      if (FORCE_LOCATION !== currentLocation) {
        setCurrentLocation(FORCE_LOCATION);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [currentLocation]);

  // Don't render anything if TEST_MODE is disabled
  if (!TEST_MODE) {
    return null;
  }

  const handleToggle = () => {
    const newLocation: ForceLocation = currentLocation === 'college' ? 'outside' : 'college';
    setForceLocation(newLocation);
    setCurrentLocation(newLocation);
  };

  return (
    <div className="fixed bottom-20 left-4 z-[100] bg-background border-2 border-dashed border-mcd-yellow rounded-lg p-3 shadow-lg max-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-mcd-red" />
        <span className="text-xs font-bold text-mcd-red uppercase">Dev Mode</span>
      </div>
      
      <p className="text-[10px] text-muted-foreground mb-2">
        Simulating: <span className="font-semibold text-foreground">
          {currentLocation === 'college' ? 'Inside Campus' : 'Outside Campus'}
        </span>
      </p>

      <Button
        onClick={handleToggle}
        size="sm"
        variant={currentLocation === 'college' ? 'default' : 'outline'}
        className="w-full h-8 text-xs gap-1.5"
      >
        {currentLocation === 'college' ? (
          <>
            <Building2 className="h-3.5 w-3.5" />
            Switch to Outside
          </>
        ) : (
          <>
            <Store className="h-3.5 w-3.5" />
            Switch to College
          </>
        )}
      </Button>

      <p className="text-[9px] text-muted-foreground/70 mt-2 text-center">
        Set TEST_MODE=false to hide
      </p>
    </div>
  );
}
