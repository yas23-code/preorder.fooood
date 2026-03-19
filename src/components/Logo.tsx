import { Link } from "react-router-dom";
import preorderLogo from "@/assets/preorder-logo.jpg";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg";
  showExtension?: boolean;
}

export function Logo({ size = "md", showExtension = true }: LogoProps) {
  const sizeClasses = {
    xs: "h-10",
    sm: "h-11",
    md: "h-14",
    lg: "h-20",
  };

  const textClasses = {
    xs: "text-lg",
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-5xl",
  };

  return (
    <Link to="/" className="flex items-center gap-2 group">
      <img
        src={preorderLogo}
        alt="preorder.food"
        className={`${sizeClasses[size]} ${sizeClasses[size].replace("h-", "w-")} rounded-full object-cover group-hover:scale-105 transition-transform`}
      />
      <span className={`${textClasses[size]} font-bold font-display`}>
        <span className="text-foreground">pre</span>
        <span className="text-mcd-yellow">order</span>
        {showExtension && <span className="text-gradient">.food</span>}
      </span>
    </Link>
  );
}
