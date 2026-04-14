import { Crown, Sparkles, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface MembershipReminderProps {
  onClose: () => void;
}

export function MembershipReminder({ onClose }: MembershipReminderProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl border border-amber-100 p-1">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-50 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 bg-orange-50 rounded-full blur-xl" />
        
        <div className="relative flex items-center gap-4 p-4 md:p-5">
            {/* Icon Group */}
            <div className="flex-shrink-0 relative">
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl shadow-lg ring-4 ring-amber-50">
                    <Crown className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1">
                    <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <Sparkles className="relative inline-flex h-3 w-3 text-amber-500" />
                    </span>
                </div>
            </div>

            {/* Content Text */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-base font-black text-foreground flex items-center gap-1.5">
                    Enjoying Preorder? 🎓
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground font-medium leading-relaxed">
                    Save <span className="text-amber-600 font-bold">₹7-₹15</span> on every order with <span className="font-bold underline decoration-amber-300">Free Packing</span>
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
                <Button 
                    asChild 
                    size="sm"
                    variant="gradient" 
                    className="h-9 md:h-10 px-4 md:px-6 rounded-xl font-bold text-xs md:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                >
                    <Link to="/student/membership">
                        Join Now
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="h-8 w-8 text-muted-foreground hover:bg-mcd-selected rounded-full"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
