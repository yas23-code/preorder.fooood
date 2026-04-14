import { Crown, Sparkles, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface MembershipReminderProps {
  onClose: () => void;
}

export function MembershipReminder({ onClose }: MembershipReminderProps) {
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-amber-100 p-3 max-w-sm mx-auto">
        <div className="flex items-center gap-3">
            {/* Small icon */}
            <div className="flex-shrink-0 bg-amber-100 p-2 rounded-xl">
                <Crown className="h-5 w-5 text-amber-600" />
            </div>

            {/* Compact content */}
            <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-foreground leading-tight">
                    Enjoying Preorder? 🎓
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    Get <span className="text-amber-600 font-bold">Free Packing</span> now
                </p>
            </div>

            {/* Mini action */}
            <Button 
                asChild 
                size="sm"
                variant="gradient" 
                className="h-8 px-3 rounded-lg font-bold text-[10px] shadow-sm"
            >
                <Link to="/student/membership">Join</Link>
            </Button>
            
            <button 
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
      </div>
    </div>
  );
}
