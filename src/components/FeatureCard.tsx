import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <div 
      className="card-warm p-6 hover:scale-105 transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-14 w-14 bg-gradient-hero rounded-xl flex items-center justify-center mb-4 group-hover:bg-gradient-warm transition-all duration-300">
        <Icon className="h-7 w-7 text-accent group-hover:text-accent-foreground transition-colors" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
