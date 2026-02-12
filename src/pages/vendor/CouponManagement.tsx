import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Tag, Percent, IndianRupee } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  created_at: string;
  canteen_id: string | null;
  minimum_amount: number;
}

interface Canteen {
  id: string;
  name: string;
}

const CouponManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<string>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCanteenId, setSelectedCanteenId] = useState<string>("");
  const [minimumAmount, setMinimumAmount] = useState("");

  useEffect(() => {
    fetchCanteens();
    fetchCoupons();
  }, [user]);

  const fetchCanteens = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("canteens")
        .select("id, name")
        .eq("vendor_id", user.id);
      if (error) throw error;
      setCanteens(data || []);
      if (data && data.length > 0 && !selectedCanteenId) {
        setSelectedCanteenId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching canteens:", error);
    }
  };

  const fetchCoupons = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast({
        title: "Error",
        description: "Failed to load coupons",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setIsActive(true);
    setEditingCoupon(null);
    setMinimumAmount("");
    if (canteens.length > 0) {
      setSelectedCanteenId(canteens[0].id);
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value.toString());
    setIsActive(coupon.is_active);
    setSelectedCanteenId(coupon.canteen_id || "");
    setMinimumAmount(coupon.minimum_amount > 0 ? coupon.minimum_amount.toString() : "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedCode = code.trim().toUpperCase();
    const value = parseFloat(discountValue);

    if (!trimmedCode) {
      toast({ title: "Error", description: "Coupon code is required", variant: "destructive" });
      return;
    }

    if (!selectedCanteenId) {
      toast({ title: "Error", description: "Please select a canteen", variant: "destructive" });
      return;
    }

    if (isNaN(value) || value <= 0) {
      toast({ title: "Error", description: "Enter a valid discount value", variant: "destructive" });
      return;
    }

    if (discountType === "percentage" && value > 100) {
      toast({ title: "Error", description: "Percentage cannot exceed 100%", variant: "destructive" });
      return;
    }

    const minAmount = parseFloat(minimumAmount) || 0;
    setIsSaving(true);

    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update({
            code: trimmedCode,
            discount_type: discountType,
            discount_value: value,
            is_active: isActive,
            canteen_id: selectedCanteenId,
            minimum_amount: minAmount,
          })
          .eq("id", editingCoupon.id);

        if (error) throw error;
        toast({ title: "Success", description: "Coupon updated successfully" });
      } else {
        const { error } = await supabase.from("coupons").insert({
          code: trimmedCode,
          discount_type: discountType,
          discount_value: value,
          is_active: isActive,
          canteen_id: selectedCanteenId,
          minimum_amount: minAmount,
        });

        if (error) {
          if (error.code === "23505") {
            toast({ title: "Error", description: "Coupon code already exists", variant: "destructive" });
            return;
          }
          throw error;
        }
        toast({ title: "Success", description: "Coupon created successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast({ title: "Error", description: "Failed to save coupon", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;

      setCoupons(coupons.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)));
      toast({
        title: coupon.is_active ? "Coupon Deactivated" : "Coupon Activated",
        description: `${coupon.code} is now ${coupon.is_active ? "inactive" : "active"}`,
      });
    } catch (error) {
      console.error("Error toggling coupon:", error);
      toast({ title: "Error", description: "Failed to update coupon", variant: "destructive" });
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;

    try {
      const { error } = await supabase.from("coupons").delete().eq("id", coupon.id);
      if (error) throw error;

      setCoupons(coupons.filter((c) => c.id !== coupon.id));
      toast({ title: "Deleted", description: "Coupon deleted successfully" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast({ title: "Error", description: "Failed to delete coupon", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/vendor/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Coupon Management</h1>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Coupon</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g., SAVE20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canteen">Canteen</Label>
                  <Select value={selectedCanteenId} onValueChange={setSelectedCanteenId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a canteen" />
                    </SelectTrigger>
                    <SelectContent>
                      {canteens.map((canteen) => (
                        <SelectItem key={canteen.id} value={canteen.id}>
                          {canteen.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    Discount Value {discountType === "percentage" ? "(%)" : "(₹)"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="discountValue"
                      type="number"
                      placeholder={discountType === "percentage" ? "10" : "50"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="pl-8"
                      min="0"
                      step="0.01"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {discountType === "percentage" ? (
                        <Percent className="h-4 w-4" />
                      ) : (
                        <IndianRupee className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumAmount">Minimum Order Amount (₹)</Label>
                  <div className="relative">
                    <Input
                      id="minimumAmount"
                      type="number"
                      placeholder="0 (no minimum)"
                      value={minimumAmount}
                      onChange={(e) => setMinimumAmount(e.target.value)}
                      className="pl-8"
                      min="0"
                      step="1"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <IndianRupee className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Leave empty or 0 for no minimum</p>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingCoupon ? "Update Coupon" : "Create Coupon"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {coupons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Coupons Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first coupon to offer discounts to customers.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Coupons ({coupons.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Canteen</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Min. Order</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => {
                      const canteenName = canteens.find(c => c.id === coupon.canteen_id)?.name || "—";
                      return (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{canteenName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {coupon.discount_type === "percentage" ? (
                              <>
                                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                                {coupon.discount_value}%
                              </>
                            ) : (
                              <>
                                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                                {coupon.discount_value}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {coupon.minimum_amount > 0 ? `₹${coupon.minimum_amount}` : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={() => handleToggleActive(coupon)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(coupon)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(coupon)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );})}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CouponManagement;
