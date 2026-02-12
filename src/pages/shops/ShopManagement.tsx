import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LocationDetector } from '@/components/shops/LocationDetector';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ShopMenuManagement } from '@/components/shops/ShopMenuManagement';
import { ShopOrdersManagement } from '@/components/shops/ShopOrdersManagement';
import { Logo } from '@/components/Logo';
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  Settings, 
  Save, 
  Loader2, 
  Edit2, 
  Phone,
  Upload,
  X,
  ShoppingBag,
  AlertCircle,
  UtensilsCrossed,
  XCircle,
  LogOut
} from 'lucide-react';

interface Shop {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  is_open: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export default function ShopManagement() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch shop data
  useEffect(() => {
    async function fetchShop() {
      if (!user) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shop:', error);
        toast({
          title: 'Error',
          description: 'Failed to load shop data',
          variant: 'destructive',
        });
      } else if (data) {
        setShop(data as Shop);
        // Initialize form state
        setShopName(data.shop_name);
        setOwnerName(data.owner_name);
        setPhone(data.phone);
        setAddress(data.address);
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        setImagePreview(data.image_url);
      }
      setLoading(false);
    }

    fetchShop();
  }, [user, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(shop?.image_url || null);
  };

  const toggleOpenStatus = async () => {
    if (!shop) return;

    const newStatus = !shop.is_open;
    
    const { error } = await supabase
      .from('shops')
      .update({ is_open: newStatus })
      .eq('id', shop.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update shop status',
        variant: 'destructive',
      });
    } else {
      setShop({ ...shop, is_open: newStatus });
      toast({
        title: newStatus ? 'Shop Opened' : 'Shop Closed',
        description: newStatus 
          ? 'Your shop is now visible to customers' 
          : 'Your shop is now closed for orders',
      });
    }
  };

  const handleSave = async () => {
    if (!shop || !user) return;

    if (!shopName || !ownerName || !phone || !address || latitude === null || longitude === null) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      let imageUrl = shop.image_url;

      // Upload new image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `shop-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      // Update shop data
      const { error } = await supabase
        .from('shops')
        .update({
          shop_name: shopName,
          owner_name: ownerName,
          phone: phone,
          address: address,
          latitude: latitude,
          longitude: longitude,
          image_url: imageUrl,
        })
        .eq('id', shop.id);

      if (error) {
        throw error;
      }

      setShop({
        ...shop,
        shop_name: shopName,
        owner_name: ownerName,
        phone: phone,
        address: address,
        latitude: latitude,
        longitude: longitude,
        image_url: imageUrl,
      });

      setIsEditing(false);
      setImageFile(null);

      toast({
        title: 'Shop updated',
        description: 'Your shop details have been saved',
      });
    } catch (error: any) {
      console.error('Error updating shop:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update shop details',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (shop) {
      setShopName(shop.shop_name);
      setOwnerName(shop.owner_name);
      setPhone(shop.phone);
      setAddress(shop.address);
      setLatitude(shop.latitude);
      setLongitude(shop.longitude);
      setImagePreview(shop.image_url);
      setImageFile(null);
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-lg">Shop Management</h1>
          </div>
        </div>
        <div className="container max-w-4xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Store className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">No Shop Found</h2>
            <p className="text-muted-foreground text-center max-w-sm">
              You haven't registered a shop yet. Register your shop to start receiving orders from nearby customers.
            </p>
            <Button onClick={() => navigate('/shops/register')}>
              Register Your Shop
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Approval Status Banner */}
      {shop.approval_status === 'pending' && (
        <div className="bg-amber-500 text-white px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">Your shop registration is under review. It will be visible to customers after admin approval.</p>
          </div>
        </div>
      )}
      {shop.approval_status === 'rejected' && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <XCircle className="h-5 w-5" />
            <p className="font-medium">Your shop registration was rejected. Please contact support for more information.</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/shops')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-lg">{shop.shop_name}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant={shop.is_open ? 'default' : 'secondary'} className={shop.is_open ? 'bg-green-500' : ''}>
                    {shop.is_open ? 'Open' : 'Closed'}
                  </Badge>
                  {shop.approval_status === 'pending' && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      Pending Approval
                    </Badge>
                  )}
                  {shop.approval_status === 'rejected' && (
                    <Badge variant="destructive">
                      Rejected
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch 
                checked={shop.is_open} 
                onCheckedChange={toggleOpenStatus}
              />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {shop.is_open ? 'Open' : 'Closed'}
              </span>
              <Button variant="outline" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Shop</span> Details
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* Shop Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Shop Information</CardTitle>
                    <CardDescription>
                      Manage your shop details and location
                    </CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shop Image */}
                <div className="space-y-2">
                  <Label>Shop Image</Label>
                  {isEditing ? (
                    imagePreview ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                        <img
                          src={imagePreview}
                          alt="Shop preview"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={removeImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload shop image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    )
                  ) : (
                    imagePreview ? (
                      <div className="w-full h-48 rounded-lg overflow-hidden border">
                        <img
                          src={imagePreview}
                          alt={shop.shop_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-32 rounded-lg border bg-muted flex items-center justify-center">
                        <Store className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )
                  )}
                </div>

                {/* Shop Name */}
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop Name</Label>
                  {isEditing ? (
                    <Input
                      id="shopName"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Shop name"
                    />
                  ) : (
                    <p className="text-foreground py-2">{shop.shop_name}</p>
                  )}
                </div>

                {/* Owner Name */}
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name</Label>
                  {isEditing ? (
                    <Input
                      id="ownerName"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Owner name"
                    />
                  ) : (
                    <p className="text-foreground py-2">{shop.owner_name}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  ) : (
                    <div className="flex items-center gap-2 py-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">{shop.phone}</p>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  {isEditing ? (
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Shop address"
                    />
                  ) : (
                    <div className="flex items-start gap-2 py-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-foreground">{shop.address}</p>
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label>Location Coordinates</Label>
                  {isEditing ? (
                    <LocationDetector
                      latitude={latitude}
                      longitude={longitude}
                      onLocationChange={(lat, lng) => {
                        setLatitude(lat);
                        setLongitude(lng);
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground py-2">
                      📍 {shop.latitude.toFixed(6)}, {shop.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Menu Tab */}
          <TabsContent value="menu">
            <ShopMenuManagement shopId={shop.id} />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <ShopOrdersManagement shopId={shop.id} shopName={shop.shop_name} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
