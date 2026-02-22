import { Link } from "react-router-dom";
import preorderLogo from "@/assets/preorder-logo.jpg";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-9",
    md: "h-11",
    lg: "h-15",
  };

  const textClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <Link to="/" className="flex items-center gap-2 group">
      <img
        src={preorderLogo}
        alt="Preorder"
        className={`${sizeClasses[size]} ${sizeClasses[size].replace("h-", "w-")} rounded-full object-cover group-hover:scale-105 transition-transform`}
      />
      <span className={`${textClasses[size]} font-bold font-display`}>
        <span className="text-foreground">Pre</span>
        <span className="text-gradient">order</span>
      </span>
    </Link>
  );
}
