import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Users, IndianRupee, PieChart, Loader2 } from 'lucide-react';

interface MembershipStats {
    totalRevenue: number;
    totalMembers: number;
    basicCount: number;
    proCount: number;
}

export function MembershipReport() {
    const [stats, setStats] = useState<MembershipStats>({
        totalRevenue: 0,
        totalMembers: 0,
        basicCount: 0,
        proCount: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch all active memberships
                const { data: memberships, error } = await supabase
                    .from('memberships')
                    .select('*')
                    .eq('membership_status', 'ACTIVE');

                if (error) throw error;

                if (memberships) {
                    const basic = memberships.filter(m => m.plan_type === 'basic' || m.plan_type === 'BASIC').length;
                    const pro = memberships.filter(m => m.plan_type === 'pro' || m.plan_type === 'PRO').length;
                    
                    // Note: If previous memberships exist without plan_type, they might show as 0
                    // We also calculate revenue based on plan prices if amount_paid is missing
                    const revenue = memberships.reduce((acc, m) => {
                        if (m.amount_paid) return acc + Number(m.amount_paid);
                        if (m.plan_type?.toLowerCase() === 'basic') return acc + 25;
                        if (m.plan_type?.toLowerCase() === 'pro') return acc + 35;
                        return acc + 29; // Legacy price
                    }, 0);

                    setStats({
                        totalRevenue: revenue,
                        totalMembers: memberships.length,
                        basicCount: basic,
                        proCount: pro
                    });
                }
            } catch (error) {
                console.error('Error fetching membership stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <Card className="border-mcd-border">
                <CardContent className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-mcd-border overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Crown className="h-5 w-5" />
                        Campus Membership Report
                    </CardTitle>
                    <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                        Total Revenue: ₹{stats.totalRevenue}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-mcd-border">
                    <div className="p-4 text-center">
                        <div className="flex justify-center mb-1">
                            <Users className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-foreground">{stats.totalMembers}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Members</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="flex justify-center mb-1">
                            <IndianRupee className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-foreground">₹{stats.totalRevenue}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Revenue</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="bg-amber-100/50 rounded-lg p-2 mb-2">
                            <div className="text-xl font-black text-amber-700">{stats.basicCount}</div>
                            <div className="text-[10px] text-amber-600 font-bold uppercase">Basic Plans (₹25)</div>
                        </div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="bg-orange-100/50 rounded-lg p-2 mb-2">
                            <div className="text-xl font-black text-orange-700">{stats.proCount}</div>
                            <div className="text-[10px] text-orange-600 font-bold uppercase">Pro Plans (₹35)</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
