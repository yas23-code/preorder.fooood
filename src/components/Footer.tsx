import { Link } from "react-router-dom";
import { FileText, Shield, RefreshCw, Headphones } from "lucide-react";

export function Footer() {
  const policyLinks = [
    { to: "/privacy-policy", label: "Privacy Policy", icon: Shield },
    { to: "/terms-conditions", label: "Terms & Conditions", icon: FileText },
    { to: "/refund-policy", label: "Refund Policy", icon: RefreshCw },
    { to: "/contact-support", label: "Contact/Support", icon: Headphones },
  ];

  return (
    <footer className="bg-foreground text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold font-display mb-3 text-mcd-yellow">
              preorder.food
            </h3>
            <p className="text-white/70 text-sm max-w-md">
              Skip the queue, grab your food. The easiest way to order from your campus canteens.
            </p>
          </div>

          {/* Policy Links */}
          <div>
            <h4 className="text-lg font-semibold mb-3 text-mcd-yellow">Policies</h4>
            <ul className="space-y-2">
              {policyLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="flex items-center gap-2 text-white/70 hover:text-mcd-yellow transition-colors text-sm"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} preorder.food. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
