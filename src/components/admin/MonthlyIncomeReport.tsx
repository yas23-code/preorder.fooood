import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { IndianRupee, TrendingUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';

interface MonthlyData {
    month: string;
    revenue: number;
}

interface CanteenMonthlyIncome {
    canteenId: string;
    canteenName: string;
    monthlyData: Record<string, number>; // monthKey -> revenue
}

export function MonthlyIncomeReport() {
    const [reportData, setReportData] = useState<CanteenMonthlyIncome[]>([]);
    const [months, setMonths] = useState<string[]>([]); // monthKeys like '2024-03'
    const [isLoading, setIsLoading] = useState(true);
    const [offset, setOffset] = useState(0); // For pagination if we want to see older months

    useEffect(() => {
        const fetchMonthlyReport = async () => {
            setIsLoading(true);
            try {
                // Generate last 6 months keys
                const monthKeys: string[] = [];
                for (let i = 5; i >= 0; i--) {
                    const date = subMonths(new Date(), i + offset * 6);
                    monthKeys.push(format(date, 'yyyy-MM'));
                }
                setMonths(monthKeys);

                // Fetch all canteens
                const { data: canteens, error: canteensError } = await supabase
                    .from('canteens')
                    .select('id, name')
                    .eq('approval_status', 'approved');

                if (canteensError) throw canteensError;

                // Fetch orders for the range
                const startDate = startOfMonth(subMonths(new Date(), 5 + offset * 6)).toISOString();
                const endDate = endOfMonth(new Date()).toISOString();

                const { data: orders, error: ordersError } = await supabase
                    .from('orders')
                    .select('canteen_id, total, platform_fee, created_at')
                    .eq('payment_status', 'paid')
                    .gte('created_at', startDate)
                    .lte('created_at', endDate);

                if (ordersError) throw ordersError;

                // Group by canteen and month
                const reportMap: Record<string, CanteenMonthlyIncome> = {};

                canteens?.forEach(c => {
                    reportMap[c.id] = {
                        canteenId: c.id,
                        canteenName: c.name,
                        monthlyData: {}
                    };
                    monthKeys.forEach(m => {
                        reportMap[c.id].monthlyData[m] = 0;
                    });
                });

                orders?.forEach(order => {
                    const monthKey = format(new Date(order.created_at), 'yyyy-MM');
                    if (reportMap[order.canteen_id] && monthKeys.includes(monthKey)) {
                        const revenue = Number(order.total) - Number(order.platform_fee || 0);
                        reportMap[order.canteen_id].monthlyData[monthKey] += revenue;
                    }
                });

                setReportData(Object.values(reportMap));
            } catch (error) {
                console.error('Error fetching monthly report:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMonthlyReport();
    }, [offset]);

    const formatMonthLabel = (key: string) => {
        return format(new Date(key + '-01'), 'MMM yyyy');
    };

    return (
        <Card className="w-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Monthly Income by Canteen
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setOffset(prev => prev + 1)}
                        title="Older Months"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setOffset(prev => Math.max(0, prev - 1))}
                        disabled={offset === 0}
                        title="Newer Months"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner text="Calculating monthly income..." />
                    </div>
                ) : (
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[200px] font-bold">Canteen Name</TableHead>
                                    {months.map(m => (
                                        <TableHead key={m} className="text-right font-bold whitespace-nowrap">
                                            {formatMonthLabel(m)}
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-right font-bold bg-primary/5">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.map((row) => {
                                    const rowTotal = Object.values(row.monthlyData).reduce((a, b) => a + b, 0);
                                    return (
                                        <TableRow key={row.canteenId} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium whitespace-nowrap">{row.canteenName}</TableCell>
                                            {months.map(m => (
                                                <TableCell key={m} className="text-right whitespace-nowrap">
                                                    {row.monthlyData[m] > 0 ? (
                                                        <span className="flex items-center justify-end gap-1">
                                                            < IndianRupee className="h-3 w-3 text-muted-foreground" />
                                                            {row.monthlyData[m].toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/30">-</span>
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold bg-primary/5 whitespace-nowrap underline decoration-primary/30 underline-offset-4">
                                                <span className="flex items-center justify-end gap-1 text-primary">
                                                    <IndianRupee className="h-3 w-3" />
                                                    {rowTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {reportData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={months.length + 2} className="h-24 text-center text-muted-foreground">
                                            No canteen data found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <TableHeader>
                                <TableRow className="bg-muted/30 font-bold border-t-2">
                                    <TableCell>Grand Total</TableCell>
                                    {months.map(m => {
                                        const monthTotal = reportData.reduce((sum, row) => sum + row.monthlyData[m], 0);
                                        return (
                                            <TableCell key={m} className="text-right whitespace-nowrap">
                                                <span className="flex items-center justify-end gap-1">
                                                    <IndianRupee className="h-3 w-3" />
                                                    {monthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </span>
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-right font-black text-primary bg-primary/10 whitespace-nowrap">
                                        <span className="flex items-center justify-end gap-1">
                                            <IndianRupee className="h-4 w-4" />
                                            {reportData.reduce((sum, row) => sum + Object.values(row.monthlyData).reduce((a, b) => a + b, 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                        </Table>
                    </div>
                )}
                <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground italic">
                    <IndianRupee className="h-3 w-3" />
                    Earnings shown are after platform fee deductions.
                </div>
            </CardContent>
        </Card>
    );
}
