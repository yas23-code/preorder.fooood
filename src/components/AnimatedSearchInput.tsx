import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AnimatedSearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  className?: string;
}

export function AnimatedSearchInput({ 
  value, 
  onChange, 
  placeholder, 
  className 
}: AnimatedSearchInputProps) {
  const [displayPlaceholder, setDisplayPlaceholder] = useState(placeholder);
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (placeholder !== displayPlaceholder) {
      setIsAnimating(true);
      
      const timeout = setTimeout(() => {
        setDisplayPlaceholder(placeholder);
        setIsAnimating(false);
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [placeholder, displayPlaceholder]);

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder=""
        className={cn("peer", className)}
      />
      {!value && (
        <span 
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-opacity duration-150",
            isAnimating ? "opacity-0" : "opacity-100"
          )}
        >
          {displayPlaceholder}
        </span>
      )}
    </div>
  );
}
