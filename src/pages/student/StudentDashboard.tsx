import { useState, useMemo, useEffect } from 'react';
import { useRandomPlaceholder } from '@/hooks/useRandomPlaceholder';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Logo } from '@/components/Logo';
import { SwipeableNotification } from '@/components/SwipeableNotification';
import { AnimatedSearchInput } from '@/components/AnimatedSearchInput';
import { CanteenCardWithCapacity } from '@/components/CanteenCardWithCapacity';
import { ActiveOrderBottomBar } from '@/components/ActiveOrderBottomBar';
import { ActiveShopOrderBottomBar } from '@/components/ActiveShopOrderBottomBar';
import { NearbyShopsSection } from '@/components/student/NearbyShopsSection';

import { OrderRejectionBanner } from '@/components/OrderRejectionBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useReadyOrderNotifications } from '@/hooks/useReadyOrderNotifications';
import { useShopReadyOrderNotifications } from '@/hooks/useShopReadyOrderNotifications';
import { useActiveOrderTimer } from '@/hooks/useActiveOrderTimer';
import { useActiveShopOrderTimer } from '@/hooks/useActiveShopOrderTimer';
import { useCollegeLocation } from '@/hooks/useCollegeLocation';
import { useOrderRejectionNotifications } from '@/hooks/useOrderRejectionNotifications';
import { useShopOrderOverdueNotification } from '@/hooks/useShopOrderOverdueNotification';
import { Store, Bell, Clock, LogOut, Building2, MapPin, MapPinOff } from 'lucide-react';
import preorderLogo from '@/assets/preorder-logo.jpg';


interface Canteen {
  id: string;
  vendor_id: string;
  name: string;
  location: string;
  image_url: string | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export default function StudentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // College location check for canteen visibility
  const { isInsideCampus, isLoading: isLocationLoading, collegeConfig, locationError } = useCollegeLocation();
  
  const searchPlaceholder = useRandomPlaceholder();
  
  // Location-aware notifications: only fetch relevant notification type
  const shouldShowCanteenNotifications = isInsideCampus === true || isInsideCampus === null;
  const shouldShowShopNotifications = isInsideCampus === false;

  const {
    visibleReadyOrders,
    dismissedReadyOrders,
    notificationsEnabled,
    setNotificationsEnabled,
    dismissNotification,
    restoreNotification,
  } = useReadyOrderNotifications(shouldShowCanteenNotifications ? user?.id : undefined);

  // Shop order ready notifications - only active when outside campus
  const {
    visibleReadyShopOrders,
    dismissedReadyShopOrders,
    notificationsEnabled: shopNotificationsEnabled,
    dismissNotification: dismissShopNotification,
    restoreNotification: restoreShopNotification,
  } = useShopReadyOrderNotifications(shouldShowShopNotifications ? user?.id : undefined);

  // Active order state - get canteen name for bottom bar
  const { activeOrder, orderStatus, estimatedReadyTime, clearActiveOrder } = useActiveOrderTimer();
  const { activeShopOrder, orderStatus: shopOrderStatus, clearActiveShopOrder } = useActiveShopOrderTimer();
  const [activeCanteenName, setActiveCanteenName] = useState<string>('');

  // Order rejection notifications
  const { rejectionNotifications, dismissNotification: dismissRejection } = useOrderRejectionNotifications(user?.id);

  // Shop order overdue notification sound - only when outside campus
  useShopOrderOverdueNotification({
    orderId: shouldShowShopNotifications ? activeShopOrder?.orderId : undefined,
    estimatedReadyTime: activeShopOrder?.estimatedReadyTime,
    orderStatus: shopOrderStatus,
  });

  // Fetch canteen name for active order
  useEffect(() => {
    if (activeOrder?.canteenId) {
      const fetchCanteenName = async () => {
        const { data } = await supabase
          .from('canteens')
          .select('name')
          .eq('id', activeOrder.canteenId)
          .single();
        if (data) {
          setActiveCanteenName(data.name);
        }
      };
      fetchCanteenName();
    } else {
      setActiveCanteenName('');
    }
  }, [activeOrder?.canteenId]);

  // Show toast if navigated from successful payment
  useEffect(() => {
    if (location.state?.orderSuccess) {
      toast.custom(() => (
        <div className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg animate-fade-in">
          <div className="relative">
            <div className="rounded-full overflow-hidden h-10 w-10 flex-shrink-0 ring-2 ring-white/30">
              <img src={preorderLogo} alt="PreOrder" className="h-full w-full object-cover" />
            </div>
            {/* Cooking steam animation */}
            <div className="absolute -top-1 -right-1 flex gap-0.5">
              <span className="w-1 h-3 bg-white/60 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1 h-2 bg-white/40 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }}></span>
              <span className="w-1 h-2.5 bg-white/50 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }}></span>
            </div>
          </div>
          <div>
            <p className="font-bold text-sm">Done! Order is cooking 🍳</p>
            <p className="text-green-100 text-xs">We'll notify you when it's ready</p>
          </div>
        </div>
      ), { duration: 4000 });
      // Clear the state to prevent showing toast on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchCanteens = async () => {
      const { data, error } = await supabase
        .from('canteens')
        .select('*')
        .eq('approval_status', 'approved')
        .order('name');
      
      if (error) {
        console.error('Error fetching canteens:', error);
      } else {
        setCanteens(data || []);
      }
      setIsLoading(false);
    };

    fetchCanteens();
  }, []);

  // Filter canteens based on search and location
  const filteredCanteens = useMemo(() => {
    // If user is outside campus and location restriction is active, show no canteens
    if (isInsideCampus === false && collegeConfig?.is_active) {
      return [];
    }
    
    if (!searchQuery) return canteens;
    const query = searchQuery.toLowerCase();
    return canteens.filter(
      canteen =>
        canteen.name.toLowerCase().includes(query) ||
        canteen.location.toLowerCase().includes(query)
    );
  }, [searchQuery, canteens, isInsideCampus, collegeConfig]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSearch = () => {
    // Search is already handled by the filteredCanteens memo
  };

  return (
    <div className="min-h-screen bg-mcd-cream">
      {/* Order Rejection Notifications */}
      {rejectionNotifications.map((notification) => (
        <OrderRejectionBanner
          key={notification.id}
          canteenName={notification.canteen_name}
          rejectionReason={notification.rejection_reason}
          onDismiss={() => dismissRejection(notification.id)}
        />
      ))}

      {/* Ready Orders Banner - Location-Aware: Only show relevant notifications */}
      {shouldShowCanteenNotifications && notificationsEnabled && visibleReadyOrders.length > 0 && (
        <div className="text-white overflow-hidden">
          <div className="max-w-7xl mx-auto">
            {visibleReadyOrders.map((order) => (
              <SwipeableNotification
                key={order.id}
                orderId={order.id}
                pickupCode={order.pickup_code}
                canteenName={order.canteen_name}
                onDismiss={dismissNotification}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ready Orders Banner - Shop Orders (only when outside campus) */}
      {shouldShowShopNotifications && shopNotificationsEnabled && visibleReadyShopOrders.length > 0 && (
        <div className="text-white overflow-hidden">
          <div className="max-w-7xl mx-auto">
            {visibleReadyShopOrders.map((order) => (
              <SwipeableNotification
                key={order.id}
                orderId={order.id}
                pickupCode={order.pickup_code}
                canteenName={order.shop_name}
                onDismiss={dismissShopNotification}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-mcd-cream border-b border-mcd-border shadow-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-[72px] md:h-24">
            <Logo />

            <div className="flex items-center gap-1.5 md:gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-mcd-red h-11 w-11 md:h-10 md:w-10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 relative"
                  >
                    <Bell className="h-6 w-6 md:h-5 md:w-5" strokeWidth={2.25} />
                    {/* Location-aware notification count */}
                    {((shouldShowCanteenNotifications ? dismissedReadyOrders.length : 0) + 
                      (shouldShowShopNotifications ? dismissedReadyShopOrders.length : 0)) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-mcd-red text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {(shouldShowCanteenNotifications ? dismissedReadyOrders.length : 0) + 
                         (shouldShowShopNotifications ? dismissedReadyShopOrders.length : 0)}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-3 border-b border-mcd-border flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className="text-xs h-7 px-2"
                    >
                      {notificationsEnabled ? 'Mute' : 'Unmute'}
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {/* Canteen dismissed notifications - only when inside campus */}
                    {shouldShowCanteenNotifications && dismissedReadyOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border-b border-mcd-border last:border-b-0 hover:bg-mcd-selected transition-colors cursor-pointer"
                        onClick={() => restoreNotification(order.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="rounded-full overflow-hidden h-8 w-8 flex-shrink-0 ring-2 ring-green-200">
                            <img src={preorderLogo} alt="PreOrder" className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Ready at {order.canteen_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Code: <span className="font-semibold text-green-600">{order.pickup_code}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-mcd-red">Show</span>
                      </div>
                    ))}
                    {/* Shop dismissed notifications - only when outside campus */}
                    {shouldShowShopNotifications && dismissedReadyShopOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border-b border-mcd-border last:border-b-0 hover:bg-mcd-selected transition-colors cursor-pointer"
                        onClick={() => restoreShopNotification(order.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="rounded-full overflow-hidden h-8 w-8 flex-shrink-0 ring-2 ring-blue-200">
                            <img src={preorderLogo} alt="PreOrder" className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Ready at {order.shop_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Code: <span className="font-semibold text-blue-600">{order.pickup_code}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-mcd-red">Show</span>
                      </div>
                    ))}
                    {/* Empty state - location-aware */}
                    {((shouldShowCanteenNotifications ? dismissedReadyOrders.length : 0) + 
                      (shouldShowShopNotifications ? dismissedReadyShopOrders.length : 0)) === 0 && (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        No dismissed notifications
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                onClick={() => navigate('/student/orders')}
                className="flex items-center gap-1.5 md:gap-2 h-11 md:h-10 px-3 md:px-4 text-sm border-mcd-border hover:bg-mcd-selected min-h-[44px] md:min-h-0"
              >
                <Clock className="h-6 w-6 md:h-5 md:w-5 text-mcd-red" strokeWidth={2.25} />
                <span className="hidden sm:inline">Orders</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-1.5 md:gap-2 h-11 md:h-10 px-3 md:px-4 text-sm border-mcd-border hover:bg-mcd-selected min-h-[44px] md:min-h-0"
              >
                <LogOut className="h-6 w-6 md:h-5 md:w-5 text-mcd-red" strokeWidth={2.25} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content with Video Background */}
      <div className="relative min-h-[calc(100vh-72px)] md:min-h-[calc(100vh-96px)]">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/canteen-background.mp4" type="video/mp4" />
        </video>
        
        
        {/* Content */}
        <main className="relative z-10 max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
          {/* Search Bar */}
          <div className="flex gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="flex-1 relative">
              <AnimatedSearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-white border-mcd-border rounded-full pl-4 pr-4 py-5 md:py-6 text-sm md:text-base"
              />
            </div>
            <Button 
              onClick={handleSearch}
              className="bg-mcd-yellow hover:bg-yellow-400 text-foreground font-semibold px-4 md:px-6 rounded-full text-sm md:text-base"
            >
              Search
            </Button>
          </div>

          {/* Location-Aware Content - Single Section Based on Location */}
          {isLocationLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="Detecting your location..." />
            </div>
          ) : isInsideCampus === true || isInsideCampus === null ? (
            /* Inside Campus - Show ONLY Canteens */
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
                <Building2 className="w-5 h-5 text-mcd-red" />
                <h2 className="font-bold text-lg text-foreground">College Canteens</h2>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner text="Loading canteens..." />
                </div>
              ) : filteredCanteens.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCanteens.map((canteen, index) => (
                    <CanteenCardWithCapacity 
                      key={canteen.id} 
                      canteen={canteen} 
                      index={index} 
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6">
                  <EmptyState
                    icon={Store}
                    title={searchQuery ? "No canteens found" : "No canteens yet"}
                    description={searchQuery ? "Try adjusting your search query" : "Canteens will appear here once vendors register"}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Outside Campus - Show ONLY Nearby Shops */
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
                <MapPin className="w-5 h-5 text-mcd-red" />
                <h2 className="font-bold text-lg text-foreground">Nearby Shops</h2>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                <NearbyShopsSection />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Active Order Bottom Bars - Location-Aware: Show only relevant timer */}
      {/* Canteen order timer - ONLY when inside campus AND order is accepted or ready (not pending) */}
      {shouldShowCanteenNotifications && activeOrder && activeCanteenName && (orderStatus === 'accepted' || orderStatus === 'ready') && (
        <ActiveOrderBottomBar
          canteenName={activeCanteenName}
          estimatedReadyTime={estimatedReadyTime}
          orderId={activeOrder.orderId}
          orderStatus={orderStatus}
          onOrderCompleted={clearActiveOrder}
        />
      )}
      
      {/* Shop order timer - ONLY when outside campus */}
      {shouldShowShopNotifications && activeShopOrder && (
        <ActiveShopOrderBottomBar
          shopName={activeShopOrder.shopName}
          estimatedReadyTime={activeShopOrder.estimatedReadyTime}
          orderId={activeShopOrder.orderId}
          orderStatus={shopOrderStatus}
          onOrderCompleted={clearActiveShopOrder}
        />
      )}
    </div>
  );
}
