import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, ArrowLeft, ChevronRight, Trash2 } from 'lucide-react';

export default function Carts() {
  const { carts, getTotal, getItemCount, clearCart, getActiveCanteenIds } = useCart();
  const navigate = useNavigate();
  
  const activeCanteenIds = getActiveCanteenIds();

  if (activeCanteenIds.length === 0) {
    return (
      <div className="min-h-screen bg-mcd-cream">
        <div className="border-b border-mcd-border bg-mcd-cream sticky top-0 z-10">
          <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center gap-3 md:gap-4">
            <Link 
              to="/student/dashboard"
              className="flex items-center gap-1 md:gap-2 text-muted-foreground hover:text-mcd-red transition-colors text-sm md:text-base"
            >
              <ArrowLeft className="h-4 w-4 text-mcd-red" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-mcd-red" />
              <h1 className="text-lg md:text-xl font-bold">My Carts</h1>
            </div>
          </div>
        </div>
        <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
          <EmptyState
            icon={ShoppingCart}
            title="No items in any cart"
            description="Add some delicious items from canteens to get started"
            action={
              <Button asChild variant="gradient">
                <Link to="/student/dashboard">Browse Canteens</Link>
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mcd-cream">
      {/* Header */}
      <div className="border-b border-mcd-border bg-mcd-cream sticky top-0 z-10">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center gap-3 md:gap-4">
          <Link 
            to="/student/dashboard"
            className="flex items-center gap-1 md:gap-2 text-muted-foreground hover:text-mcd-red transition-colors text-sm md:text-base"
          >
            <ArrowLeft className="h-4 w-4 text-mcd-red" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-mcd-red" />
            <h1 className="text-lg md:text-xl font-bold">My Carts</h1>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-3xl">
        <p className="text-sm md:text-base text-muted-foreground mb-4">
          You have items from {activeCanteenIds.length} canteen{activeCanteenIds.length > 1 ? 's' : ''}
        </p>
        
        <div className="space-y-3 md:space-y-4">
          {activeCanteenIds.map((canteenId) => {
            const cart = carts[canteenId];
            const total = getTotal(canteenId);
            const itemCount = getItemCount(canteenId);
            
            return (
              <div 
                key={canteenId}
                className="bg-white rounded-xl md:rounded-2xl shadow-card border border-mcd-border overflow-hidden"
              >
                <div className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-foreground text-base md:text-lg">{cart.canteenName}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-mcd-red"
                      onClick={() => clearCart(canteenId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {itemCount} item{itemCount > 1 ? 's' : ''} • <span className="text-mcd-red font-semibold">₹{total}</span>
                  </p>
                  
                  {/* Item previews */}
                  <div className="text-sm text-muted-foreground mb-4">
                    {cart.items.slice(0, 3).map((item, idx) => (
                      <span key={item.menuItem.id}>
                        {item.menuItem.name} × {item.quantity}
                        {idx < Math.min(cart.items.length, 3) - 1 && ', '}
                      </span>
                    ))}
                    {cart.items.length > 3 && ` +${cart.items.length - 3} more`}
                  </div>
                  
                  <Button 
                    className="w-full bg-mcd-yellow hover:bg-yellow-400 text-foreground font-semibold h-10 md:h-11 rounded-xl text-sm md:text-base"
                    onClick={() => navigate(`/student/cart/${canteenId}`)}
                  >
                    View Cart
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
