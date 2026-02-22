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
  const estimatedReadyTime = order.estimated_ready_time ? new Date(order.estimated_ready_time) : null;
  
  // Calculate remaining seconds for ETA (matching student dashboard calculation)
  const getSecondsRemaining = () => {
    if (!estimatedReadyTime) return null;
    const now = Date.now();
    const targetTime = estimatedReadyTime.getTime();
    const diffSeconds = Math.max(0, Math.floor((targetTime - now) / 1000));
    return diffSeconds;
  };
  
  // Convert seconds to minutes (matching student dashboard calculation)
  const getMinutesRemaining = (seconds: number): number => {
    return Math.ceil(seconds / 60);
  };
  
  const secondsRemaining = getSecondsRemaining();
  const minutesRemaining = secondsRemaining !== null ? getMinutesRemaining(secondsRemaining) : null;
  
  // Determine time status: green (>5 min), yellow (1-5 min), red (<=0 min)
  // Only show timer for 'accepted' orders, not 'pending'
  const getTimeStatus = (): TimeStatus | null => {
    if (order.status !== 'accepted' || minutesRemaining === null) return null;
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
  
  // Auto-refresh every 30 seconds to update time status (only for accepted orders)
  useEffect(() => {
    if (order.status !== 'accepted' || !order.estimated_ready_time) return;
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
   }, 1000); // Update every second to match student dashboard timer
    
    return () => clearInterval(interval);
  }, [order.status, order.estimated_ready_time]);
  
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
          <p className="text-muted-foreground">₹{(Number(order.total) - Number((order as any).platform_fee || 0)).toFixed(0)}</p>
        </div>
        {order.order_no && (
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-xs font-medium">ORDER</span>
            <span className="text-lg font-bold">#{order.order_no}</span>
          </div>
        )}
      </div>

      {/* Order Date & Time */}
      {orderDate && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Clock className="h-4 w-4" />
          <span>{format(orderDate, 'dd MMM yyyy, hh:mm a')}</span>
        </div>
      )}
      
      {/* Estimated Ready Time / Prep Time - only for accepted orders */}
      {order.status === 'accepted' && estimatedReadyTime && (
        <div className="flex items-center gap-1.5 text-sm mb-4">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            ETA: {format(estimatedReadyTime, 'hh:mm a')}
          </span>
        </div>
      )}
      
      {(order.status === 'ready' || order.status === 'completed') && estimatedReadyTime && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
          <Timer className="h-4 w-4" />
          <span>ETA was: {format(estimatedReadyTime, 'hh:mm a')}</span>
        </div>
      )}
      
      {/* Order Items */}
      <div className="space-y-1 mb-4">
        {order.items?.map(item => (
          <p key={item.id} className="text-foreground">
            <span className="text-accent font-medium">{item.quantity}×</span>{' '}
            {item.name}
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
