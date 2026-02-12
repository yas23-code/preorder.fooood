import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Check, X, MapPin, Store, User } from 'lucide-react';
import { toast } from 'sonner';

interface PendingCanteen {
  id: string;
  name: string;
  location: string;
  vendor_id: string;
  image_url: string | null;
  created_at: string;
  vendor_email: string | null;
}

export function PendingCanteenApprovals() {
  const [pendingCanteens, setPendingCanteens] = useState<PendingCanteen[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingCanteens();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('pending-canteens')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canteens',
          filter: 'approval_status=eq.pending',
        },
        () => {
          fetchPendingCanteens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingCanteens = async () => {
    const { data, error } = await supabase
      .from('canteens')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending canteens:', error);
      toast.error('Failed to load pending approvals');
    } else {
      setPendingCanteens((data || []) as PendingCanteen[]);
    }
    setLoading(false);
  };

  const handleApproval = async (canteenId: string, approve: boolean) => {
    setProcessingId(canteenId);
    
    const { error } = await supabase
      .from('canteens')
      .update({ approval_status: approve ? 'approved' : 'rejected' })
      .eq('id', canteenId);

    if (error) {
      console.error('Error updating approval status:', error);
      toast.error(`Failed to ${approve ? 'approve' : 'reject'} canteen`);
    } else {
      toast.success(`Canteen ${approve ? 'approved' : 'rejected'} successfully`);
      setPendingCanteens(prev => prev.filter(c => c.id !== canteenId));
    }
    
    setProcessingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Pending Canteen Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Pending Canteen Approvals
          {pendingCanteens.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingCanteens.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingCanteens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pending canteen approvals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCanteens.map((canteen) => (
              <div
                key={canteen.id}
                className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">{canteen.name}</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{canteen.location}</span>
                      </div>
                      {canteen.vendor_email && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{canteen.vendor_email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 md:flex-col">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApproval(canteen.id, true)}
                      disabled={processingId === canteen.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleApproval(canteen.id, false)}
                      disabled={processingId === canteen.id}
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
  );
}
