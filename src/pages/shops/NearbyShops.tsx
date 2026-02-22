import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { NearbyShopsList } from '@/components/shops/NearbyShopsList';
import { ArrowLeft, LogIn, Settings } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function NearbyShops() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasShop, setHasShop] = useState(false);

  // Check if user has a shop
  useEffect(() => {
    async function checkShop() {
      if (!user) {
        setHasShop(false);
        return;
      }

      const { data } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      setHasShop(!!data);
    }

    checkShop();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Logo />
            </div>
            <div className="flex items-center gap-2">
              {user && hasShop && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/shops/manage')}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Manage Shop</span>
                </Button>
              )}
              {!user && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Title Section */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Nearby Shops</h1>
            <p className="text-muted-foreground">
              Discover food shops near your location
            </p>
          </div>

          {/* Shops List */}
          <NearbyShopsList />
        </div>
      </div>
    </div>
  );
}
