import { Clock, CheckCircle, Package } from 'lucide-react';
import { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OrderCardProps {
  order: Order;
  showActions?: boolean;
  onMarkReady?: (orderId: string) => void;
  onMarkCompleted?: (orderId: string) => void;
}

const statusConfig = {
  pending: {
    label: 'Preparing',
    icon: Clock,
    variant: 'secondary' as const,
    className: 'bg-primary/20 text-primary-foreground border-primary/30',
  },
  ready: {
    label: 'Ready for Pickup',
    icon: Package,
    variant: 'default' as const,
    className: 'bg-accent text-accent-foreground',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    variant: 'outline' as const,
    className: 'bg-muted text-muted-foreground',
  },
};

export function OrderCard({ order, showActions, onMarkReady, onMarkCompleted }: OrderCardProps) {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const formattedDate = new Date(order.created_at).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="card-warm p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>
        <Badge className={status.className}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
      </div>
      
      <div className="space-y-2 mb-4">
        {order.items?.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-foreground">
              {item.quantity}x {item.name}
            </span>
            <span className="text-muted-foreground">₹{item.price * item.quantity}</span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          <span className="text-sm text-muted-foreground">Total</span>
          <p className="text-lg font-bold text-foreground">₹{order.total}</p>
          {(order as any).platform_fee > 0 && (
            <p className="text-xs text-muted-foreground">
              incl. ₹{Number((order as any).platform_fee).toFixed(2)} platform fee
            </p>
          )}
        </div>
        
        {(order.status === 'ready' || showActions) && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Pickup Code</p>
            <p className="text-2xl font-bold text-accent tracking-wider">{order.pickup_code}</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          {order.status === 'pending' && onMarkReady && (
            <Button 
              variant="gradient" 
              className="flex-1"
              onClick={() => onMarkReady(order.id)}
            >
              Mark as Ready
            </Button>
          )}
          {order.status === 'ready' && onMarkCompleted && (
            <Button 
              variant="warm" 
              className="flex-1"
              onClick={() => onMarkCompleted(order.id)}
            >
              Mark as Completed
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
