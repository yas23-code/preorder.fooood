import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, XCircle, CheckCircle, Ban, MessageSquare, Clock, Divide, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: XCircle,
    title: "Order Cancellation",
    content: "Once an order is placed and payment is confirmed, it cannot be cancelled or modified. This is because food preparation begins immediately after order confirmation to ensure timely pickup.",
    highlight: true
  },
  {
    icon: CheckCircle,
    title: "Refund Eligibility",
    intro: "Refunds may be issued in the following circumstances:",
    items: [
      "Payment was processed but order was not confirmed due to technical issues",
      "Duplicate payment was charged for the same order",
      "Canteen was unable to fulfill the order (out of stock, closure, etc.)",
      "Order received was significantly different from what was ordered",
      "Food quality issues (spoiled, contaminated, etc.)"
    ]
  },
  {
    icon: Ban,
    title: "Non-Refundable Situations",
    items: [
      "Change of mind after placing the order",
      "Failure to pick up the order within the designated time",
      "Minor variations in food presentation or portion sizes",
      "Personal taste preferences",
      "Orders placed at the wrong canteen by mistake"
    ]
  },
  {
    icon: MessageSquare,
    title: "How to Request a Refund",
    content: "To request a refund, please contact our support team within 24 hours of the order placement with your order ID, pickup code, and a clear description of the issue. Supporting photos may be required for food quality complaints."
  },
  {
    icon: Clock,
    title: "Refund Processing Time",
    content: "Once approved, refunds will be processed within 5-7 business days. The refund will be credited to the original payment method used during the transaction. Processing times may vary depending on your bank."
  },
  {
    icon: Divide,
    title: "Partial Refunds",
    content: "In cases where only part of the order is affected (e.g., one item missing or incorrect), a partial refund may be issued for the affected item(s) only."
  },
  {
    icon: Phone,
    title: "Contact for Refunds",
    content: "For refund requests or queries, please visit our Contact/Support page or reach out via WhatsApp. Our team will respond within 24-48 hours."
  }
];

export default function RefundPolicy() {
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
        <div className="relative overflow-hidden bg-gradient-to-br from-mcd-yellow to-mcd-yellow/90 rounded-3xl p-6 md:p-10 mb-8 text-foreground shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/30 backdrop-blur-sm mb-4">
              <RefreshCw className="h-7 w-7 text-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-2">
              Refund & Cancellation
            </h1>
            <p className="text-foreground/70 text-sm md:text-base">
              Last updated: January 2026 • Fair and transparent policies
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div 
              key={index}
              className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 p-5 md:p-6 ${
                section.highlight 
                  ? 'border-mcd-red/30 bg-mcd-red/5 hover:border-mcd-red/50' 
                  : 'border-mcd-yellow/20 hover:border-mcd-yellow/40'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  section.highlight 
                    ? 'bg-gradient-to-br from-mcd-red/20 to-mcd-red/5 group-hover:from-mcd-red/30 group-hover:to-mcd-red/10' 
                    : 'bg-gradient-to-br from-mcd-yellow/20 to-mcd-yellow/5 group-hover:from-mcd-yellow/30 group-hover:to-mcd-yellow/10'
                }`}>
                  <section.icon className={`h-5 w-5 ${section.highlight ? 'text-mcd-red' : 'text-mcd-red'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <span className="text-mcd-red/60 text-sm font-medium">{String(index + 1).padStart(2, '0')}</span>
                    {section.title}
                  </h2>
                  {section.intro && (
                    <p className="text-muted-foreground leading-relaxed text-sm md:text-base mb-2">
                      {section.intro}
                    </p>
                  )}
                  {section.content && (
                    <p className={`leading-relaxed text-sm md:text-base ${section.highlight ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
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

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-r from-mcd-yellow/10 to-mcd-red/10 rounded-2xl p-6 text-center">
          <p className="text-foreground font-medium mb-3">Need help with a refund?</p>
          <Button asChild className="bg-mcd-red hover:bg-mcd-red/90">
            <Link to="/contact-support">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
