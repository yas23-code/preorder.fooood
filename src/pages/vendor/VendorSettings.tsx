import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Save, Loader2, Send, CheckCircle, XCircle, Copy, ExternalLink } from 'lucide-react';
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
