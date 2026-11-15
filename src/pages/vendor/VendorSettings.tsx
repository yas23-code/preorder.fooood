import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Save, Loader2, Send, CheckCircle, XCircle, Copy, ExternalLink, Receipt } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';

export default function VendorSettings() {
    const { profile, updateProfile, user } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(profile?.name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Telegram linking state
    const [linkCode, setLinkCode] = useState<string | null>(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [isTelegramLinked, setIsTelegramLinked] = useState(false);

    // Canteen GST & Order Limit state
    const [canteen, setCanteen] = useState<{ id: string; name: string; gst_enabled: boolean; order_limit: number; order_limit_enabled: boolean } | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchCanteen = async () => {
            const { data } = await supabase
                .from('canteens')
                .select('id, name, gst_enabled, order_limit, order_limit_enabled')
                .eq('vendor_id', user.id)
                .maybeSingle();
            if (data) {
                setCanteen({
                    id: data.id,
                    name: data.name,
                    gst_enabled: data.gst_enabled ?? true,
                    order_limit: data.order_limit ?? 10,
                    order_limit_enabled: data.order_limit_enabled ?? true,
                });
            }
        };
        fetchCanteen();
    }, [user]);

    const handleToggleGst = async (checked: boolean) => {
        if (!canteen) return;
        setCanteen(prev => prev ? { ...prev, gst_enabled: checked } : null);
        const { error } = await supabase
            .from('canteens')
            .update({ gst_enabled: checked })
            .eq('id', canteen.id);
        if (error) {
            toast.error('Failed to update GST setting');
            setCanteen(prev => prev ? { ...prev, gst_enabled: !checked } : null);
        } else {
            toast.success(checked ? 'GST (5%) is now ON' : 'GST is now turned OFF');
        }
    };

    const handleToggleOrderLimit = async (checked: boolean) => {
        if (!canteen) return;
        setCanteen(prev => prev ? { ...prev, order_limit_enabled: checked } : null);
        const { error } = await supabase
            .from('canteens')
            .update({ order_limit_enabled: checked })
            .eq('id', canteen.id);
        if (error) {
            toast.error('Failed to update order limit setting');
            setCanteen(prev => prev ? { ...prev, order_limit_enabled: !checked } : null);
        } else {
            toast.success(checked ? 'Order Limit Auto-pause is now ON' : 'Order Limit Auto-pause is now OFF');
        }
    };

    const handleUpdateOrderLimit = async (newLimit: number) => {
        if (!canteen || newLimit < 1) return;
        setCanteen(prev => prev ? { ...prev, order_limit: newLimit } : null);
        const { error } = await supabase
            .from('canteens')
            .update({ order_limit: newLimit, max_concurrent_orders: newLimit })
            .eq('id', canteen.id);
        if (error) {
            toast.error('Failed to update order limit');
        } else {
            toast.success(`Active order limit set to ${newLimit} orders`);
        }
    };

    useEffect(() => {
        if (profile) {
            setName(profile.name);
            setPhone(profile.phone || '');
            setIsTelegramLinked(!!profile.telegram_chat_id);
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const success = await updateProfile({
            name,
            phone,
        });

        setIsSubmitting(false);
        if (success) {
            navigate('/vendor/dashboard');
        }
    };

    const generateLinkCode = async () => {
        if (!user) return;
        setIsGeneratingCode(true);

        try {
            // Generate a random 6-character code
            const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            // Delete any existing pending links for this user
            await (supabase as any)
                .from('telegram_pending_links')
                .delete()
                .eq('user_id', user.id);

            // Insert new pending link (expires in 10 minutes)
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            const { error } = await (supabase as any)
                .from('telegram_pending_links')
                .insert({
                    user_id: user.id,
                    link_code: code,
                    expires_at: expiresAt,
                });

            if (error) {
                console.error('Failed to create link code:', error);
                toast.error('Failed to generate link code');
                return;
            }

            setLinkCode(code);
            toast.success('Link code generated! It expires in 10 minutes.');
        } catch (error) {
            console.error('Error generating link code:', error);
            toast.error('Something went wrong');
        } finally {
            setIsGeneratingCode(false);
        }
    };

    const copyCode = () => {
        if (linkCode) {
            navigator.clipboard.writeText(linkCode);
            toast.success('Code copied to clipboard!');
        }
    };

    const unlinkTelegram = async () => {
        if (!user) return;

        const success = await updateProfile({ telegram_chat_id: null } as any);
        if (success) {
            setIsTelegramLinked(false);
            toast.success('Telegram unlinked successfully');
        }
    };

    return (
        <div className="min-h-screen bg-mcd-cream">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-mcd-cream border-b border-mcd-border shadow-card">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Logo size="sm" />
                    </div>
                    <h1 className="text-xl font-bold font-poppins text-mcd-text">Vendor Settings</h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
                {/* Profile Card */}
                <Card className="border-mcd-border shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-mcd-red" />
                            Profile Information
                        </CardTitle>
                        <CardDescription>
                            Update your vendor profile details. Your phone number is required for order SMS notifications.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-mcd-text/50" />
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10 border-mcd-border focus-visible:ring-mcd-red"
                                        placeholder="Your Name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number (for SMS Notifications)</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-mcd-text/50" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="pl-10 border-mcd-border focus-visible:ring-mcd-red"
                                        placeholder="e.g. 91xxxxxxxxxx"
                                    />
                                </div>
                                <p className="text-xs text-mcd-text/60 italic">
                                    Include country code (e.g., 91 for India). This number will receive alerts for new orders.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-mcd-red hover:bg-red-600 text-white font-bold h-12"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Settings
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* GST Settings Card */}
                {canteen && (
                    <>
                    <Card className="border-mcd-border shadow-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-emerald-600" />
                                GST (5%) Order Tax
                            </CardTitle>
                            <CardDescription>
                                Enable or disable 5% GST on student orders for {canteen.name}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-mcd-border">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm text-foreground">Collect 5% GST</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${canteen.gst_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {canteen.gst_enabled ? 'Active (5%)' : 'Turned Off (0%)'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {canteen.gst_enabled
                                            ? '5% GST will be calculated and added to the order price on student cart page.'
                                            : 'No GST (0%) will be included in student orders on cart page.'}
                                    </p>
                                </div>
                                <Switch
                                    checked={canteen.gst_enabled}
                                    onCheckedChange={handleToggleGst}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Capacity Limit Card */}
                    <Card className="border-mcd-border shadow-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">⚡</span>
                                Order Capacity Limit & Auto-Pause
                            </CardTitle>
                            <CardDescription>
                                Automatically pause new student orders when active orders reach your capacity limit.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-mcd-border">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm text-foreground">Auto-Pause on Limit</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${canteen.order_limit_enabled ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {canteen.order_limit_enabled ? 'Auto-Pause Active' : 'Unlimited'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {canteen.order_limit_enabled
                                            ? `Orders automatically pause when you have ${canteen.order_limit} active orders, and resume once orders are completed.`
                                            : 'Auto-pause is turned off. Orders arrive continuously regardless of queue size.'}
                                    </p>
                                </div>
                                <Switch
                                    checked={canteen.order_limit_enabled}
                                    onCheckedChange={handleToggleOrderLimit}
                                />
                            </div>

                            {canteen.order_limit_enabled && (
                                <div className="p-4 bg-white rounded-xl border border-mcd-border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-sm text-foreground">Maximum Active Orders</p>
                                            <p className="text-xs text-muted-foreground">Number of concurrent orders you can handle</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateOrderLimit(Math.max(1, (canteen.order_limit || 10) - 1))}
                                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center transition-colors"
                                            >
                                                -
                                            </button>
                                            <span className="w-12 text-center font-bold text-base text-foreground">
                                                {canteen.order_limit || 10}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateOrderLimit((canteen.order_limit || 10) + 1)}
                                                className="w-8 h-8 rounded-lg bg-mcd-yellow hover:bg-yellow-400 font-bold flex items-center justify-center transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Presets */}
                                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                                        {[5, 10, 15, 20, 30].map(val => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => handleUpdateOrderLimit(val)}
                                                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                                    canteen.order_limit === val
                                                        ? 'bg-amber-500 text-white border-amber-600 font-bold'
                                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                {val} orders
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    </>
                )}

                {/* Telegram Card */}
                <Card className="border-mcd-border shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-blue-500" />
                            Telegram Notifications
                        </CardTitle>
                        <CardDescription>
                            Get free, instant Telegram alerts for every new order. No SMS credits needed!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Connection Status */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border">
                            {isTelegramLinked ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-700">Telegram Connected</p>
                                        <p className="text-xs text-muted-foreground">You will receive order alerts on Telegram.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-600">Not Connected</p>
                                        <p className="text-xs text-muted-foreground">Link your Telegram to get free order notifications.</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {isTelegramLinked ? (
                            <Button
                                variant="outline"
                                onClick={unlinkTelegram}
                                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                            >
                                Unlink Telegram
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                {/* Step-by-step instructions */}
                                <div className="space-y-2 text-sm">
                                    <p className="font-semibold text-mcd-text">How to link:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-mcd-text/70">
                                        <li>Click "Generate Link Code" below</li>
                                        <li>Open <a href="https://t.me/PREORDER1_bot" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-medium">@PREORDER1_bot</a> on Telegram</li>
                                        <li>Send the 6-digit code to the bot</li>
                                        <li>Done! You'll get instant alerts 🎉</li>
                                    </ol>
                                </div>

                                {linkCode ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                            <span className="text-3xl font-mono font-bold tracking-[0.3em] text-blue-700">{linkCode}</span>
                                            <Button variant="ghost" size="icon" onClick={copyCode} className="text-blue-500 hover:text-blue-700">
                                                <Copy className="h-5 w-5" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-center text-muted-foreground">Expires in 10 minutes</p>
                                        <Button
                                            asChild
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold h-11"
                                        >
                                            <a href="https://t.me/PREORDER1_bot" target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Open @PREORDER1_bot on Telegram
                                            </a>
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={generateLinkCode}
                                        disabled={isGeneratingCode}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold h-11"
                                    >
                                        {isGeneratingCode ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Generate Link Code
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
