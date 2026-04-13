import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { Building2, Mail, ShieldCheck, ArrowRight, ArrowLeft, Loader2, X } from 'lucide-react';

interface CollegeVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
}

export function CollegeVerificationModal({ isOpen, onClose, onVerified }: CollegeVerificationModalProps) {
    const { user, updateProfile } = useAuth();
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSendOtp = async () => {
        if (!email || !email.includes('@')) {
            toast.error("Please enter a valid college email ID");
            return;
        }

        setIsVerifying(true);
        try {
            const { data, error } = await supabase.functions.invoke('handle-college-verification', {
                body: {
                    action: 'send_otp',
                    email: email,
                    user_id: user?.id
                }
            });

            if (error || !data.success) {
                throw new Error(data?.error || "Failed to send OTP");
            }

            toast.success("OTP sent to your college email!");
            setStep('otp');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            toast.error("Please enter the 6-digit OTP");
            return;
        }

        setIsVerifying(true);
        try {
            const { data, error } = await supabase.functions.invoke('handle-college-verification', {
                body: {
                    action: 'verify_otp',
                    otp,
                    user_id: user?.id
                }
            });

            if (error || !data.success) {
                throw new Error(data?.error || "Invalid OTP");
            }

            toast.success("Account verified successfully!");
            if (updateProfile) {
                await updateProfile({ is_abes_verified: true });
            }
            onVerified();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="max-w-[90vw] w-[400px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-mcd-red to-red-700 p-6 text-white relative overflow-hidden">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
                    <div className="relative z-10">
                        {step === 'email' ? <Mail className="w-12 h-12 mb-4 text-mcd-yellow" /> : <ShieldCheck className="w-12 h-12 mb-4 text-mcd-yellow" />}

                        <AlertDialogTitle className="text-2xl font-black tracking-tight leading-tight">
                            {step === 'email' ? <>Link College <span className="text-mcd-yellow">Email</span></> : <>Check Your <span className="text-mcd-yellow">In-box</span></>}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-red-50 text-base mt-2 font-medium">
                            {step === 'email'
                                ? "Enter your college email ID (Outlook) to verify your student status and apply the discount."
                                : `We've sent a 6-digit verification code to ${email}. Please enter it below.`}
                        </AlertDialogDescription>
                    </div>
                </div>

                <div className="p-6 bg-white space-y-4">
                    {step === 'email' ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="email"
                                    placeholder="yourname.23bxxxx@abes.ac.in"
                                    className="pl-10 h-12 rounded-xl border-2 border-gray-100 focus:border-mcd-red transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isVerifying}
                                />
                            </div>
                            <Button
                                onClick={handleSendOtp}
                                className="w-full h-12 rounded-xl bg-mcd-red hover:bg-red-600 text-white font-bold shadow-lg disabled:opacity-50"
                                disabled={isVerifying || !email}
                            >
                                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                                    <>
                                        Send OTP
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 flex flex-col items-center">
                            <InputOTP
                                maxLength={6}
                                value={otp}
                                onChange={(value) => setOtp(value)}
                                disabled={isVerifying}
                            >
                                <InputOTPGroup className="gap-2">
                                    <InputOTPSlot index={0} className="w-10 h-12 border-2 rounded-lg text-lg font-bold" />
                                    <InputOTPSlot index={1} className="w-10 h-12 border-2 rounded-lg text-lg font-bold" />
                                    <InputOTPSlot index={2} className="w-10 h-12 border-2 rounded-lg text-lg font-bold" />
                                    <InputOTPSlot index={3} className="w-10 h-12 border-2 rounded-lg text-lg font-bold" />
                                    <InputOTPSlot index={4} className="w-10 h-12 border-2 rounded-lg text-lg font-bold" />
                                    <InputOTPSlot index={5} className="w-10 h-12 border-2 rounded-lg text-lg font-bold" />
                                </InputOTPGroup>
                            </InputOTP>

                            <div className="w-full flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep('email')}
                                    className="flex-1 h-12 rounded-xl font-bold"
                                    disabled={isVerifying}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleVerifyOtp}
                                    className="flex-[2] h-12 rounded-xl bg-mcd-red hover:bg-red-600 text-white font-bold shadow-lg disabled:opacity-50"
                                    disabled={isVerifying || otp.length !== 6}
                                >
                                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify & Apply"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
