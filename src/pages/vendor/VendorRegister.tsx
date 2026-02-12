import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Store, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorRegister() {
  const [canteenName, setCanteenName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingCanteen, setCheckingCanteen] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Check if vendor already has a canteen on mount
  useEffect(() => {
    const checkExistingCanteen = async () => {
      if (!user) {
        setCheckingCanteen(false);
        return;
      }

      const { data: existing } = await supabase
        .from('canteens')
        .select('id')
        .eq('vendor_id', user.id)
        .maybeSingle();

      if (existing) {
        navigate('/vendor/dashboard', { replace: true });
      } else {
        setCheckingCanteen(false);
      }
    };

    if (user && profile) {
      checkExistingCanteen();
    }
  }, [user, profile, navigate]);

  // Redirect if not a vendor (only check after profile is loaded)
  if (profile && profile.role !== 'vendor') {
    return <Navigate to="/student/dashboard" replace />;
  }

  // Show loading while checking for existing canteen
  if (checkingCanteen || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canteenName || !location) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!user) {
      toast.error('Please log in first');
      return;
    }

    setIsLoading(true);
    
    try {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `canteen-${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(fileName, imageFile);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      // Create the canteen with pending approval status
      const { error } = await supabase
        .from('canteens')
        .insert({
          vendor_id: user.id,
          name: canteenName,
          location,
          image_url: imageUrl,
          approval_status: 'pending',
        });
      
      if (error) throw error;
      
      toast.success('Canteen registration submitted! Your canteen will be live after admin approval.');
      navigate('/vendor/dashboard');
    } catch (error) {
      console.error('Error registering canteen:', error);
      toast.error('Failed to register canteen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="card-warm p-8">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Register Your Canteen
            </h1>
            <p className="text-muted-foreground">
              Set up your canteen profile to start receiving orders
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="canteen-name">Canteen Name</Label>
              <Input
                id="canteen-name"
                value={canteenName}
                onChange={(e) => setCanteenName(e.target.value)}
                placeholder="e.g., Campus Central Kitchen"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Main Building, Ground Floor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Canteen Image (Optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-colors"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                </button>
              )}
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Registration'
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
