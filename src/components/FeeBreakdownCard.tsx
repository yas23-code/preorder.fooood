import { FeeBreakdown } from '@/lib/fees';
import { Info } from 'lucide-react';

interface FeeBreakdownCardProps {
  fees: FeeBreakdown;
  showNetProfit?: boolean;
  discount?: number;
}

export function FeeBreakdownCard({ fees, showNetProfit = false, discount = 0 }: FeeBreakdownCardProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Order Amount</span>
        <span className="text-foreground">₹{fees.orderAmount.toFixed(2)}</span>
      </div>

      {discount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-green-600">Discount</span>
          <span className="text-green-600">-₹{discount.toFixed(2)}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          Platform Fee
          <Info className="h-3 w-3 text-muted-foreground/60" />
        </span>
        <span className="text-foreground">₹{fees.platformFee.toFixed(2)}</span>
      </div>

      {showNetProfit && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">PG Fee (2%)</span>
            <span className="text-foreground">₹{fees.pgFee.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Net Profit</span>
            <span className="text-green-600 font-medium">₹{fees.netProfit.toFixed(2)}</span>
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="font-bold text-foreground text-sm md:text-base">Total Payable</span>
        <span className="font-bold text-primary text-lg md:text-xl">₹{fees.totalPayable.toFixed(2)}</span>
      </div>
    </div>
  );
}
