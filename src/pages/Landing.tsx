import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";
import { SwipeableNotification } from "@/components/SwipeableNotification";
import { useReadyOrderNotifications } from "@/hooks/useReadyOrderNotifications";
import { useAuth } from "@/context/AuthContext";
import { UtensilsCrossed, Clock, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { RecommendedItems } from "@/components/student/RecommendedItems";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


export default function Landing() {
  const { user } = useAuth();
  const { visibleReadyOrders, notificationsEnabled, dismissNotification } = useReadyOrderNotifications(user?.id);

  return (
    <div className="min-h-screen relative">
      {/* Ready Orders Banner */}
      {user && notificationsEnabled && visibleReadyOrders.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 text-white overflow-hidden">
          <div className="max-w-7xl mx-auto">
            {visibleReadyOrders.map((order) => (
              <SwipeableNotification
                key={order.id}
                orderId={order.id}
                pickupCode={order.pickup_code}
                canteenName={order.canteen_name}
                onDismiss={dismissNotification}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full-screen Background Video */}
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover z-0">
        <source src="/videos/background-video.mp4" type="video/mp4" />
      </video>

      {/* Light overlay for slight contrast */}
      <div className="fixed inset-0  z-0" />

      {/* Content */}
      <div className="relative z-10">
        <Header variant="landing" />

        {/* Hero Section */}
        <section className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="container mx-auto px-4 py-10 md:py-16">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white backdrop-blur-md px-3 py-1.5 rounded-full mb-4 animate-fade-up border border-white/20">
                <Sparkles className="h-4 w-4 text-mcd-red" />
                <span className="text-sm font-medium text-black">Campus food, simplified</span>
              </div>

              <h1
                className="text-3xl md:text-5xl lg:text-6xl font-bold font-display mb-4 animate-fade-up"
                style={{ animationDelay: "100ms" }}
              >
                <span className="text-black">Skip the Queue,</span>
                <br />
                <span className="text-mcd-yellow">Grab Your Food</span>
              </h1>

              {/* Hero Video */}
              <div className="w-full max-w-lg mx-auto mb-4 px-4 animate-scale-in" style={{ animationDelay: "150ms" }}>
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full aspect-video rounded-2xl border-4 border-white/20 shadow-2xl ring-1 ring-white/10 object-cover"
                >
                  <source src="/videos/hero-video.mp4" type="video/mp4" />
                </video>
              </div>

              <p
                className="text-base md:text-lg text-black font-bold mb-8 max-w-xl mx-auto animate-fade-up"
                style={{ animationDelay: "200ms" }}
              >
                Order from your favorite campus canteens, pay ahead, and pick up when ready.
              </p>

              <div
                className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up"
                style={{ animationDelay: "300ms" }}
              >
                <Button asChild variant="gradient" size="lg">
                  <Link to="/auth">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Recommended Items */}
              {user && (
                <div className="mt-8 animate-fade-up" style={{ animationDelay: "400ms" }}>
                  <RecommendedItems userId={user.id} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10  backdrop-blur-sm">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-3">Ready to skip the line?</h2>
            <p className="text-white/70 text-base mb-5 max-w-xl mx-auto">
              Join thousands of students enjoying faster campus dining.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button asChild variant="gradient" size="lg">
                <Link to="/auth">
                  Start Ordering Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              
              {/* Customer Support Button */}
              <a
                href="https://wa.me/917065909150?text=Hello%20Preorder%20Support,%20I%20need%20help"
                onClick={(e) => {
                  e.preventDefault();
                  const targetWindow = window.top || window;
                  targetWindow.open("https://wa.me/917065909150?text=Hello%20Preorder%20Support,%20I%20need%20help", '_blank', 'noopener,noreferrer');
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 bg-gradient-to-r from-mcd-red to-mcd-yellow text-white text-sm font-semibold"
              >
                <svg 
                  viewBox="0 0 24 24" 
                  width="18" 
                  height="18"
                  fill="currentColor"
                  className="shrink-0"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Customer Support</span>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 bg-mcd-cream">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-2">Frequently Asked Questions</h2>
              <p className="text-muted-foreground text-base max-w-xl mx-auto">Got questions? We've got answers.</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="space-y-3">
                <AccordionItem value="item-1" className="bg-white rounded-xl border-2 border-mcd-yellow/30 px-4 shadow-sm">
                  <AccordionTrigger className="text-foreground hover:no-underline text-left font-medium py-4 hover:text-mcd-red">
                    How do I place an order?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Simply sign in, browse the available canteens, select your items, add them to cart, and complete your payment. You'll receive a unique pickup code once your order is confirmed.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="bg-white rounded-xl border-2 border-mcd-yellow/30 px-4 shadow-sm">
                  <AccordionTrigger className="text-foreground hover:no-underline text-left font-medium py-4 hover:text-mcd-red">
                    What payment methods are accepted?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    We accept all major payment methods including UPI, credit/debit cards, and net banking through our secure payment gateway.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="bg-white rounded-xl border-2 border-mcd-yellow/30 px-4 shadow-sm">
                  <AccordionTrigger className="text-foreground hover:no-underline text-left font-medium py-4 hover:text-mcd-red">
                    How do I know when my order is ready?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    You will receive a notification on your Gmail ID, and you will also receive an update directly inside the web app. You can check the real-time status of your order anytime by going to the Order History section in the app, where it will show whether your order is Pending, Preparing, or Ready for Pickup. Just show your pickup code at the counter!
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="bg-white rounded-xl border-2 border-mcd-yellow/30 px-4 shadow-sm">
                  <AccordionTrigger className="text-foreground hover:no-underline text-left font-medium py-4 hover:text-mcd-red">
                    Can I cancel or modify my order?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    Once an order is placed and payment is confirmed, it cannot be cancelled or modified. Please review your order carefully before completing the payment.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="bg-white rounded-xl border-2 border-mcd-yellow/30 px-4 shadow-sm">
                  <AccordionTrigger className="text-foreground hover:no-underline text-left font-medium py-4 hover:text-mcd-red">
                    What if I face any issues with my order?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    For any issues or concerns, please contact our customer support through WhatsApp. We're here to help you with any problems you may encounter.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
