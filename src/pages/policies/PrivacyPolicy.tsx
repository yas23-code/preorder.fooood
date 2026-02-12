import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Share2, Lock, UserCheck, Cookie, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: Eye,
    title: "Information We Collect",
    content: "We collect information you provide directly to us, including your name, email address, phone number, and payment information when you create an account or place an order. We also collect information about your orders, preferences, and interactions with our platform."
  },
  {
    icon: UserCheck,
    title: "How We Use Your Information",
    items: [
      "To process and fulfill your orders",
      "To send you order confirmations and updates",
      "To provide customer support",
      "To improve our services and user experience",
      "To send promotional communications (with your consent)"
    ]
  },
  {
    icon: Share2,
    title: "Information Sharing",
    content: "We share your information with canteen vendors only to fulfill your orders. We do not sell your personal information to third parties. We may share data with service providers who assist us in operating our platform."
  },
  {
    icon: Lock,
    title: "Data Security",
    content: "We implement appropriate security measures to protect your personal information. All payment transactions are processed through secure, encrypted payment gateways. However, no method of transmission over the internet is 100% secure."
  },
  {
    icon: UserCheck,
    title: "Your Rights",
    content: "You have the right to access, update, or delete your personal information. You can manage your account settings or contact us for assistance. You may also opt out of promotional communications at any time."
  },
  {
    icon: Cookie,
    title: "Cookies",
    content: "We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can manage cookie preferences through your browser settings."
  },
  {
    icon: HelpCircle,
    title: "Contact Us",
    content: "If you have any questions about this Privacy Policy, please contact us through our support page or email us at support@preorder.food."
  }
];

export default function PrivacyPolicy() {
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
        <div className="relative overflow-hidden bg-gradient-to-br from-mcd-red to-mcd-red/90 rounded-3xl p-6 md:p-10 mb-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-2">
              Privacy Policy
            </h1>
            <p className="text-white/80 text-sm md:text-base">
              Last updated: January 2026 • Your privacy matters to us
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
