import { useState, useEffect } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Store, Loader2, MapPin, ArrowRight } from "lucide-react";

type UserRole = "student" | "vendor";

export default function Auth() {
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, user, profile, isLoading: authLoading, isSuperAdmin, isSuperAdminLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingVendorType, setIsCheckingVendorType] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<UserRole>("student");

  // Shop owner signup state
  const [shopOwnerName, setShopOwnerName] = useState("");
  const [shopOwnerEmail, setShopOwnerEmail] = useState("");
  const [shopOwnerPassword, setShopOwnerPassword] = useState("");

  // Handle vendor redirect - check if they have a shop or canteen
  useEffect(() => {
    const checkVendorType = async () => {
      if (!user || !profile || profile.role !== "vendor") return;
      
      setIsCheckingVendorType(true);
      
      try {
        // Check if user has a shop
        const { data: shop } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();
        
        if (shop) {
          navigate("/shops/manage", { replace: true });
          return;
        }
        
        // Check if user has a canteen
        const { data: canteen } = await supabase
          .from("canteens")
          .select("id")
          .eq("vendor_id", user.id)
          .maybeSingle();
        
        if (canteen) {
          navigate("/vendor/dashboard", { replace: true });
          return;
        }
        
        // No shop or canteen - redirect to vendor register (canteen)
        navigate("/vendor/register", { replace: true });
      } catch (error) {
        console.error("Error checking vendor type:", error);
        navigate("/vendor/register", { replace: true });
      } finally {
        setIsCheckingVendorType(false);
      }
    };
    
    checkVendorType();
  }, [user, profile, navigate]);

  // Redirect super admin to admin dashboard (wait for super admin check to complete)
  if (user && !isSuperAdminLoading && isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Redirect if already logged in (normal users) - wait for super admin check first
  if (user && profile && !isSuperAdminLoading && !isSuperAdmin) {
    if (profile.role === "student") {
      return <Navigate to="/student/dashboard" replace />;
    }
    // For vendors, the useEffect will handle the redirect after checking shop/canteen
  }

  // Also redirect if we have a user but profile is still loading (will redirect once profile loads)
  if (user && !profile && !authLoading) {
    // Profile should be loading, wait for it
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(loginEmail, loginPassword);
    setIsSubmitting(false);
    // If successful, auth state change will update user/profile and trigger redirect
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await signup(signupName, signupEmail, signupPassword, signupRole);
    setIsSubmitting(false);

    if (success) {
      // For vendors, redirect to register their canteen
      if (signupRole === "vendor") {
        navigate("/vendor/register");
      }
    }
  };

  const handleShopOwnerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await signup(shopOwnerName, shopOwnerEmail, shopOwnerPassword, "vendor");
    setIsSubmitting(false);

    if (success) {
      // Redirect directly to shop registration
      navigate("/shops/register");
    }
  };

  if (authLoading || isCheckingVendorType || (user && isSuperAdminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="card-warm p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">Welcome to Preorder</h1>
            <p className="text-muted-foreground">Your campus food companion</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="shop" className="text-xs sm:text-sm">
                <Store className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                Shop Owner
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>

                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    OR
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    setIsGoogleLoading(true);
                    await loginWithGoogle();
                  }}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Continue with Google
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-3">
                  <Label>I am a...</Label>
                  <RadioGroup
                    value={signupRole}
                    onValueChange={(value) => setSignupRole(value as UserRole)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="student" id="role-student" className="peer sr-only" />
                      <Label
                        htmlFor="role-student"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/10 hover:border-accent peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 cursor-pointer transition-all"
                      >
                        <GraduationCap className="mb-2 h-6 w-6 text-accent" />
                        <span className="text-sm font-medium">Student</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="vendor" id="role-vendor" className="peer sr-only" />
                      <Label
                        htmlFor="role-vendor"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/10 hover:border-accent peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 cursor-pointer transition-all"
                      >
                        <Store className="mb-2 h-6 w-6 text-accent" />
                        <span className="text-sm font-medium">Vendor</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="shop">
              <div className="space-y-4">
                {/* Shop Owner Benefits */}
                <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-foreground">Register Your Shop</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get discovered by nearby customers. Add your shop location and start receiving orders!
                  </p>
                </div>

                <form onSubmit={handleShopOwnerSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop-owner-name">Your Name</Label>
                    <Input
                      id="shop-owner-name"
                      type="text"
                      placeholder="Shop Owner Name"
                      value={shopOwnerName}
                      onChange={(e) => setShopOwnerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop-owner-email">Email</Label>
                    <Input
                      id="shop-owner-email"
                      type="email"
                      placeholder="your@email.com"
                      value={shopOwnerEmail}
                      onChange={(e) => setShopOwnerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop-owner-password">Password</Label>
                    <Input
                      id="shop-owner-password"
                      type="password"
                      placeholder="••••••••"
                      value={shopOwnerPassword}
                      onChange={(e) => setShopOwnerPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Register & Add Your Shop
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="text-accent hover:underline font-medium"
                  >
                    Login here
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
