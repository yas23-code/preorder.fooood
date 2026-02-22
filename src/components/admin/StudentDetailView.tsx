import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, User, Mail, Clock, ShoppingBag, Ban, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BanModal } from './BanModal';
import { toast } from 'sonner';

interface StudentDetailViewProps {
  studentId: string;
  onBack: () => void;
}

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  phone?: string;
}

interface Order {
  id: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  canteen_name?: string;
}

interface BanInfo {
  id: string;
  reason: string;
  ban_type: string;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

export function StudentDetailView({ studentId, onBack }: StudentDetailViewProps) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanModal, setShowBanModal] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch student profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single();

      if (profileError) throw profileError;
      setStudent(profileData);

      // Fetch orders with canteen info
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, total, status, payment_status, created_at,
          canteens (name)
        `)
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;
      setOrders(ordersData?.map(o => ({
        ...o,
        canteen_name: (o.canteens as any)?.name
      })) || []);

      // Fetch active ban
      const { data: banData } = await supabase
        .from('bans')
        .select('*')
        .eq('target_id', studentId)
        .eq('target_type', 'student')
        .eq('is_active', true)
        .maybeSingle();

      setBanInfo(banData);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load student data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const handleUnban = async () => {
    if (!banInfo) return;

    try {
      const { error } = await supabase
        .from('bans')
        .update({ is_active: false })
        .eq('id', banInfo.id);

      if (error) throw error;

      toast.success('Student has been unbanned');
      setBanInfo(null);
    } catch (error) {
      console.error('Error unbanning:', error);
      toast.error('Failed to unban student');
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading student data..." />;
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Student not found</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </div>
    );
  }

  const totalSpent = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="ghost" className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Search
      </Button>

      {/* Student Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Student Profile
            </div>
            {banInfo ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Ban className="h-3 w-3" />
                Banned
              </Badge>
            ) : (
              <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                <CheckCircle className="h-3 w-3" />
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Name:</span>
              <span>{student.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Email:</span>
              <span>{student.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Joined:</span>
              <span>{format(new Date(student.created_at), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Total Orders:</span>
              <span>{orders.length}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-lg font-semibold">Total Spent: ₹{totalSpent.toFixed(0)}</p>
          </div>

          {/* Ban Info */}
          {banInfo && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-destructive mb-2">Ban Details</h4>
              <p><span className="font-medium">Reason:</span> {banInfo.reason}</p>
              <p><span className="font-medium">Type:</span> {banInfo.ban_type}</p>
              {banInfo.expires_at && (
                <p><span className="font-medium">Expires:</span> {format(new Date(banInfo.expires_at), 'PPP')}</p>
              )}
              <p><span className="font-medium">Banned on:</span> {format(new Date(banInfo.created_at), 'PPP')}</p>
            </div>
          )}

          {/* Ban/Unban Actions */}
          <div className="flex gap-2 pt-4">
            {banInfo ? (
              <Button variant="outline" onClick={handleUnban}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Unban Student
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setShowBanModal(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Ban Student
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Order History (Read-Only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No orders found</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {orders.map(order => (
                <div key={order.id} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{order.canteen_name || 'Unknown Canteen'}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'PPp')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{Number(order.total).toFixed(0)}</p>
                      <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BanModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        targetId={studentId}
        targetType="student"
        targetName={student.name}
        onBanComplete={fetchData}
      />
    </div>
  );
}
