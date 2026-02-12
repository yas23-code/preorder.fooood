import { Link } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle, UserPlus, CreditCard, MapPin, AlertTriangle, Copyright, Scale, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: CheckCircle,
    title: "Acceptance of Terms",
    content: "By accessing or using preorder.food, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services."
  },
  {
    icon: UserPlus,
    title: "Account Registration",
    content: "You must create an account to place orders. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate and complete information during registration."
  },
  {
    icon: CreditCard,
    title: "Ordering and Payment",
    items: [
      "All orders are subject to availability and vendor acceptance",
      "Prices are displayed in Indian Rupees (₹) and include applicable taxes",
      "Payment must be completed before order confirmation",
      "You will receive a unique pickup code upon successful payment"
    ]
  },
  {
    icon: MapPin,
    title: "Order Pickup",
    content: "Orders must be picked up within the designated time frame. You must present your pickup code at the canteen counter. Unclaimed orders after 30 minutes may be forfeited without refund."
  },
  {
    icon: AlertTriangle,
    title: "User Conduct",
    content: "You agree not to misuse the platform, including but not limited to: creating false orders, attempting to defraud vendors, sharing account credentials, or engaging in any activity that disrupts the service."
  },
  {
    icon: Copyright,
    title: "Intellectual Property",
    content: "All content, trademarks, and intellectual property on preorder.food are owned by us or our licensors. You may not copy, modify, or distribute any content without prior written permission."
  },
  {
    icon: Scale,
    title: "Limitation of Liability",
    content: "preorder.food is not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our liability is limited to the amount paid for the specific order in question."
  },
  {
    icon: RefreshCw,
    title: "Changes to Terms",
    content: "We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms."
  }
];

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-mcd-cream to-white">
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl">
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-4 text-foreground hover:text-mcd-red hover:bg-mcd-yellow/10 -ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-foreground to-foreground/90 rounded-3xl p-6 md:p-10 mb-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-2">
              Terms & Conditions
            </h1>
            <p className="text-white/80 text-sm md:text-base">
              Last updated: January 2026 • Please read carefully
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="group bg-white rounded-2xl border border-mcd-yellow/20 shadow-sm hover:shadow-md hover:border-mcd-yellow/40 transition-all duration-300 p-5 md:p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-mcd-yellow/20 to-mcd-yellow/5 flex items-center justify-center group-hover:from-mcd-yellow/30 group-hover:to-mcd-yellow/10 transition-colors">
                  <section.icon className="h-5 w-5 text-mcd-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <span className="text-mcd-red/60 text-sm font-medium">{String(index + 1).padStart(2, '0')}</span>
                    {section.title}
                  </h2>
                  {section.content && (
                    <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                      {section.content}
                    </p>
                  )}
                  {section.items && (
                    <ul className="space-y-2 mt-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground text-sm md:text-base">
                          <span className="w-1.5 h-1.5 rounded-full bg-mcd-yellow mt-2 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Questions? <Link to="/contact-support" className="text-mcd-red hover:underline font-medium">Contact our support team</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
