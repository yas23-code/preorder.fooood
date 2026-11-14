import { useState, useEffect, useRef } from 'react';
import { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Clock, Timer, AlertTriangle, CheckCircle2, AlertCircle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface VendorOrderCardProps {
  order: Order;
  customerName?: string;
  onMarkReady?: (orderId: string) => void;
  onMarkCompleted?: (orderId: string) => void;
  onAcceptOrder?: (orderId: string) => void;
  onRejectOrder?: (orderId: string) => void;
  showAcceptReject?: boolean;
}

type TimeStatus = 'on-time' | 'warning' | 'overdue';

export function VendorOrderCard({ order, customerName, onMarkReady, onMarkCompleted, onAcceptOrder, onRejectOrder, showAcceptReject }: VendorOrderCardProps) {
  const [, setTick] = useState(0);
  const { playOverdueSound } = useNotificationSound();
  const hasPlayedOverdueSound = useRef(false);
  const previousStatus = useRef<TimeStatus | null>(null);

  const orderDate = order.created_at ? new Date(order.created_at) : null;
  
  // Calculate prep duration from order or default to 15 min (matching mobile app logic)
  const prepDurationMinutes = Number((order as any).estimated_prep_duration) || 15;

  // Only start/show ETA when vendor has accepted the order (or it's preparing/ready/in_progress)
  const isOrderAccepted = order.status === 'accepted' || 
                          order.status === 'preparing' || 
                          order.status === 'ready' || 
                          order.status === 'in_progress';

  // 1. Database estimated_ready_time or expected_ready_at or scheduled_pickup_time
  // 2. accepted_at + prepDuration
  const targetReadyTime = (() => {
    if (!isOrderAccepted) return null;

    const rawTime = order.estimated_ready_time || (order as any).expected_ready_at || (order as any).scheduled_pickup_time;
    if (rawTime) {
      const d = new Date(rawTime);
      if (!isNaN(d.getTime())) return d;
    }
    const baseTimeStr = (order as any).accepted_at;
    if (baseTimeStr) {
      const baseDate = new Date(baseTimeStr);
      if (!isNaN(baseDate.getTime())) {
        return new Date(baseDate.getTime() + prepDurationMinutes * 60 * 1000);
      }
    }
    return null;
  })();

  // Calculate remaining seconds for ETA (matching student dashboard calculation)
  const getSecondsRemaining = () => {
    if (!targetReadyTime) return null;
    const now = Date.now();
    return Math.floor((targetReadyTime.getTime() - now) / 1000);
  };

  // Convert seconds to minutes (matching student dashboard calculation)
  const getMinutesRemaining = (seconds: number): number => {
    return Math.ceil(seconds / 60);
  };

  const secondsRemaining = getSecondsRemaining();
  const minutesRemaining = secondsRemaining !== null ? getMinutesRemaining(secondsRemaining) : null;

  // Formatted ETA string matching app ("Est. X mins" / "Ready soon")
  const etaText = (() => {
    if (!isOrderAccepted) {
      return null;
    }
    if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'rejected') {
      return null;
    }
    if (order.status === 'ready') {
      return 'Ready for pickup';
    }
    if (minutesRemaining !== null) {
      return minutesRemaining > 0 ? `Est. ${minutesRemaining} mins` : 'Ready soon';
    }
    return `Est. ${prepDurationMinutes} mins`;
  })();

  // Determine time status: green (>5 min), yellow (1-5 min), red (<=0 min)
  // Only show timer for accepted orders
  const getTimeStatus = (): TimeStatus | null => {
    if (!isOrderAccepted || minutesRemaining === null) return null;
    if (minutesRemaining <= 0) return 'overdue';
    if (minutesRemaining <= 5) return 'warning';
    return 'on-time';
  };

  const timeStatus = getTimeStatus();

  // Play overdue sound when order transitions to overdue status
  useEffect(() => {
    if (
      timeStatus === 'overdue' &&
      previousStatus.current !== 'overdue' &&
      !hasPlayedOverdueSound.current &&
      order.status === 'accepted'
    ) {
      // Check localStorage to prevent sound on page refresh
      const soundKey = `overdue-sound-${order.id}`;
      if (!localStorage.getItem(soundKey)) {
        playOverdueSound();
        localStorage.setItem(soundKey, 'played');
        hasPlayedOverdueSound.current = true;
      }
    }
    previousStatus.current = timeStatus;
  }, [timeStatus, order.id, order.status, playOverdueSound]);

  // Live tick every second to update countdown
  useEffect(() => {
    if (order.status !== 'accepted' && order.status !== 'pending') return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [order.status]);

  const statusConfig = {
    'on-time': {
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-600',
      icon: CheckCircle2,
      label: `${minutesRemaining} min left`,
    },
    'warning': {
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-600',
      icon: AlertTriangle,
      label: `${minutesRemaining} min left`,
    },
    'overdue': {
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-600',
      icon: AlertCircle,
      label: 'Overdue!',
    },
  };

  return (
    <div className={cn(
      "bg-card border rounded-xl p-5 shadow-warm transition-all",
      timeStatus ? statusConfig[timeStatus].borderColor : "border-border/50"
    )}>
      {/* Time Status Indicator - only for accepted orders */}
      {timeStatus && order.status === 'accepted' && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full w-fit mb-3",
          statusConfig[timeStatus].bgColor
        )}>
          {(() => {
            const StatusIcon = statusConfig[timeStatus].icon;
            return <StatusIcon className={cn("h-4 w-4", statusConfig[timeStatus].textColor)} />;
          })()}
          <span className={cn("text-sm font-semibold", statusConfig[timeStatus].textColor)}>
            {statusConfig[timeStatus].label}
          </span>
        </div>
      )}

      {/* Customer Name & Total (show actual food amount, excluding platform fee) */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-xl font-bold font-display text-foreground">
            {customerName || 'Customer'}
          </h3>
          <p className="text-muted-foreground">
            ₹{(() => {
              const foodAndGst = Number(order.total) - Number((order as any).platform_fee || 0);
              // Calculate if we need to add back the packing charge (if it was waived for a member)
              // In our system, order.total covers what student paid. 
              // order.packing_charge is the nominal charge.
              // If the student paid less than (items_total + gst + nominal_packing), it was waived.
              // However, the simplest way is: if the student was a member, the packing was waived.
              // We'll just ensure the vendor always sees (food + gst + nominal_packing).
              
              const itemsTotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
              const nominalPackingTotal = order.items?.reduce((sum, item) => sum + (Number(item.packing_charge || 0) * item.quantity), 0) || 0;
              const gst = Number(order.gst_amount || 0);
              
              return (itemsTotal + nominalPackingTotal + gst).toFixed(2);
            })()}
          </p>
        </div>
        {(() => {
          const displayToken = (order as any).token_number || (order as any).pickup_token || order.order_no;
          if (!displayToken) return null;
          return (
            <div className="flex flex-col items-end gap-1.5">
              <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="text-xs font-medium">ORDER</span>
                <span className="text-lg font-bold">#{displayToken}</span>
              </div>
              {order.order_type && (
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                  order.order_type === 'takeaway'
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                )}>
                  {order.order_type === 'takeaway' ? '🛍️ Takeaway' : '🍽️ Dine In'}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Order Date & Time and Est. time */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm mb-3">
        {orderDate && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(orderDate, 'dd MMM yyyy, hh:mm a')}</span>
          </div>
        )}
        {etaText && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-xs border shadow-sm",
            minutesRemaining !== null && minutesRemaining <= 0
              ? "bg-red-50 text-red-600 border-red-200"
              : minutesRemaining !== null && minutesRemaining <= 5
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "bg-primary/10 text-primary border-primary/20"
          )}>
            <Timer className="h-3.5 w-3.5" />
            <span>{etaText}</span>
          </div>
        )}
      </div>

      {/* Target ETA time for accepted/cooking orders */}
      {order.status === 'accepted' && targetReadyTime && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/40">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Ready by: {format(targetReadyTime, 'hh:mm a')}</span>
        </div>
      )}

      {(order.status === 'ready' || order.status === 'completed') && targetReadyTime && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Timer className="h-3.5 w-3.5" />
          <span>Ready time was: {format(targetReadyTime, 'hh:mm a')}</span>
        </div>
      )}

      {/* Order Items */}
      <div className="space-y-1 mb-4">
        {order.items?.map(item => (
          <p key={item.id} className="text-foreground">
            <span className="text-accent font-medium">{item.quantity}×</span>{' '}
            {item.name}
            <span className="text-muted-foreground text-sm ml-2">₹{(item.price * item.quantity).toFixed(2)}</span>
            {item.packing_charge && item.packing_charge > 0 && (
              <span className="text-amber-600 text-[10px] font-bold ml-2 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                + ₹{(item.packing_charge * item.quantity).toFixed(2)} PACKING
              </span>
            )}
          </p>
        ))}
      </div>

      {/* Accept/Reject Buttons for new pending orders */}
      {order.status === 'pending' && showAcceptReject && onAcceptOrder && onRejectOrder && (
        <div className="flex gap-2 mb-3">
          <Button
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg"
            onClick={() => onAcceptOrder(order.id)}
          >
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-lg"
            onClick={() => onRejectOrder(order.id)}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}

      {/* Action Button - Mark Ready (only for accepted orders, not pending) */}
      {order.status === 'accepted' && onMarkReady && (
        <Button
          className={cn(
            "w-full font-semibold py-3 rounded-lg",
            timeStatus === 'overdue'
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
          onClick={() => onMarkReady(order.id)}
        >
          {timeStatus === 'overdue' ? 'Mark Ready (Overdue!)' : 'Mark Ready'}
        </Button>
      )}

      {order.status === 'ready' && (
        <div className="bg-accent/10 rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">Waiting for pickup</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ask student for pickup code to complete
          </p>
        </div>
      )}
    </div>
  );
}
