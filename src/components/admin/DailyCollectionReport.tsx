import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { IndianRupee, ShoppingBag, TrendingUp, Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
}

export function DailyCollectionReport() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      try {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('id, total, status, payment_status, platform_fee')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
          .eq('payment_status', 'paid');

        if (error) throw error;

        const totalOrders = orders?.length || 0;
        // Show actual food revenue (total minus platform fee)
        const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total) - Number((order as any).platform_fee || 0), 0) || 0;
        const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
        const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'ready').length || 0;

        setReportData({
          totalOrders,
          totalRevenue,
          completedOrders,
          pendingOrders,
        });
      } catch (error) {
        console.error('Error fetching report:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [selectedDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Daily Collection Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Select Date
          </Label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading report..." />
        ) : reportData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <IndianRupee className="h-5 w-5" />
                  <span className="text-sm font-medium">Total Revenue</span>
                </div>
                <p className="text-2xl font-bold">₹{reportData.totalRevenue.toFixed(0)}</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="text-sm font-medium">Total Orders</span>
                </div>
                <p className="text-2xl font-bold">{reportData.totalOrders}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <p className="text-2xl font-bold">{reportData.completedOrders}</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="text-sm font-medium">In Progress</span>
                </div>
                <p className="text-2xl font-bold">{reportData.pendingOrders}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-muted-foreground">No data available</p>
        )}
      </CardContent>
    </Card>
  );
}
