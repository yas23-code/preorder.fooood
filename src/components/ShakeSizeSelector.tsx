import { SizeVariant } from '@/lib/types';
import { cn } from '@/lib/utils';

export const SIZE_OPTIONS: { size: SizeVariant; label: string; price: number }[] = [
  { size: 'small', label: 'S', price: 30 },
  { size: 'medium', label: 'M', price: 40 },
  { size: 'large', label: 'L', price: 50 },
];

// Check if item is a shake or juice (category contains "shake" or "juice")
export const isShakeItem = (category?: string) => {
  const cat = category?.toLowerCase() || '';
  return cat.includes('shake') || cat.includes('juice');
};

interface ShakeSizeSelectorProps {
  selectedSize: SizeVariant;
  onSizeChange: (size: SizeVariant) => void;
  compact?: boolean;
}

export function ShakeSizeSelector({ selectedSize, onSizeChange, compact = false }: ShakeSizeSelectorProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "mt-1.5" : "mt-2")}>
      <span className="text-xs text-muted-foreground font-medium">Select Size</span>
      <div className="flex gap-2">
        {SIZE_OPTIONS.map((option) => (
          <button
            key={option.size}
            onClick={(e) => {
              e.stopPropagation();
              onSizeChange(option.size);
            }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center rounded-xl border-2 transition-all py-1.5 min-w-[60px]",
              selectedSize === option.size
                ? "bg-mcd-yellow border-mcd-yellow shadow-sm"
                : "bg-white border-mcd-border hover:border-mcd-yellow/60"
            )}
          >
            <span className={cn(
              "text-sm font-bold",
              selectedSize === option.size ? "text-foreground" : "text-muted-foreground"
            )}>
              {option.label}
            </span>
            <span className={cn(
              "text-xs font-semibold",
              selectedSize === option.size ? "text-mcd-red" : "text-muted-foreground"
            )}>
              ₹{option.price}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const getShakePrice = (size: SizeVariant) => {
  return SIZE_OPTIONS.find(s => s.size === size)?.price || 40;
};
