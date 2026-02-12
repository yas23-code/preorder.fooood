import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Check, X, MapPin, Phone, Store, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface PendingShop {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  shop_type: 'college' | 'public';
  image_url: string | null;
  created_at: string;
}

export function PendingShopApprovals() {
  const [pendingShops, setPendingShops] = useState<PendingShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [mapShop, setMapShop] = useState<PendingShop | null>(null);

  useEffect(() => {
    fetchPendingShops();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('pending-shops')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shops',
          filter: 'approval_status=eq.pending',
        },
        () => {
          fetchPendingShops();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingShops = async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending shops:', error);
      toast.error('Failed to load pending approvals');
    } else {
      setPendingShops((data || []) as PendingShop[]);
    }
    setLoading(false);
  };

  const handleApproval = async (shopId: string, approve: boolean) => {
    setProcessingId(shopId);
    
    const { error } = await supabase
      .from('shops')
      .update({ approval_status: approve ? 'approved' : 'rejected' })
      .eq('id', shopId);

    if (error) {
      console.error('Error updating approval status:', error);
      toast.error(`Failed to ${approve ? 'approve' : 'reject'} shop`);
    } else {
      toast.success(`Shop ${approve ? 'approved' : 'rejected'} successfully`);
      setPendingShops(prev => prev.filter(s => s.id !== shopId));
    }
    
    setProcessingId(null);
  };

  const openMapUrl = (shop: PendingShop) => {
    const url = `https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Pending Shop Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Pending Shop Approvals
            {pendingShops.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingShops.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingShops.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending shop approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingShops.map((shop) => (
                <div
                  key={shop.id}
                  className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{shop.shop_name}</h3>
                        <Badge variant={shop.shop_type === 'college' ? 'default' : 'secondary'}>
                          {shop.shop_type === 'college' ? 'College' : 'Public'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{shop.owner_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{shop.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2">
                          <Building2 className="h-4 w-4 flex-shrink-0" />
                          <span className="line-clamp-1">{shop.address}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMapUrl(shop)}
                        className="mt-2"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        View on Map
                      </Button>
                    </div>

                    <div className="flex gap-2 md:flex-col">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApproval(shop.id, true)}
                        disabled={processingId === shop.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleApproval(shop.id, false)}
                        disabled={processingId === shop.id}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!mapShop} onOpenChange={() => setMapShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mapShop?.shop_name} - Location</DialogTitle>
          </DialogHeader>
          {mapShop && (
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapShop.latitude},${mapShop.longitude}&zoom=15`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
