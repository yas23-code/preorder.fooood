import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Save, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function VendorSettings() {
    const { profile, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(profile?.name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (profile) {
            setName(profile.name);
            setPhone(profile.phone || '');
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

            <main className="container mx-auto px-4 py-8 max-w-2xl">
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
                                        required
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
            </main>
        </div>
    );
}
