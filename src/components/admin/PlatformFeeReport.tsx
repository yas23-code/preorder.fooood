import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { IndianRupee, TrendingUp, Building2, Store } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface EntityFee {
    id: string;
    name: string;
    type: 'canteen' | 'shop';
    monthlyFees: number;
    totalFees: number;
}

// Set this date to filter out legacy platform fee revenue
// Format: 'YYYY-MM-DD'
const PLATFORM_FEE_RESET_DATE = '2026-04-14';

export function PlatformFeeReport() {
    const [feeData, setFeeData] = useState<EntityFee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalPlatformMonthly, setTotalPlatformMonthly] = useState(0);
    const [totalPlatformAllTime, setTotalPlatformAllTime] = useState(0);

    useEffect(() => {
        const fetchFees = async () => {
            setIsLoading(true);
            try {
                const now = new Date();
                const startOfCurrentMonth = startOfMonth(now).toISOString();
                const endOfCurrentMonth = endOfMonth(now).toISOString();
                const resetDate = new Date(PLATFORM_FEE_RESET_DATE).toISOString();

                // 1. Fetch Canteens and their fees
                const { data: canteens } = await supabase
                    .from('canteens')
                    .select('id, name')
                    .eq('approval_status', 'approved');

                const { data: canteenOrders } = await supabase
                    .from('orders')
                    .select('canteen_id, platform_fee, created_at')
                    .eq('payment_status', 'paid')
                    .gte('created_at', resetDate);

                // 2. Fetch Shops and their fees
                const { data: shops } = await supabase
                    .from('shops')
                    .select('id, shop_name')
                    .eq('approval_status', 'approved');

                const { data: shopOrders } = await supabase
                    .from('shop_orders')
                    .select('shop_id, platform_fee, created_at')
                    .eq('payment_status', 'paid')
                    .gte('created_at', resetDate);

                const entities: EntityFee[] = [];
                let monthlyGrandTotal = 0;
                let allTimeGrandTotal = 0;

                // Process Canteens
                canteens?.forEach(canteen => {
                    const orders = canteenOrders?.filter(o => o.canteen_id === canteen.id) || [];
                    const totalFees = orders.reduce((sum, o) => sum + Number(o.platform_fee || 0), 0);
                    const monthlyFees = orders
                        .filter(o => o.created_at >= startOfCurrentMonth && o.created_at <= endOfCurrentMonth)
                        .reduce((sum, o) => sum + Number(o.platform_fee || 0), 0);
                    
                    entities.push({
                        id: canteen.id,
                        name: canteen.name,
                        type: 'canteen',
                        monthlyFees,
                        totalFees
                    });
                    
                    monthlyGrandTotal += monthlyFees;
                    allTimeGrandTotal += totalFees;
                });

                // Process Shops
                shops?.forEach(shop => {
                    const orders = shopOrders?.filter(o => o.shop_id === shop.id) || [];
                    const totalFees = orders.reduce((sum, o) => sum + Number(o.platform_fee || 0), 0);
                    const monthlyFees = orders
                        .filter(o => o.created_at >= startOfCurrentMonth && o.created_at <= endOfCurrentMonth)
                        .reduce((sum, o) => sum + Number(o.platform_fee || 0), 0);
                    
                    entities.push({
                        id: shop.id,
                        name: shop.shop_name,
                        type: 'shop',
                        monthlyFees,
                        totalFees
                    });

                    monthlyGrandTotal += monthlyFees;
                    allTimeGrandTotal += totalFees;
                });

                // Sort by total fees descending
                entities.sort((a, b) => b.totalFees - a.totalFees);

                setFeeData(entities);
                setTotalPlatformMonthly(monthlyGrandTotal);
                setTotalPlatformAllTime(allTimeGrandTotal);
            } catch (error) {
                console.error('Error fetching platform fees:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFees();
    }, []);

    return (
        <Card className="w-full overflow-hidden border-primary/20 bg-gradient-to-br from-white to-primary/5">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Platform Fees Overview
                    </CardTitle>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Monthly Revenue</p>
                            <p className="text-lg font-bold text-primary flex items-center justify-end">
                                <IndianRupee className="h-4 w-4" />
                                {totalPlatformMonthly.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Revenue</p>
                            <p className="text-lg font-bold text-foreground flex items-center justify-end">
                                <IndianRupee className="h-4 w-4" />
                                {totalPlatformAllTime.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner text="Fetching platform fee data..." />
                    </div>
                ) : (
                    <div className="rounded-md border bg-white/50 backdrop-blur-sm shadow-inner overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">Canteen / Shop</TableHead>
                                    <TableHead className="font-bold">Type</TableHead>
                                    <TableHead className="text-right font-bold">This Month ({format(new Date(), 'MMM')})</TableHead>
                                    <TableHead className="text-right font-bold bg-primary/5">Total Platform Fees</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feeData.map((entity) => (
                                    <TableRow key={entity.id} className="hover:bg-primary/5 transition-colors group">
                                        <TableCell className="font-medium flex items-center gap-2">
                                            {entity.type === 'canteen' ? (
                                                <Building2 className="h-4 w-4 text-blue-500" />
                                            ) : (
                                                <Store className="h-4 w-4 text-amber-500" />
                                            )}
                                            {entity.name}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                entity.type === 'canteen' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {entity.type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            <span className="flex items-center justify-end gap-1">
                                                <IndianRupee className="h-3 w-3 text-muted-foreground" />
                                                {entity.monthlyFees.toLocaleString('en-IN')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold bg-primary/5 group-hover:bg-primary/10">
                                            <span className="flex items-center justify-end gap-1 text-primary">
                                                <IndianRupee className="h-3 w-3" />
                                                {entity.totalFees.toLocaleString('en-IN')}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {feeData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No platform fees recorded yet
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
                <p className="mt-4 text-[11px] text-muted-foreground italic flex items-center gap-1">
                    * Fees shown are platform commissions collected from students.
                    Tracking since: {format(new Date(PLATFORM_FEE_RESET_DATE), 'PPP')}
                </p>
            </CardContent>
        </Card>
    );
}
