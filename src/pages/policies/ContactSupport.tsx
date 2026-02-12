import { Link } from "react-router-dom";
import { ArrowLeft, Headphones, Mail, MessageCircle, Clock, CreditCard, Package, RefreshCw, User, Lightbulb, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const helpTopics = [
  { icon: CreditCard, text: "Payment issues or failed transactions" },
  { icon: Package, text: "Order not received or missing items" },
  { icon: RefreshCw, text: "Refund requests and status updates" },
  { icon: User, text: "Account login or registration problems" },
  { icon: Lightbulb, text: "Feedback or suggestions for improvement" },
  { icon: Building2, text: "Vendor partnership inquiries" }
];

export default function ContactSupport() {
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
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-6 md:p-10 mb-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Headphones className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-2">
              Contact & Support
            </h1>
            <p className="text-white/80 text-sm md:text-base">
              We're here to help you with any questions or issues
            </p>
          </div>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* WhatsApp Card */}
          <div className="group bg-white rounded-2xl border border-emerald-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <MessageCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">WhatsApp Support</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Get instant support through WhatsApp. Our team is available to assist you.
              </p>
              <a
                href="https://wa.me/917065909150?text=Hello%20Preorder%20Support,%20I%20need%20help"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Email Card */}
          <div className="group bg-white rounded-2xl border border-sky-200 shadow-sm hover:shadow-lg hover:border-sky-300 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center mb-4 group-hover:bg-sky-200 transition-colors">
                <Mail className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Email Support</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Send us an email for detailed queries. We typically respond within 24-48 hours.
              </p>
              <Button asChild variant="outline" className="w-full border-sky-300 text-sky-700 hover:bg-sky-50">
                <a href="mailto:preorderfood2026@gmail.com">
                  <Mail className="h-4 w-4 mr-2" />
                  preorderfood2026@gmail.com
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Support Hours */}
        <div className="bg-white rounded-2xl border border-mcd-yellow/20 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-mcd-yellow/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-mcd-red" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Support Hours</h3>
              <p className="text-muted-foreground text-sm">When we're available to help</p>
            </div>
          </div>
          <div className="bg-mcd-cream/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Monday – Friday</span>
              <span className="text-mcd-red font-semibold">9:00 AM – 6:00 PM IST</span>
            </div>
          </div>
        </div>

        {/* Help Topics */}
        <div className="bg-white rounded-2xl border border-mcd-yellow/20 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Common Issues We Can Help With</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {helpTopics.map((topic, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl bg-mcd-cream/30 hover:bg-mcd-cream/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-mcd-yellow/20 flex items-center justify-center flex-shrink-0">
                  <topic.icon className="h-4 w-4 text-mcd-red" />
                </div>
                <span className="text-muted-foreground text-sm">{topic.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Check our <Link to="/refund-policy" className="text-mcd-red hover:underline font-medium">Refund Policy</Link> for refund-related queries
          </p>
        </div>
      </div>
    </div>
  );
}
