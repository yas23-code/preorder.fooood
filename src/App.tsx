import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ShopCartProvider } from "./context/ShopCartContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { AppWrapper } from "./components/AppWrapper";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import CanteenMenu from "./pages/student/CanteenMenu";
import CategoryItems from "./pages/student/CategoryItems";
import Cart from "./pages/student/Cart";
import Carts from "./pages/student/Carts";
import StudentOrders from "./pages/student/StudentOrders";
import PaymentResult from "./pages/student/PaymentResult";

// Vendor Pages
import VendorDashboard from "./pages/vendor/VendorDashboard";
import MenuManagement from "./pages/vendor/MenuManagement";
import VendorRegister from "./pages/vendor/VendorRegister";
import CouponManagement from "./pages/vendor/CouponManagement";

// Admin Pages
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";

// Policy Pages
// Policy Pages
import PrivacyPolicy from "./pages/policies/PrivacyPolicy";
import TermsConditions from "./pages/policies/TermsConditions";
import RefundPolicy from "./pages/policies/RefundPolicy";
import ContactSupport from "./pages/policies/ContactSupport";

// Shop Pages
import NearbyShops from "./pages/shops/NearbyShops";
import ShopDetail from "./pages/shops/ShopDetail";
import ShopRegistration from "./pages/shops/ShopRegistration";
import ShopManagement from "./pages/shops/ShopManagement";
import ShopCart from "./pages/shops/ShopCart";
import ShopOrders from "./pages/shops/ShopOrders";
import ShopPaymentResult from "./pages/shops/ShopPaymentResult";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <AppWrapper>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <ShopCartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Policy Routes */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              
              {/* Shop Routes */}
              <Route path="/shops" element={<NearbyShops />} />
              <Route path="/shop/:shopId" element={<ShopDetail />} />
              <Route path="/shop/:shopId/cart" element={<ShopCart />} />
              <Route path="/shops/orders" element={<ShopOrders />} />
              <Route path="/shops/payment-result" element={<ShopPaymentResult />} />
              <Route path="/shops/register" element={
                <ProtectedRoute>
                  <ShopRegistration />
                </ProtectedRoute>
              } />
              <Route path="/shops/manage" element={
                <ProtectedRoute>
                  <ShopManagement />
                </ProtectedRoute>
              } />
              <Route path="/contact-support" element={<ContactSupport />} />
              
              {/* Student Routes */}
              <Route 
                path="/student/dashboard" 
                element={
                  <ProtectedRoute allowedRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student/canteen/:canteenId" 
                element={
                  <ProtectedRoute allowedRole="student">
                    <CanteenMenu />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student/canteen/:canteenId/category/:categoryName" 
                element={
                  <ProtectedRoute allowedRole="student">
                    <CategoryItems />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student/carts" 
                element={
                  <ProtectedRoute allowedRole="student">
                    <Carts />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student/cart" 
                element={
                  <ProtectedRoute allowedRole="student">
                    <Cart />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student/cart/:canteenId" 
                element={
                  <ProtectedRoute allowedRole="student">
                    <Cart />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student/orders" 
                element={
                  <ProtectedRoute allowedRole="student">
                    <StudentOrders />
                  </ProtectedRoute>
                } 
              />
              {/* Payment result is NOT protected to ensure redirect works after payment */}
              <Route 
                path="/student/payment-result" 
                element={<PaymentResult />} 
              />
              
              {/* Vendor Routes */}
              <Route 
                path="/vendor/dashboard" 
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <VendorDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/vendor/menu" 
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <MenuManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/vendor/register" 
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <VendorRegister />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/vendor/coupons" 
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <CouponManagement />
                  </ProtectedRoute>
                } 
              />
              
              {/* Super Admin Routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <SuperAdminRoute>
                    <SuperAdminDashboard />
                  </SuperAdminRoute>
                } 
              />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </ShopCartProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
  </AppWrapper>
);

export default App;
